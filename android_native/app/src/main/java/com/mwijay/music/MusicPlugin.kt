package com.mwijay.music

import android.content.*
import android.os.Build
import com.getcapacitor.*
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * MusicPlugin.kt
 *
 * Capacitor bridge between JavaScript (TypeScript) and MusicService.
 *
 * JS calls updateNowPlaying()  → starts/updates the foreground service.
 * Service broadcasts button events → JS receives them via addListener('mediaAction').
 */
@CapacitorPlugin(name = "MusicControl")
class MusicPlugin : Plugin() {

    private var mediaActionReceiver: BroadcastReceiver? = null

    // ── Plugin lifecycle ───────────────────────────────────────────────────

    override fun load() {
        // Register a broadcast receiver to forward service events → JavaScript
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

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            // Android 13+ requires explicit export flag for runtime-registered receivers
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
    }

    // ── Plugin methods (called from TypeScript) ────────────────────────────

    /** Push current track state to the foreground service notification. */
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

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent)
        } else {
            context.startService(intent)
        }

        call.resolve()
    }

    /** Stop the foreground service (e.g. when app is closed or playback ends). */
    @PluginMethod
    fun stopService(call: PluginCall) {
        context.stopService(Intent(context, MusicService::class.java))
        call.resolve()
    }

    // ── Cleanup ────────────────────────────────────────────────────────────

    override fun handleOnDestroy() {
        mediaActionReceiver?.let {
            try { context.unregisterReceiver(it) } catch (_: Exception) {}
        }
        mediaActionReceiver = null
    }
}
