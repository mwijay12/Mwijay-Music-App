package mwijay.music.app

import android.app.*
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.support.v4.media.MediaMetadataCompat
import android.support.v4.media.session.MediaSessionCompat
import android.support.v4.media.session.PlaybackStateCompat
import android.util.Log
import android.view.KeyEvent
import androidx.core.app.NotificationCompat
import androidx.media.session.MediaButtonReceiver
import kotlinx.coroutines.*
import java.net.HttpURLConnection
import java.net.URL

class MediaPlaybackService : Service() {

    companion object {
        private const val TAG = "MediaPlaybackService"
        const val CHANNEL_ID = "mwijay_media_channel_v7"
        const val NOTIFICATION_ID = 2025

        // Actions matching hooks/useBackgroundMedia.ts exactly
        const val ACTION_PLAY = "com.mwijay.ACTION_PLAY"
        const val ACTION_PAUSE = "com.mwijay.ACTION_PAUSE"
        const val ACTION_NEXT = "com.mwijay.ACTION_NEXT"
        const val ACTION_PREV = "com.mwijay.ACTION_PREV"
        const val ACTION_STOP = "com.mwijay.ACTION_STOP"
        const val ACTION_LIKE = "com.mwijay.ACTION_LIKE"

        // Broadcast action matching MediaPlugin.kt
        const val BROADCAST_ACTION = "com.mwijay.music.MEDIA_ACTION"
    }

    private var mediaSession: MediaSessionCompat? = null
    private val serviceScope = CoroutineScope(Dispatchers.Main + Job())

    // Current state variables
    private var mediaType = "music"
    private var mediaTitle = ""
    private var mediaArtist = ""
    private var mediaAlbum = ""
    private var mediaArtworkUrl = ""
    private var mediaIsPlaying = false
    private var mediaIsLiked = false
    private var mediaIsLive = false
    private var mediaDuration = 0L
    private var mediaPosition = 0L
    private var artworkBitmap: Bitmap? = null

    private lateinit var audioManager: AudioManager
    private var audioFocusRequest: AudioFocusRequest? = null
    private var wakeLock: PowerManager.WakeLock? = null

    private val focusChangeListener = AudioManager.OnAudioFocusChangeListener { focusChange ->
        when (focusChange) {
            AudioManager.AUDIOFOCUS_GAIN -> {
                broadcastAction(ACTION_PLAY)
            }
            AudioManager.AUDIOFOCUS_LOSS, AudioManager.AUDIOFOCUS_LOSS_TRANSIENT -> {
                broadcastAction(ACTION_PAUSE)
            }
            AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK -> {
                // Duck volume if needed (handled in React if desired)
                val intent = Intent(BROADCAST_ACTION).apply {
                    putExtra("action", "DUCK_VOLUME")
                    setPackage(packageName)
                }
                sendBroadcast(intent)
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "Mwijay Background Service booting...")
        audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
        setupWakeLock()
        createNotificationChannel()
        setupMediaSession()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent != null) {
            val action = intent.action
            Log.d(TAG, "onStartCommand action: $action")
            if (action == Intent.ACTION_MEDIA_BUTTON) {
                MediaButtonReceiver.handleIntent(mediaSession, intent)
            } else if (action != null && (action.startsWith("com.mwijay.ACTION_") || action == ACTION_STOP)) {
                handleNativeAction(action, intent)
            } else {
                updateTrackData(intent)
            }
        }
        return START_STICKY
    }

    private fun handleNativeAction(action: String, intent: Intent) {
        when (action) {
            ACTION_PLAY -> {
                mediaIsPlaying = true
                requestAudioFocus()
                acquireWakeLock()
                broadcastAction(ACTION_PLAY)
                updateAllStates()
            }
            ACTION_PAUSE -> {
                mediaIsPlaying = false
                releaseWakeLock()
                broadcastAction(ACTION_PAUSE)
                updateAllStates()
            }
            ACTION_STOP -> {
                mediaIsPlaying = false
                releaseWakeLock()
                abandonAudioFocus()
                broadcastAction(ACTION_STOP)
                stopForegroundService()
            }
            ACTION_LIKE -> {
                mediaIsLiked = !mediaIsLiked
                broadcastAction(ACTION_LIKE)
                updateAllStates()
            }
            else -> {
                broadcastAction(action)
            }
        }
    }

