package com.mwijay.music

import android.app.*
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.*
import android.support.v4.media.MediaMetadataCompat
import android.support.v4.media.session.MediaSessionCompat
import android.support.v4.media.session.PlaybackStateCompat
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.*
import java.net.URL
import java.net.HttpURLConnection

/**
 * MusicService.kt
 *
 * Android Foreground Service that keeps audio alive in the background
 * and displays the modern media notification with large artwork + controls.
 *
 * Receives track updates from MusicPlugin (Capacitor bridge) via Intents.
 * Sends button-press broadcasts back to MusicPlugin for JavaScript handling.
 *
 * Supports Android 8+ (API 26+). Tested for Android 15 (API 35).
 */
class MusicService : Service() {

    companion object {
        const val CHANNEL_ID = "mwijay_music_channel"
        const val NOTIFICATION_ID = 1

        // Actions sent FROM the service (notification buttons) → to the JS app
        const val ACTION_PLAY  = "com.mwijay.ACTION_PLAY"
        const val ACTION_PAUSE = "com.mwijay.ACTION_PAUSE"
        const val ACTION_NEXT  = "com.mwijay.ACTION_NEXT"
        const val ACTION_PREV  = "com.mwijay.ACTION_PREV"
        const val ACTION_LIKE  = "com.mwijay.ACTION_LIKE"
        const val ACTION_STOP  = "com.mwijay.ACTION_STOP"

        // Extras for track info (sent from JS → service)
        const val EXTRA_TITLE      = "title"
        const val EXTRA_ARTIST     = "artist"
        const val EXTRA_ALBUM      = "album"
        const val EXTRA_ARTWORK    = "artwork"
        const val EXTRA_IS_PLAYING = "isPlaying"
        const val EXTRA_IS_LIKED   = "isLiked"
        const val EXTRA_DURATION   = "duration"   // milliseconds
        const val EXTRA_POSITION   = "position"   // milliseconds
    }

    // ── State ──────────────────────────────────────────────────────────────
    private var mediaSession: MediaSessionCompat? = null
    private val serviceScope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    private var currentTitle   = ""
    private var currentArtist  = ""
    private var currentAlbum   = ""
    private var currentArtwork = ""
    private var isPlaying      = false
    private var isLiked        = false
    private var duration       = 0L
    private var position       = 0L
    private var currentBitmap: Bitmap? = null

