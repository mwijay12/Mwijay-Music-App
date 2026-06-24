package mwijay.music.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "MusicControl")
public class MusicPlugin extends Plugin {

    private BroadcastReceiver mediaActionReceiver = null;

    @Override
    public void load() {
        mediaActionReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context ctx, Intent intent) {
                String action = intent.getStringExtra("action");
                if (action == null) return;
                long position = intent.getLongExtra("position", -1L);

                JSObject data = new JSObject();
                data.put("action", action);
                if (position >= 0) {
                    data.put("position", position);
                }

                notifyListeners("mediaAction", data);
            }
        };

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                getContext().registerReceiver(
                    mediaActionReceiver,
                    new IntentFilter("com.mwijay.MEDIA_ACTION"),
                    Context.RECEIVER_NOT_EXPORTED
                );
            } else {
                getContext().registerReceiver(
                    mediaActionReceiver,
                    new IntentFilter("com.mwijay.MEDIA_ACTION")
                );
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @PluginMethod
    public void updateNowPlaying(PluginCall call) {
        Intent intent = new Intent(getContext(), MusicService.class);
        intent.putExtra(MusicService.EXTRA_TITLE,      call.getString("title",  ""));
        intent.putExtra(MusicService.EXTRA_ARTIST,     call.getString("artist", ""));
        intent.putExtra(MusicService.EXTRA_ALBUM,      call.getString("album",  ""));
        intent.putExtra(MusicService.EXTRA_ARTWORK,    call.getString("artwork",""));
        intent.putExtra(MusicService.EXTRA_IS_PLAYING, call.getBoolean("isPlaying", false));
        intent.putExtra(MusicService.EXTRA_IS_LIKED,   call.getBoolean("isLiked",   false));
        intent.putExtra(MusicService.EXTRA_TYPE,       call.getString("type", "music"));
        intent.putExtra(MusicService.EXTRA_IS_LIVE,    call.getBoolean("isLive", false));
        
        Long duration = call.getLong("duration");
        intent.putExtra(MusicService.EXTRA_DURATION,   duration != null ? duration : 0L);
        
        Long position = call.getLong("position");
        intent.putExtra(MusicService.EXTRA_POSITION,   position != null ? position : 0L);

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                getContext().startForegroundService(intent);
            } else {
                getContext().startService(intent);
            }
        } catch (Exception e) {
            e.printStackTrace();
            call.reject("Failed to start foreground service: " + e.getMessage());
            return;
        }

        call.resolve();
    }

    @PluginMethod
    public void stopService(PluginCall call) {
        getContext().stopService(new Intent(getContext(), MusicService.class));
        call.resolve();
    }

    @Override
    public void handleOnDestroy() {
        if (mediaActionReceiver != null) {
            try {
                getContext().unregisterReceiver(mediaActionReceiver);
            } catch (Exception e) {
                // ignored
            }
        }
        mediaActionReceiver = null;
    }
}