    private fun updateTrackData(intent: Intent) {
        mediaType = intent.getStringExtra("type") ?: "music"
        mediaTitle = intent.getStringExtra("title") ?: mediaTitle
        mediaArtist = intent.getStringExtra("artist") ?: mediaArtist
        mediaAlbum = intent.getStringExtra("album") ?: mediaAlbum
        
        val newArtworkUrl = intent.getStringExtra("artwork") ?: ""
        mediaIsPlaying = intent.getBooleanExtra("isPlaying", mediaIsPlaying)
        mediaIsLiked = intent.getBooleanExtra("isLiked", mediaIsLiked)
        mediaIsLive = intent.getBooleanExtra("isLive", mediaIsLive)
        mediaDuration = intent.getLongExtra("duration", mediaDuration)
        mediaPosition = intent.getLongExtra("position", mediaPosition)

        if (mediaIsPlaying) {
            requestAudioFocus()
            acquireWakeLock()
        } else {
            releaseWakeLock()
        }

        if (newArtworkUrl.isNotEmpty() && newArtworkUrl != mediaArtworkUrl) {
            mediaArtworkUrl = newArtworkUrl
            artworkBitmap = null
            loadArtwork(mediaArtworkUrl)
        }

        updateAllStates()
    }

    private fun updateAllStates() {
        updateNotification()
        updateMediaSessionMetadata()
        updateMediaSessionState()
    }

