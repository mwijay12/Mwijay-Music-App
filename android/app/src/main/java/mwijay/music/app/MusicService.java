package mwijay.music.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import android.view.KeyEvent;
import androidx.core.app.NotificationCompat;
import androidx.media.session.MediaButtonReceiver;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MusicService extends Service {

    public static final String CHANNEL_ID = "mwijay_music_channel_v2";
    public static final int NOTIFICATION_ID = 1;

    // Actions sent from OS/service controls to this service
    public static final String ACTION_PLAY = "com.mwijay.ACTION_PLAY";
    public static final String ACTION_PAUSE = "com.mwijay.ACTION_PAUSE";
    public static final String ACTION_NEXT = "com.mwijay.ACTION_NEXT";
    public static final String ACTION_PREV = "com.mwijay.ACTION_PREV";
    public static final String ACTION_LIKE = "com.mwijay.ACTION_LIKE";
    public static final String ACTION_STOP = "com.mwijay.ACTION_STOP";

    // Intent extras
    public static final String EXTRA_TITLE = "title";
    public static final String EXTRA_ARTIST = "artist";
    public static final String EXTRA_ALBUM = "album";
    public static final String EXTRA_ARTWORK = "artwork";
    public static final String EXTRA_IS_PLAYING = "isPlaying";
    public static final String EXTRA_IS_LIKED = "isLiked";
    public static final String EXTRA_DURATION = "duration"; // milliseconds
    public static final String EXTRA_POSITION = "position"; // milliseconds
    public static final String EXTRA_TYPE = "type"; // music, radio, reel, podcast, video
    public static final String EXTRA_IS_LIVE = "isLive";

    private MediaSessionCompat mediaSession = null;
    private final ExecutorService artworkExecutor = Executors.newSingleThreadExecutor();

    private String currentTitle = "";
    private String currentArtist = "";
    private String currentAlbum = "";
    private String currentArtwork = "";
    private String currentType = "music";
    private boolean isPlaying = false;
    private boolean isLiked = false;
    private boolean isLive = false;
    private long duration = 0L;
    private long position = 0L;
    private Bitmap currentBitmap = null;

    // Wake Lock & Audio Focus
    private PowerManager.WakeLock wakeLock = null;
    private AudioManager audioManager = null;
    private AudioFocusRequest audioFocusRequest = null;

    private final AudioManager.OnAudioFocusChangeListener focusChangeListener = focusChange -> {
        switch (focusChange) {
            case AudioManager.AUDIOFOCUS_GAIN:
                // Resume playback when audio focus is regained
                broadcastAction(ACTION_PLAY);
                break;
            case AudioManager.AUDIOFOCUS_LOSS:
            case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT:
                // Pause playback temporarily on transient loss (like calls or voice commands)
                broadcastAction(ACTION_PAUSE);
                break;
            case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK:
                // Lower volume or trigger temporary duck action
                Intent duckIntent = new Intent("com.mwijay.MEDIA_ACTION");
                duckIntent.putExtra("action", "DUCK_VOLUME");
                sendBroadcast(duckIntent);
                break;
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();

        // Initialize systems
        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        setupWakeLock();
        createNotificationChannel();
        setupMediaSession();

        // Start foreground service immediately with stub notification
        rebuildNotification();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // Handle media button events from Bluetooth/wired headphone buttons
        MediaButtonReceiver.handleIntent(mediaSession, intent);

        if (intent == null) {
            rebuildNotification();
        } else {
            handleIntent(intent);
        }
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        releaseWakeLock();
        abandonAudioFocus();
        artworkExecutor.shutdownNow();
        if (mediaSession != null) {
            mediaSession.release();
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void handleIntent(Intent intent) {
        String action = intent.getAction();
        if (action != null) {
            switch (action) {
                case ACTION_PLAY:
                case ACTION_PAUSE:
                case ACTION_NEXT:
                case ACTION_PREV:
                case ACTION_LIKE:
                case ACTION_STOP:
                    broadcastAction(action);

                    switch (action) {
                        case ACTION_PLAY:
                            isPlaying = true;
                            requestAudioFocus();
                            acquireWakeLock();
                            rebuildNotification();
                            break;
                        case ACTION_PAUSE:
                            isPlaying = false;
                            releaseWakeLock();
                            rebuildNotification();
                            break;
                        case ACTION_LIKE:
                            isLiked = !isLiked;
                            rebuildNotification();
                            break;
                        case ACTION_STOP:
                            isPlaying = false;
                            releaseWakeLock();
                            abandonAudioFocus();
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                                stopForeground(STOP_FOREGROUND_REMOVE);
                            } else {
                                stopForeground(true);
                            }
                            stopSelf();
                            break;
                    }
                    return;
            }
        }

        // Handle updates sent to the player service
        currentTitle = intent.hasExtra(EXTRA_TITLE) ? intent.getStringExtra(EXTRA_TITLE) : currentTitle;
        currentArtist = intent.hasExtra(EXTRA_ARTIST) ? intent.getStringExtra(EXTRA_ARTIST) : currentArtist;
        currentAlbum = intent.hasExtra(EXTRA_ALBUM) ? intent.getStringExtra(EXTRA_ALBUM) : currentAlbum;
        currentType = intent.hasExtra(EXTRA_TYPE) ? intent.getStringExtra(EXTRA_TYPE) : currentType;
        isLive = intent.getBooleanExtra(EXTRA_IS_LIVE, isLive);
        duration = intent.getLongExtra(EXTRA_DURATION, duration);
        position = intent.getLongExtra(EXTRA_POSITION, position);
        isPlaying = intent.getBooleanExtra(EXTRA_IS_PLAYING, isPlaying);
        isLiked = intent.getBooleanExtra(EXTRA_IS_LIKED, isLiked);

        // Manage audio focus and wake locks based on playing state
        if (isPlaying) {
            requestAudioFocus();
            acquireWakeLock();
        } else {
            releaseWakeLock();
        }

        String newArtwork = intent.hasExtra(EXTRA_ARTWORK) ? intent.getStringExtra(EXTRA_ARTWORK) : "";
        boolean artworkChanged = !newArtwork.isEmpty() && !newArtwork.equals(currentArtwork);

        if (artworkChanged) {
            currentArtwork = newArtwork;
            currentBitmap = null;
        }

        rebuildNotification();
        updateMediaSessionState();

        if (artworkChanged) {
            loadArtworkAsync();
        }
    }

    private void setupMediaSession() {
        // Create intent for button controls
        Intent mediaButtonIntent = new Intent(Intent.ACTION_MEDIA_BUTTON);
        mediaButtonIntent.setClass(this, MediaButtonReceiver.class);
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
                this, 0, mediaButtonIntent,
                PendingIntent.FLAG_IMMUTABLE);

        mediaSession = new MediaSessionCompat(this, "MwijaySession");
        mediaSession.setMediaButtonReceiver(pendingIntent);
        mediaSession.setActive(true);

        mediaSession.setCallback(new MediaSessionCompat.Callback() {
            @Override
            public void onPlay() {
                broadcastAction(ACTION_PLAY);
            }

            @Override
            public void onPause() {
                broadcastAction(ACTION_PAUSE);
            }

            @Override
            public void onSkipToNext() {
                broadcastAction(ACTION_NEXT);
            }

            @Override
            public void onSkipToPrevious() {
                broadcastAction(ACTION_PREV);
            }

            @Override
            public void onSeekTo(long pos) {
                Intent b = new Intent("com.mwijay.MEDIA_ACTION");
                b.putExtra("action", "SEEK");
                b.putExtra("position", pos);
                sendBroadcast(b);
            }

            @Override
            public void onStop() {
                broadcastAction(ACTION_STOP);
            }

            // Explicit Bluetooth headphone key interception callback
            @Override
            public boolean onMediaButtonEvent(Intent mediaButtonEvent) {
                KeyEvent event = mediaButtonEvent.getParcelableExtra(Intent.EXTRA_KEY_EVENT);
                if (event != null && event.getAction() == KeyEvent.ACTION_DOWN) {
                    switch (event.getKeyCode()) {
                        case KeyEvent.KEYCODE_HEADSETHOOK:
                        case KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE:
                            if (isPlaying) {
                                onPause();
                            } else {
                                onPlay();
                            }
                            return true;
                        case KeyEvent.KEYCODE_MEDIA_PLAY:
                            onPlay();
                            return true;
                        case KeyEvent.KEYCODE_MEDIA_PAUSE:
                            onPause();
                            return true;
                        case KeyEvent.KEYCODE_MEDIA_NEXT:
                        case KeyEvent.KEYCODE_MEDIA_FAST_FORWARD:
                            onSkipToNext();
                            return true;
                        case KeyEvent.KEYCODE_MEDIA_PREVIOUS:
                        case KeyEvent.KEYCODE_MEDIA_REWIND:
                            onSkipToPrevious();
                            return true;
                        case KeyEvent.KEYCODE_MEDIA_STOP:
                            onStop();
                            return true;
                    }
                }
                return super.onMediaButtonEvent(mediaButtonEvent);
            }
        });

        mediaSession.setFlags(
                MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS |
                        MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS);
    }

    private void broadcastAction(String action) {
        sendBroadcast(new Intent("com.mwijay.MEDIA_ACTION").putExtra("action", action));
    }

    // ═══ AUDIO FOCUS MANAGEMENT ═══
    private boolean requestAudioFocus() {
        if (audioManager == null)
            return false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            AudioAttributes attributes = new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .build();
            audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                    .setAudioAttributes(attributes)
                    .setOnAudioFocusChangeListener(focusChangeListener)
                    .setAcceptsDelayedFocusGain(true)
                    .build();
            return audioManager.requestAudioFocus(audioFocusRequest) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
        } else {
            return audioManager.requestAudioFocus(
                    focusChangeListener,
                    AudioManager.STREAM_MUSIC,
                    AudioManager.AUDIOFOCUS_GAIN) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
        }
    }

    private void abandonAudioFocus() {
        if (audioManager == null)
            return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (audioFocusRequest != null) {
                audioManager.abandonAudioFocusRequest(audioFocusRequest);
            }
        } else {
            audioManager.abandonAudioFocus(focusChangeListener);
        }
    }

    // ═══ WAKE LOCK MANAGEMENT ═══
    private void setupWakeLock() {
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "MwijayMusicApp::MediaPlaybackWakeLock");
        }
    }

    private void acquireWakeLock() {
        if (wakeLock != null && !wakeLock.isHeld()) {
            wakeLock.acquire(10 * 60 * 1000L); // 10 minute absolute timeout per chunk
        }
    }

    private void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
    }

    // ═══ NOTIFICATION CHANNEL ═══
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Mwijay Media Playback",
                    NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("Controls for music, radio, podcasts, reels and videos");
            channel.setShowBadge(false);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            channel.enableVibration(false);
            channel.enableLights(true);
            channel.setLightColor(Color.parseColor("#A8E040"));

            getSystemService(NotificationManager.class).createNotificationChannel(channel);
        }
    }

    private void rebuildNotification() {
        try {
            Notification notification = buildNotification();

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(NOTIFICATION_ID, notification,
                        ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private Notification buildNotification() {
        PendingIntent openApp = PendingIntent.getActivity(
                this, 0,
                getPackageManager().getLaunchIntentForPackage(getPackageName()),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        ActionPendingIntentFactory actionPi = new ActionPendingIntentFactory();

        // Custom display metadata depending on media type
        String displayTitle = currentTitle.isEmpty() ? "Mwijay Music" : currentTitle;
        String displayText = currentArtist;
        String displaySubText = "🎵 Mwijay Music";

        switch (currentType) {
            case "radio":
                displayText = isLive ? "🔴 LIVE · " + currentArtist : currentArtist;
                displaySubText = "📻 Mwijay Radio";
                break;
            case "reel":
                displayText = "🎬 " + currentArtist;
                displaySubText = "Mwijay Reels";
                break;
            case "podcast":
                displayText = "🎙️ " + currentArtist;
                displaySubText = "Mwijay Podcasts";
                break;
            case "video":
                displayText = "▶️ " + currentArtist;
                displaySubText = "Mwijay Videos";
                break;
            default:
                if (!currentAlbum.isEmpty()) {
                    displaySubText = currentAlbum;
                }
                break;
        }

        Bitmap largeIcon = currentBitmap;
        if (largeIcon == null) {
            largeIcon = createDefaultArtwork();
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(displayTitle)
                .setContentText(displayText)
                .setSubText(displaySubText)
                .setSmallIcon(getSmallIcon())
                .setLargeIcon(largeIcon)
                .setContentIntent(openApp)
                .setColor(Color.parseColor("#A8E040"))
                .setColorized(true)
                .setDeleteIntent(actionPi.get(ACTION_STOP, 5))
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setOnlyAlertOnce(true)
                .setOngoing(isPlaying)
                .setShowWhen(false)
                .setCategory(NotificationCompat.CATEGORY_TRANSPORT)
                .setPriority(NotificationCompat.PRIORITY_HIGH);

        // Customize MediaStyle actions depending on category
        androidx.media.app.NotificationCompat.MediaStyle mediaStyle = new androidx.media.app.NotificationCompat.MediaStyle()
                .setMediaSession(mediaSession != null ? mediaSession.getSessionToken() : null);

        if ("radio".equals(currentType)) {
            // Radio: Play/Pause + Stop
            builder.addAction(new NotificationCompat.Action(
                    isPlaying ? R.drawable.ic_pause : R.drawable.ic_play,
                    isPlaying ? "Pause" : "Play",
                    actionPi.get(isPlaying ? ACTION_PAUSE : ACTION_PLAY, 2)));
            builder.addAction(new NotificationCompat.Action(
                    R.drawable.ic_stop,
                    "Stop",
                    actionPi.get(ACTION_STOP, 5)));
            mediaStyle.setShowActionsInCompactView(0, 1);
        } else {
            // Music/Podcast/Reels: Prev + Play/Pause + Next + Like
            builder.addAction(
                    new NotificationCompat.Action(R.drawable.ic_prev, "Previous", actionPi.get(ACTION_PREV, 1)));
            builder.addAction(new NotificationCompat.Action(
                    isPlaying ? R.drawable.ic_pause : R.drawable.ic_play,
                    isPlaying ? "Pause" : "Play",
                    actionPi.get(isPlaying ? ACTION_PAUSE : ACTION_PLAY, 2)));
            builder.addAction(new NotificationCompat.Action(R.drawable.ic_next, "Next", actionPi.get(ACTION_NEXT, 3)));

            if ("music".equals(currentType)) {
                builder.addAction(new NotificationCompat.Action(
                        isLiked ? R.drawable.ic_heart_filled : R.drawable.ic_heart,
                        isLiked ? "Unlike" : "Like",
                        actionPi.get(ACTION_LIKE, 4)));
                // Android 15: compact shows play/pause, prev, next (3 max)
                // Like/stop buttons are visible in expanded notification only
                mediaStyle.setShowActionsInCompactView(0, 1, 2);
            } else {
                // Non-music: compact shows only transport controls
                mediaStyle.setShowActionsInCompactView(0, 1, 2);
            }
        }

        builder.setStyle(mediaStyle);
        return builder.build();
    }

    private class ActionPendingIntentFactory {
        PendingIntent get(String action, int code) {
            Intent intent = new Intent(MusicService.this, MusicService.class);
            intent.setAction(action);
            return PendingIntent.getService(
                    MusicService.this, code,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        }
    }

    private int getSmallIcon() {
        return R.drawable.ic_notification;
    }

    private void updateMediaSessionState() {
        MediaSessionCompat session = mediaSession;
        if (session == null)
            return;

        Bitmap artwork = currentBitmap;
        if (artwork == null) {
            artwork = createDefaultArtwork();
        }

        long sessionDuration = duration;
        if ("radio".equals(currentType) || isLive) {
            sessionDuration = -1L;
        }

        session.setMetadata(
                new MediaMetadataCompat.Builder()
                        .putString(MediaMetadataCompat.METADATA_KEY_TITLE, currentTitle)
                        .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, currentArtist)
                        .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, currentAlbum)
                        .putString(MediaMetadataCompat.METADATA_KEY_DISPLAY_TITLE, currentTitle)
                        .putString(MediaMetadataCompat.METADATA_KEY_DISPLAY_SUBTITLE, currentArtist)
                        .putLong(MediaMetadataCompat.METADATA_KEY_DURATION, sessionDuration)
                        .putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, artwork)
                        .putBitmap(MediaMetadataCompat.METADATA_KEY_DISPLAY_ICON, artwork)
                        .build());

        long actions = PlaybackStateCompat.ACTION_PLAY |
                PlaybackStateCompat.ACTION_PAUSE |
                PlaybackStateCompat.ACTION_PLAY_PAUSE |
                PlaybackStateCompat.ACTION_STOP;

        if (!"radio".equals(currentType)) {
            actions |= PlaybackStateCompat.ACTION_SKIP_TO_NEXT |
                    PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS |
                    PlaybackStateCompat.ACTION_SEEK_TO;
        }

        session.setPlaybackState(
                new PlaybackStateCompat.Builder()
                        .setActions(actions)
                        .setState(
                                isPlaying ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED,
                                position,
                                1.0f)
                        .build());
    }

    private Bitmap createDefaultArtwork() {
        int size = 512;
        Bitmap bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        android.graphics.Canvas canvas = new android.graphics.Canvas(bitmap);

        android.graphics.Paint paint = new android.graphics.Paint();
        paint.setAntiAlias(true);

        // Colors corresponding to media types
        String hexColor = "#A8E040"; // brand green
        switch (currentType) {
            case "radio":
                hexColor = "#FF6B6B";
                break;
            case "reel":
                hexColor = "#9333EA";
                break;
            case "podcast":
                hexColor = "#3B82F6";
                break;
            case "video":
                hexColor = "#EC4899";
                break;
        }
        paint.setColor(Color.parseColor(hexColor));

        canvas.drawRoundRect(0f, 0f, size, size, 64f, 64f, paint);

        // Draw emoji center icon
        paint.setColor(Color.WHITE);
        paint.setTextAlign(android.graphics.Paint.Align.CENTER);
        paint.setTextSize(200f);

        String emoji = "🎵";
        switch (currentType) {
            case "radio":
                emoji = "📻";
                break;
            case "reel":
                emoji = "🎬";
                break;
            case "podcast":
                emoji = "🎙️";
                break;
            case "video":
                emoji = "▶️";
                break;
        }

        float yPos = size / 2f + 70f;
        canvas.drawText(emoji, size / 2f, yPos, paint);

        return bitmap;
    }

    private void loadArtworkAsync() {
        final String artworkUrl = currentArtwork;
        if (artworkUrl.isEmpty())
            return;

        artworkExecutor.submit(() -> {
            try {
                Bitmap bitmap = null;

                if (artworkUrl.startsWith("data:")) {
                    // Handle data:image/jpeg;base64,... URIs from embedded ID3 artwork
                    String base64Data = artworkUrl.substring(artworkUrl.indexOf(",") + 1);
                    byte[] decodedBytes = android.util.Base64.decode(base64Data, android.util.Base64.DEFAULT);
                    bitmap = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.length);
                } else if (artworkUrl.startsWith("file://") || artworkUrl.startsWith("/")
                        || artworkUrl.startsWith("content://")) {
                    // Handle local file paths (cached artwork from MediaScanner)
                    String filePath = artworkUrl;
                    if (filePath.startsWith("file://")) {
                        filePath = filePath.substring(7);
                    }

                    if (filePath.startsWith("content://")) {
                        // Content URI — use ContentResolver
                        android.net.Uri uri = android.net.Uri.parse(filePath);
                        InputStream is = getContentResolver().openInputStream(uri);
                        if (is != null) {
                            bitmap = BitmapFactory.decodeStream(is);
                            is.close();
                        }
                    } else {
                        // Absolute file path
                        java.io.File file = new java.io.File(filePath);
                        if (file.exists()) {
                            bitmap = BitmapFactory.decodeFile(filePath);
                        }
                    }
                } else if (artworkUrl.startsWith("http://") || artworkUrl.startsWith("https://")) {
                    // Handle HTTP/HTTPS URLs (online tracks)
                    URL url = new URL(artworkUrl);
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setConnectTimeout(6000);
                    conn.setReadTimeout(6000);
                    conn.setRequestProperty("User-Agent", "MwijayMusicApp/1.0");
                    conn.connect();

                    InputStream inputStream = conn.getInputStream();
                    bitmap = BitmapFactory.decodeStream(inputStream);
                    conn.disconnect();
                }

                if (bitmap != null) {
                    final Bitmap finalBitmap = bitmap;
                    new Handler(Looper.getMainLooper()).post(() -> {
                        if (artworkUrl.equals(currentArtwork)) {
                            currentBitmap = finalBitmap;
                            rebuildNotification();
                            updateMediaSessionState();
                        }
                    });
                }
            } catch (Exception e) {
                // Fail gracefully — notification will show default artwork
                android.util.Log.w("MusicService",
                        "Failed to load artwork: " + artworkUrl.substring(0, Math.min(artworkUrl.length(), 80)), e);
            }
        });
    }
}
