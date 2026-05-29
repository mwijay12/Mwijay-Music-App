package mwijay.music.app

import android.content.*
import android.os.Build
import com.getcapacitor.*
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "MusicControl")
class MusicPlugin : Plugin() {

    private var mediaActionReceiver: BroadcastReceiver? = null

    override fun load() {
        mediaActionReceiver = object : BroadcastReceiver() {
            override fun onReceive(ctx: Context, intent: Intent) {
                val action   = intent.getStringExtra("action") ?: return
                val position = intent.getLongExtra("position", -1L)

                val data = JSObject()
                data.put("action", action)
                if (position >= 0) data.put("position", position)

                notifyListeners("mediaAction", data)
            }
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                context.registerReceiver(
                    mediaActionReceiver,
                    IntentFilter("com.mwijay.MEDIA_ACTION"),
                    Context.RECEIVER_NOT_EXPORTED
                )
            } else {
                context.registerReceiver(
                    mediaActionReceiver,
                    IntentFilter("com.mwijay.MEDIA_ACTION")
                )
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @PluginMethod
    fun updateNowPlaying(call: PluginCall) {
        val intent = Intent(context, MusicService::class.java).apply {
            putExtra(MusicService.EXTRA_TITLE,      call.getString("title",  ""))
            putExtra(MusicService.EXTRA_ARTIST,     call.getString("artist", ""))
            putExtra(MusicService.EXTRA_ALBUM,      call.getString("album",  ""))
            putExtra(MusicService.EXTRA_ARTWORK,    call.getString("artwork",""))
            putExtra(MusicService.EXTRA_IS_PLAYING, call.getBoolean("isPlaying", false) ?: false)
            putExtra(MusicService.EXTRA_IS_LIKED,   call.getBoolean("isLiked",   false) ?: false)
            putExtra(MusicService.EXTRA_DURATION,   call.getLong("duration") ?: 0L)
            putExtra(MusicService.EXTRA_POSITION,   call.getLong("position") ?: 0L)
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        } catch (e: Exception) {
            e.printStackTrace()
            call.reject("Failed to start foreground service: ${e.message}")
            return
        }

        call.resolve()
    }

    @PluginMethod
    fun stopService(call: PluginCall) {
        context.stopService(Intent(context, MusicService::class.java))
        call.resolve()
    }

    override fun handleOnDestroy() {
        mediaActionReceiver?.let {
            try { context.unregisterReceiver(it) } catch (_: Exception) {}
        }
        mediaActionReceiver = null
    }
}