    private fun setupMediaSession() {
        val intent = packageManager.getLaunchIntentForPackage(packageName)
        val pi = PendingIntent.getActivity(
            this, 
            0, 
            intent, 
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        mediaSession = MediaSessionCompat(this, "MwijaySession").apply {
            setSessionActivity(pi)
            setCallback(object : MediaSessionCompat.Callback() {
                override fun onPlay() {
                    handleNativeAction(ACTION_PLAY, Intent())
                }

                override fun onPause() {
                    handleNativeAction(ACTION_PAUSE, Intent())
                }

                override fun onSkipToNext() {
                    broadcastAction(ACTION_NEXT)
                }

                override fun onSkipToPrevious() {
                    broadcastAction(ACTION_PREV)
                }

                override fun onStop() {
                    handleNativeAction(ACTION_STOP, Intent())
                }

                override fun onSeekTo(pos: Long) {
                    mediaPosition = pos
                    broadcastWithPosition("SEEK", pos)
                    updateMediaSessionState()
                }

                override fun onMediaButtonEvent(mediaButtonEvent: Intent): Boolean {
                    val event = mediaButtonEvent.getParcelableExtra<KeyEvent>(Intent.EXTRA_KEY_EVENT)
                    if (event != null && event.action == KeyEvent.ACTION_DOWN) {
                        when (event.keyCode) {
                            KeyEvent.KEYCODE_HEADSETHOOK, KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE -> {
                                if (mediaIsPlaying) onPause() else onPlay()
                                return true
                            }
                            KeyEvent.KEYCODE_MEDIA_PLAY -> {
                                onPlay()
                                return true
                            }
                            KeyEvent.KEYCODE_MEDIA_PAUSE -> {
                                onPause()
                                return true
                            }
                            KeyEvent.KEYCODE_MEDIA_NEXT -> {
                                onSkipToNext()
                                return true
                            }
                            KeyEvent.KEYCODE_MEDIA_PREVIOUS -> {
                                onSkipToPrevious()
                                return true
                            }
                            KeyEvent.KEYCODE_MEDIA_STOP -> {
                                onStop()
                                return true
                            }
                        }
                    }
                    return super.onMediaButtonEvent(mediaButtonEvent)
                }
            })
            isActive = true
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Mwijay Media Player",
                NotificationManager.IMPORTANCE_LOW // Low to prevent annoying alert sounds on update
            ).apply {
                description = "Audio playback controls"
                setShowBadge(false)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }

    private fun updateNotification() {
        val notification = buildNotification()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID, 
                notification, 
                android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun buildNotification(): Notification {
        val intent = packageManager.getLaunchIntentForPackage(packageName)
        val openAppPendingIntent = PendingIntent.getActivity(
            this, 
            0, 
            intent, 
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Select metadata titles/texts based on mediaType
        val notificationTitle = mediaTitle.ifEmpty { "Mwijay Music" }
        val notificationText = when (mediaType) {
            "radio" -> if (mediaIsLive) "🔴 LIVE NOW · $mediaArtist" else mediaArtist
            "reel" -> "🎬 $mediaArtist"
            else -> mediaArtist
        }
        val notificationSubText = when (mediaType) {
            "radio" -> "📻 Mwijay Radio"
            "reel" -> "Mwijay Reels"
            else -> mediaAlbum.ifEmpty { "🎵 Mwijay Music" }
        }

        // Get small icon based on type
        val smallIconRes = when (mediaType) {
            "radio" -> R.drawable.ic_radio
            "reel" -> R.drawable.ic_reel
            else -> R.drawable.ic_music_note
        }

        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(notificationTitle)
            .setContentText(notificationText)
            .setSubText(notificationSubText)
            .setSmallIcon(smallIconRes)
            .setLargeIcon(artworkBitmap ?: createPlaceholderBitmap())
            .setColor(Color.parseColor("#A8E040")) // Exact brand color
            .setColorized(true)
            .setContentIntent(openAppPendingIntent)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOnlyAlertOnce(true)
            .setOngoing(mediaIsPlaying)
            .setShowWhen(false)
            .setCategory(NotificationCompat.CATEGORY_TRANSPORT)
            .setPriority(NotificationCompat.PRIORITY_HIGH)

        val mediaStyle = androidx.media.app.NotificationCompat.MediaStyle()
            .setMediaSession(mediaSession?.sessionToken)

        // Add action buttons based on mediaType
        if (mediaType == "radio") {
            // Radio: Play/Pause, Stop (2 Actions)
            builder.addAction(
                NotificationCompat.Action(
                    if (mediaIsPlaying) R.drawable.ic_pause else R.drawable.ic_play,
                    if (mediaIsPlaying) "Pause" else "Play",
                    createActionIntent(if (mediaIsPlaying) ACTION_PAUSE else ACTION_PLAY)
                )
            )
            builder.addAction(
                NotificationCompat.Action(
                    R.drawable.ic_stop,
                    "Stop",
                    createActionIntent(ACTION_STOP)
                )
            )
            mediaStyle.setShowActionsInCompactView(0, 1)
        } else if (mediaType == "reel") {
            // Reel: Prev, Play/Pause, Next (3 Actions)
            builder.addAction(NotificationCompat.Action(R.drawable.ic_prev, "Previous", createActionIntent(ACTION_PREV)))
            builder.addAction(
                NotificationCompat.Action(
                    if (mediaIsPlaying) R.drawable.ic_pause else R.drawable.ic_play,
                    if (mediaIsPlaying) "Pause" else "Play",
                    createActionIntent(if (mediaIsPlaying) ACTION_PAUSE else ACTION_PLAY)
                )
            )
            builder.addAction(NotificationCompat.Action(R.drawable.ic_next, "Next", createActionIntent(ACTION_NEXT)))
            mediaStyle.setShowActionsInCompactView(0, 1, 2)
        } else {
            // Default Music: Prev, Play/Pause, Next, Like (4 Actions)
            builder.addAction(NotificationCompat.Action(R.drawable.ic_prev, "Previous", createActionIntent(ACTION_PREV)))
            builder.addAction(
                NotificationCompat.Action(
                    if (mediaIsPlaying) R.drawable.ic_pause else R.drawable.ic_play,
                    if (mediaIsPlaying) "Pause" else "Play",
                    createActionIntent(if (mediaIsPlaying) ACTION_PAUSE else ACTION_PLAY)
                )
            )
            builder.addAction(NotificationCompat.Action(R.drawable.ic_next, "Next", createActionIntent(ACTION_NEXT)))
            builder.addAction(
                NotificationCompat.Action(
                    if (mediaIsLiked) R.drawable.ic_heart_filled else R.drawable.ic_heart,
                    if (mediaIsLiked) "Unlike" else "Like",
                    createActionIntent(ACTION_LIKE)
                )
            )
            // Compact view supports maximum of 3 buttons normally
            mediaStyle.setShowActionsInCompactView(0, 1, 2)
        }

        builder.setStyle(mediaStyle)
        return builder.build()
    }

    private fun createActionIntent(action: String): PendingIntent {
        val intent = Intent(this, MediaPlaybackService::class.java).apply {
            this.action = action
        }
        return PendingIntent.getService(
            this,
            action.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    private fun updateMediaSessionMetadata() {
        val builder = MediaMetadataCompat.Builder()
            .putString(MediaMetadataCompat.METADATA_KEY_TITLE, mediaTitle)
            .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, mediaArtist)
            .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, mediaAlbum)
            .putString(MediaMetadataCompat.METADATA_KEY_DISPLAY_TITLE, mediaTitle)
            .putString(MediaMetadataCompat.METADATA_KEY_DISPLAY_SUBTITLE, mediaArtist)

        if (mediaType == "radio" || mediaIsLive) {
            builder.putLong(MediaMetadataCompat.METADATA_KEY_DURATION, -1L) // Hide progress bar for Radio
        } else {
            builder.putLong(MediaMetadataCompat.METADATA_KEY_DURATION, mediaDuration)
        }

        val artwork = artworkBitmap ?: createPlaceholderBitmap()
        builder.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, artwork)
        builder.putBitmap(MediaMetadataCompat.METADATA_KEY_DISPLAY_ICON, artwork)

        mediaSession?.setMetadata(builder.build())
    }

    private fun updateMediaSessionState() {
        val state = if (mediaIsPlaying) PlaybackStateCompat.STATE_PLAYING else PlaybackStateCompat.STATE_PAUSED
        
        val actions = if (mediaType == "radio") {
            PlaybackStateCompat.ACTION_PLAY or PlaybackStateCompat.ACTION_PAUSE or
                    PlaybackStateCompat.ACTION_PLAY_PAUSE or PlaybackStateCompat.ACTION_STOP
        } else {
            PlaybackStateCompat.ACTION_PLAY or PlaybackStateCompat.ACTION_PAUSE or
                    PlaybackStateCompat.ACTION_PLAY_PAUSE or PlaybackStateCompat.ACTION_SKIP_TO_NEXT or
                    PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS or PlaybackStateCompat.ACTION_SEEK_TO or
                    PlaybackStateCompat.ACTION_STOP
        }

        mediaSession?.setPlaybackState(
            PlaybackStateCompat.Builder()
                .setActions(actions)
                .setState(state, mediaPosition, 1.0f)
                .build()
        )
    }

    private fun broadcastAction(action: String) {
        val intent = Intent(BROADCAST_ACTION).apply {
            putExtra("action", action)
            setPackage(packageName)
        }
        sendBroadcast(intent)
    }

    private fun broadcastWithPosition(action: String, position: Long) {
        val intent = Intent(BROADCAST_ACTION).apply {
            putExtra("action", action)
            putExtra("position", position)
            setPackage(packageName)
        }
        sendBroadcast(intent)
    }

    private fun loadArtwork(url: String) {
        if (url.isEmpty()) return
        serviceScope.launch {
            try {
                val bitmap = withContext(Dispatchers.IO) {
                    if (url.startsWith("data:")) {
                        // Decode base64 extracted embedded artwork (e.g. data:image/jpeg;base64,...)
                        try {
                            val base64Data = url.substring(url.indexOf(",") + 1)
                            val decodedBytes = android.util.Base64.decode(base64Data, android.util.Base64.DEFAULT)
                            BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size)
                        } catch (e: Exception) {
                            Log.e(TAG, "Failed to decode base64 artwork: ${e.message}")
                            null
                        }
                    } else if (url.startsWith("file://") || url.startsWith("/")) {
                        // Decode local cached files
                        try {
                            var filePath = url
                            if (filePath.startsWith("file://")) {
                                filePath = filePath.substring(7)
                            }
                            val file = java.io.File(filePath)
                            if (file.exists()) {
                                BitmapFactory.decodeFile(filePath)
                            } else {
                                null
                            }
                        } catch (e: Exception) {
                            Log.e(TAG, "Failed to read local file: $url", e)
                            null
                        }
                    } else if (url.startsWith("content://")) {
                        try {
                            val uri = android.net.Uri.parse(url)
                            contentResolver.openInputStream(uri)?.use { inputStream ->
                                BitmapFactory.decodeStream(inputStream)
                            }
                        } catch (e: Exception) {
                            Log.e(TAG, "Failed to read content URI: $url", e)
                            null
                        }
                    } else {
                        // Parse as standard URL
                        val conn = URL(url).openConnection() as HttpURLConnection
                        conn.connectTimeout = 6000
                        conn.readTimeout = 6000
                        conn.setRequestProperty("User-Agent", "MwijayMusicApp/1.0")
                        conn.inputStream.use { BitmapFactory.decodeStream(it) }
                    }
                }
                if (bitmap != null) {
                    artworkBitmap = bitmap
                    updateAllStates()
                }
            } catch (e: Exception) {
                Log.e(TAG, "Artwork download/load failed: $url", e)
            }
        }
    }

    private fun createPlaceholderBitmap(): Bitmap {
        return createPlaceholderBitmapInternal(mediaType)
    }

    private fun createPlaceholderBitmapInternal(type: String): Bitmap {
        val size = 512
        val b = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(b)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG)

        // Vibrant backgrounds based on type
        val hexColor = when (type) {
            "radio" -> "#EF4444" // vibrant red
            "reel" -> "#A855F7"  // vibrant purple
            else -> "#A8E040"    // brand green
        }

        paint.color = Color.parseColor(hexColor)
        canvas.drawRoundRect(0f, 0f, size.toFloat(), size.toFloat(), 64f, 64f, paint)

        paint.color = Color.WHITE
        paint.textSize = 220f
        paint.textAlign = Paint.Align.CENTER

        val emoji = when (type) {
            "radio" -> "📻"
            "reel" -> "🎬"
            else -> "🎵"
        }

        val yPos = size / 2f + 75f
        canvas.drawText(emoji, size / 2f, yPos, paint)
        return b
    }

    private fun setupWakeLock() {
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Mwijay::WakeLock")
    }

    private fun acquireWakeLock() {
        if (wakeLock?.isHeld == false) {
            wakeLock?.acquire(30 * 60 * 1000L) // 30 minutes safe timeout
        }
    }

    private fun releaseWakeLock() {
        if (wakeLock?.isHeld == true) {
            wakeLock?.release()
        }
    }

    private fun requestAudioFocus(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val attr = AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .build()
            audioFocusRequest = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                .setAudioAttributes(attr)
                .setOnAudioFocusChangeListener(focusChangeListener)
                .build()
            audioManager.requestAudioFocus(audioFocusRequest!!) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
        } else {
            @Suppress("DEPRECATION")
            audioManager.requestAudioFocus(
                focusChangeListener, 
                AudioManager.STREAM_MUSIC, 
                AudioManager.AUDIOFOCUS_GAIN
            ) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
        }
    }

    private fun abandonAudioFocus() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            audioFocusRequest?.let { audioManager.abandonAudioFocusRequest(it) }
        } else {
            @Suppress("DEPRECATION")
            audioManager.abandonAudioFocus(focusChangeListener)
        }
    }

    private fun stopForegroundService() {
        mediaSession?.release()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
            @Suppress("DEPRECATION")
            stopForeground(true)
        }
        stopSelf()
    }

    override fun onDestroy() {
        serviceScope.cancel()
        mediaSession?.release()
        releaseWakeLock()
        abandonAudioFocus()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
