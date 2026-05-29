package mwijay.music.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import androidx.core.app.NotificationCompat;
import mwijay.music.app.R;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MusicService extends Service {

    public static final String CHANNEL_ID = "mwijay_music_channel";
    public static final int NOTIFICATION_ID = 1;

    public static final String ACTION_PLAY  = "com.mwijay.ACTION_PLAY";
    public static final String ACTION_PAUSE = "com.mwijay.ACTION_PAUSE";
    public static final String ACTION_NEXT  = "com.mwijay.ACTION_NEXT";
    public static final String ACTION_PREV  = "com.mwijay.ACTION_PREV";
    public static final String ACTION_LIKE  = "com.mwijay.ACTION_LIKE";
    public static final String ACTION_STOP  = "com.mwijay.ACTION_STOP";

    public static final String EXTRA_TITLE      = "title";
    public static final String EXTRA_ARTIST     = "artist";
    public static final String EXTRA_ALBUM      = "album";
    public static final String EXTRA_ARTWORK    = "artwork";
    public static final String EXTRA_IS_PLAYING = "isPlaying";
    public static final String EXTRA_IS_LIKED   = "isLiked";
    public static final String EXTRA_DURATION   = "duration";   // milliseconds
    public static final String EXTRA_POSITION   = "position";   // milliseconds

    private MediaSessionCompat mediaSession = null;
    private final ExecutorService artworkExecutor = Executors.newSingleThreadExecutor();

    private String currentTitle   = "";
    private String currentArtist  = "";
    private String currentAlbum   = "";
    private String currentArtwork = "";
    private boolean isPlaying     = false;
    private boolean isLiked       = false;
    private long duration         = 0L;
    private long position         = 0L;
    private Bitmap currentBitmap  = null;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        setupMediaSession();
        // Start foreground service immediately with a default stub notification to satisfy OS startup rules
        rebuildNotification();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            // OS restarted the service (e.g. system low memory recovery). Must call startForeground immediately.
            rebuildNotification();
        } else {
            handleIntent(intent);
        }
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
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
                    Intent broadcast = new Intent("com.mwijay.MEDIA_ACTION");
                    broadcast.putExtra("action", action);
                    sendBroadcast(broadcast);

                    switch (action) {
                        case ACTION_PLAY:
                            isPlaying = true;
                            rebuildNotification();
                            break;
                        case ACTION_PAUSE:
                            isPlaying = false;
                            rebuildNotification();
                            break;
                        case ACTION_LIKE:
                            isLiked = !isLiked;
                            rebuildNotification();
                            break;
                        case ACTION_STOP:
                            isPlaying = false;
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

        currentTitle   = intent.hasExtra(EXTRA_TITLE)   ? intent.getStringExtra(EXTRA_TITLE)   : currentTitle;
        currentArtist  = intent.hasExtra(EXTRA_ARTIST)  ? intent.getStringExtra(EXTRA_ARTIST)  : currentArtist;
        currentAlbum   = intent.hasExtra(EXTRA_ALBUM)   ? intent.getStringExtra(EXTRA_ALBUM)   : currentAlbum;
        duration       = intent.getLongExtra(EXTRA_DURATION, duration);
        position       = intent.getLongExtra(EXTRA_POSITION, position);
        isPlaying      = intent.getBooleanExtra(EXTRA_IS_PLAYING, isPlaying);
        isLiked        = intent.getBooleanExtra(EXTRA_IS_LIKED, isLiked);

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
        mediaSession = new MediaSessionCompat(this, "MwijaySession");
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
        });

        mediaSession.setFlags(
            MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS |
            MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS
        );
    }

    private void broadcastAction(String action) {
        sendBroadcast(new Intent("com.mwijay.MEDIA_ACTION").putExtra("action", action));
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Mwijay Music Player",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Music playback controls & now playing info");
            channel.setShowBadge(false);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
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
            // Catch gracefully to avoid ForegroundServiceStartNotAllowedException crashes when starting from background
        }
    }

    private Notification buildNotification() {
        PendingIntent openApp = PendingIntent.getActivity(
            this, 0,
            getPackageManager().getLaunchIntentForPackage(getPackageName()),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        valActionPi actionPi = new valActionPi();
        
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(currentTitle.isEmpty() ? "Mwijay Music" : currentTitle)
            .setContentText(currentArtist)
            .setSubText(currentAlbum.isEmpty() ? null : currentAlbum)
            .setSmallIcon(R.drawable.ic_notification)
            .setLargeIcon(currentBitmap)
            .setContentIntent(openApp)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOnlyAlertOnce(true)
            .setOngoing(isPlaying)
            .setShowWhen(false)
            .setStyle(
                new androidx.media.app.NotificationCompat.MediaStyle()
                    .setMediaSession(mediaSession != null ? mediaSession.getSessionToken() : null)
                    .setShowActionsInCompactView(0, 1, 2)
            );

        builder.addAction(new NotificationCompat.Action(R.drawable.ic_prev, "Previous", actionPi.get(ACTION_PREV, 1)));
        builder.addAction(new NotificationCompat.Action(
            isPlaying ? R.drawable.ic_pause : R.drawable.ic_play,
            isPlaying ? "Pause" : "Play",
            actionPi.get(isPlaying ? ACTION_PAUSE : ACTION_PLAY, 2)
        ));
        builder.addAction(new NotificationCompat.Action(R.drawable.ic_next, "Next", actionPi.get(ACTION_NEXT, 3)));
        builder.addAction(new NotificationCompat.Action(
            isLiked ? R.drawable.ic_heart_filled : R.drawable.ic_heart,
            isLiked ? "Unlike" : "Like",
            actionPi.get(ACTION_LIKE, 4)
        ));

        return builder.build();
    }

    private class valActionPi {
        PendingIntent get(String action, int code) {
            Intent intent = new Intent(MusicService.this, MusicService.class);
            intent.setAction(action);
            return PendingIntent.getService(
                MusicService.this, code,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
        }
    }

    private void updateMediaSessionState() {
        MediaSessionCompat session = mediaSession;
        if (session == null) return;

        session.setMetadata(
            new MediaMetadataCompat.Builder()
                .putString(MediaMetadataCompat.METADATA_KEY_TITLE,  currentTitle)
                .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, currentArtist)
                .putString(MediaMetadataCompat.METADATA_KEY_ALBUM,  currentAlbum)
                .putLong(MediaMetadataCompat.METADATA_KEY_DURATION, duration)
                .putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, currentBitmap)
                .build()
        );

        session.setPlaybackState(
            new PlaybackStateCompat.Builder()
                .setActions(
                    PlaybackStateCompat.ACTION_PLAY |
                    PlaybackStateCompat.ACTION_PAUSE |
                    PlaybackStateCompat.ACTION_PLAY_PAUSE |
                    PlaybackStateCompat.ACTION_SKIP_TO_NEXT |
                    PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS |
                    PlaybackStateCompat.ACTION_SEEK_TO
                )
                .setState(
                    isPlaying ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED,
                    position,
                    isPlaying ? 1.0f : 0.0f
                )
                .build()
        );
    }

    private void loadArtworkAsync() {
        final String artworkUrl = currentArtwork;
        if (artworkUrl.isEmpty()) return;

        artworkExecutor.submit(() -> {
            try {
                URL url = new URL(artworkUrl);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setConnectTimeout(6000);
                conn.setReadTimeout(6000);
                conn.setRequestProperty("User-Agent", "MwijayMusicApp/1.0");
                conn.connect();

                InputStream inputStream = conn.getInputStream();
                Bitmap bitmap = BitmapFactory.decodeStream(inputStream);
                conn.disconnect();

                new Handler(Looper.getMainLooper()).post(() -> {
                    if (artworkUrl.equals(currentArtwork)) {
                        currentBitmap = bitmap;
                        rebuildNotification();
                        updateMediaSessionState();
                    }
                });
            } catch (Exception e) {
                // Ignore download errors silently
            }
        });
    }
}