    // ── Lifecycle ──────────────────────────────────────────────────────────

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        setupMediaSession()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        intent?.let { handleIntent(it) }
        return START_STICKY   // Restart service if killed by OS
    }

    override fun onDestroy() {
        serviceScope.cancel()
        mediaSession?.release()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    // ── Intent handling ────────────────────────────────────────────────────

    private fun handleIntent(intent: Intent) {
        when (intent.action) {
            // Notification button taps → broadcast to WebView (Capacitor)
            ACTION_PLAY, ACTION_PAUSE,
            ACTION_NEXT, ACTION_PREV,
            ACTION_LIKE, ACTION_STOP -> {
                val broadcast = Intent("com.mwijay.MEDIA_ACTION")
                broadcast.putExtra("action", intent.action)
                sendBroadcast(broadcast)

                // Optimistically update our own state for snappy notification response
                when (intent.action) {
                    ACTION_PLAY  -> { isPlaying = true;  rebuildNotification() }
                    ACTION_PAUSE -> { isPlaying = false; rebuildNotification() }
                    ACTION_LIKE  -> { isLiked = !isLiked; rebuildNotification() }
                    ACTION_STOP  -> { isPlaying = false; stopForeground(STOP_FOREGROUND_REMOVE); stopSelf() }
                }
            }

            // Track-info update from Capacitor plugin
            else -> {
                currentTitle   = intent.getStringExtra(EXTRA_TITLE)   ?: currentTitle
                currentArtist  = intent.getStringExtra(EXTRA_ARTIST)  ?: currentArtist
                currentAlbum   = intent.getStringExtra(EXTRA_ALBUM)   ?: currentAlbum
                duration       = intent.getLongExtra(EXTRA_DURATION, duration)
                position       = intent.getLongExtra(EXTRA_POSITION, position)
                isPlaying      = intent.getBooleanExtra(EXTRA_IS_PLAYING, isPlaying)
                isLiked        = intent.getBooleanExtra(EXTRA_IS_LIKED, isLiked)

                val newArtwork = intent.getStringExtra(EXTRA_ARTWORK) ?: ""
                val artworkChanged = newArtwork.isNotEmpty() && newArtwork != currentArtwork

                if (artworkChanged) {
                    currentArtwork = newArtwork
                    currentBitmap = null      // Will re-load
                }

                // Show notification immediately (artwork loads async)
                rebuildNotification()
                updateMediaSessionState()

                // Load artwork in background
                if (artworkChanged) loadArtworkAsync()
            }
        }
    }

    // ── MediaSession setup ─────────────────────────────────────────────────

    private fun setupMediaSession() {
        mediaSession = MediaSessionCompat(this, "MwijaySession").apply {
            isActive = true

            setCallback(object : MediaSessionCompat.Callback() {
                override fun onPlay()           = broadcastAction(ACTION_PLAY)
                override fun onPause()          = broadcastAction(ACTION_PAUSE)
                override fun onSkipToNext()     = broadcastAction(ACTION_NEXT)
                override fun onSkipToPrevious() = broadcastAction(ACTION_PREV)
                override fun onSeekTo(pos: Long) {
                    val b = Intent("com.mwijay.MEDIA_ACTION")
                    b.putExtra("action", "SEEK")
                    b.putExtra("position", pos)
                    sendBroadcast(b)
                }
            })

            setFlags(
                MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS or
                MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS
            )
        }
    }

    private fun broadcastAction(action: String) {
        sendBroadcast(Intent("com.mwijay.MEDIA_ACTION").putExtra("action", action))
    }

    // ── Notification channel ───────────────────────────────────────────────

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Mwijay Music Player",
            NotificationManager.IMPORTANCE_LOW  // LOW = silent updates
        ).apply {
            description          = "Music playback controls & now playing info"
            setShowBadge(false)
            lockscreenVisibility = Notification.VISIBILITY_PUBLIC
        }
        getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }

    // ── Notification building ──────────────────────────────────────────────

    private fun rebuildNotification() {
        val notification = buildNotification()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun buildNotification(): Notification {
        val openApp = PendingIntent.getActivity(
            this, 0,
            packageManager.getLaunchIntentForPackage(packageName),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        fun actionPi(action: String, code: Int) = PendingIntent.getService(
            this, code,
            Intent(this, MusicService::class.java).apply { this.action = action },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(currentTitle.ifEmpty { "Mwijay Music" })
            .setContentText(currentArtist)
            .setSubText(currentAlbum.ifEmpty { null })
            .setSmallIcon(R.drawable.ic_notification)
            .setLargeIcon(currentBitmap)
            .setContentIntent(openApp)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOnlyAlertOnce(true)
            .setOngoing(isPlaying)
            .setShowWhen(false)
            .setStyle(
                androidx.media.app.NotificationCompat.MediaStyle()
                    .setMediaSession(mediaSession?.sessionToken)
                    .setShowActionsInCompactView(0, 1, 2)  // prev | play/pause | next
            )
            // Action 0: Previous
            .addAction(NotificationCompat.Action(R.drawable.ic_prev,     "Previous", actionPi(ACTION_PREV,  1)))
            // Action 1: Play / Pause (toggled)
            .addAction(NotificationCompat.Action(
                if (isPlaying) R.drawable.ic_pause else R.drawable.ic_play,
                if (isPlaying) "Pause"            else "Play",
                actionPi(if (isPlaying) ACTION_PAUSE else ACTION_PLAY, 2)
            ))
            // Action 2: Next
            .addAction(NotificationCompat.Action(R.drawable.ic_next,     "Next",     actionPi(ACTION_NEXT,  3)))
            // Action 3: Like / Unlike
            .addAction(NotificationCompat.Action(
                if (isLiked) R.drawable.ic_heart_filled else R.drawable.ic_heart,
                if (isLiked) "Unlike" else "Like",
                actionPi(ACTION_LIKE, 4)
            ))

        return builder.build()
    }

    // ── MediaSession state ─────────────────────────────────────────────────

    private fun updateMediaSessionState() {
        val session = mediaSession ?: return

        session.setMetadata(
            MediaMetadataCompat.Builder()
                .putString(MediaMetadataCompat.METADATA_KEY_TITLE,  currentTitle)
                .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, currentArtist)
                .putString(MediaMetadataCompat.METADATA_KEY_ALBUM,  currentAlbum)
                .putLong(MediaMetadataCompat.METADATA_KEY_DURATION, duration)
                .putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, currentBitmap)
                .build()
        )

        session.setPlaybackState(
            PlaybackStateCompat.Builder()
                .setActions(
                    PlaybackStateCompat.ACTION_PLAY or
                    PlaybackStateCompat.ACTION_PAUSE or
                    PlaybackStateCompat.ACTION_PLAY_PAUSE or
                    PlaybackStateCompat.ACTION_SKIP_TO_NEXT or
                    PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS or
                    PlaybackStateCompat.ACTION_SEEK_TO
                )
                .setState(
                    if (isPlaying) PlaybackStateCompat.STATE_PLAYING
                    else           PlaybackStateCompat.STATE_PAUSED,
                    position,
                    if (isPlaying) 1.0f else 0.0f
                )
                .build()
        )
    }

    // ── Artwork loading ────────────────────────────────────────────────────

    private fun loadArtworkAsync() {
        val artworkUrl = currentArtwork
        if (artworkUrl.isEmpty()) return

        serviceScope.launch(Dispatchers.IO) {
            try {
                val conn = URL(artworkUrl).openConnection() as HttpURLConnection
                conn.connectTimeout = 6_000
                conn.readTimeout    = 6_000
                conn.setRequestProperty("User-Agent", "MwijayMusicApp/1.0")
                conn.connect()

                val bitmap = BitmapFactory.decodeStream(conn.inputStream)
                conn.disconnect()

                withContext(Dispatchers.Main) {
                    if (artworkUrl == currentArtwork) {  // Still the same track?
                        currentBitmap = bitmap
                        rebuildNotification()
                        updateMediaSessionState()
                    }
                }
            } catch (e: Exception) {
                // Keep previous bitmap — don't crash if artwork fails to load
            }
        }
    }
}
