package mwijay.music.app

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.util.Log
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback

@CapacitorPlugin(
    name = "MediaControl",
    permissions = [
        Permission(
            alias = "storage",
            strings = [
                Manifest.permission.READ_EXTERNAL_STORAGE
            ]
        ),
        Permission(
            alias = "media",
            strings = [
                Manifest.permission.READ_MEDIA_AUDIO,
                Manifest.permission.READ_MEDIA_VIDEO,
                Manifest.permission.READ_MEDIA_IMAGES
            ]
        ),
        Permission(
            alias = "notifications",
            strings = [
                Manifest.permission.POST_NOTIFICATIONS
            ]
        ),
        Permission(
            alias = "bluetooth",
            strings = [
                Manifest.permission.BLUETOOTH_CONNECT,
                Manifest.permission.BLUETOOTH_SCAN
            ]
        )
    ]
)
class MediaPlugin : Plugin() {

    private var receiver: BroadcastReceiver? = null
    private lateinit var scanner: MediaScanner

    override fun load() {
        Log.d("MediaControl", "MediaPlugin loaded and registering broadcast receiver")
        scanner = MediaScanner(context)
        receiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                val action = intent?.getStringExtra("action") ?: return
                val position = intent.getLongExtra("position", -1L)
                
                val data = JSObject()
                data.put("action", action)
                if (position != -1L) {
                    data.put("position", position)
                }
                
                Log.d("MediaControl", "Broadcast received from service: $action, position: $position")
                notifyListeners("mediaAction", data)
            }
        }

        val filter = IntentFilter(MediaPlaybackService.BROADCAST_ACTION)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            context.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            context.registerReceiver(receiver, filter)
        }
    }

    @PluginMethod
    fun getMediaPermissionsStatus(call: PluginCall) {
        val result = JSObject()
        result.put("media", getPermissionState("media"))
        result.put("storage", getPermissionState("storage"))
        result.put("notifications", getPermissionState("notifications"))
        result.put("bluetooth", getPermissionState("bluetooth"))
        call.resolve(result)
    }

    @PluginMethod
    fun requestMediaPermissions(call: PluginCall) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            requestPermissionForAlias("media", call, "permissionsCallback")
        } else {
            requestPermissionForAlias("storage", call, "permissionsCallback")
        }
    }

    @PermissionCallback
    fun permissionsCallback(call: PluginCall) {
        getMediaPermissionsStatus(call)
    }

    @PluginMethod
    fun scanMedia(call: PluginCall) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (getPermissionState("media") != PermissionState.GRANTED) {
                requestPermissionForAlias("media", call, "mediaPermissionCallback")
            } else {
                performScan(call)
            }
        } else {
            if (getPermissionState("storage") != PermissionState.GRANTED) {
                requestPermissionForAlias("storage", call, "mediaPermissionCallback")
            } else {
                performScan(call)
            }
        }
    }

    @PermissionCallback
    fun mediaPermissionCallback(call: PluginCall) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (getPermissionState("media") == PermissionState.GRANTED) {
                performScan(call)
            } else {
                call.reject("Permission denied to read media")
            }
        } else {
            if (getPermissionState("storage") == PermissionState.GRANTED) {
                performScan(call)
            } else {
                call.reject("Permission denied to read storage")
            }
        }
    }

    private fun performScan(call: PluginCall) {
        try {
            Log.d("MediaControl", "Performing media scan...")
            val audio = scanner.scanAudio()
            val videos = scanner.scanVideo()
            
            val result = JSObject()
            result.put("audio", audio)
            result.put("videos", videos)
            Log.d("MediaControl", "Scan complete: ${audio.length()} audio, ${videos.length()} videos found")
            call.resolve(result)
        } catch (e: Exception) {
            Log.e("MediaControl", "Scan failed", e)
            call.reject("Failed to scan media", e)
        }
    }

    @PluginMethod
    fun startService(call: PluginCall) {
        update(call)
    }

    @PluginMethod
    fun update(call: PluginCall) {
        val isPlaying = call.getBoolean("isPlaying", false)
        Log.d("MediaControl", "Update called: title=${call.getString("title")}, isPlaying=$isPlaying")
        
        val intent = Intent(context, MediaPlaybackService::class.java).apply {
            putExtra("type", call.getString("type", "music"))
            putExtra("title", call.getString("title", "Unknown"))
            putExtra("artist", call.getString("artist", "Unknown"))
            putExtra("album", call.getString("album", ""))
            putExtra("artwork", call.getString("artwork", ""))
            putExtra("isPlaying", isPlaying)
            putExtra("isLiked", call.getBoolean("isLiked", false))
            putExtra("isLive", call.getBoolean("isLive", false))
            
            // Map duration and position as Long, defaults to 0L
            val durationVal = call.getLong("duration") ?: 0L
            val positionVal = call.getLong("position") ?: 0L
            putExtra("duration", durationVal)
            putExtra("position", positionVal)
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
            call.resolve()
        } catch (e: Exception) {
            Log.e("MediaControl", "Failed to start service", e)
            call.reject("Failed to start service", e)
        }
    }

    @PluginMethod
    fun stop(call: PluginCall) {
        val intent = Intent(context, MediaPlaybackService::class.java).apply {
            action = MediaPlaybackService.ACTION_STOP
        }
        context.startService(intent)
        call.resolve()
    }

    @PluginMethod
    fun requestBatteryOptimizationExemption(call: PluginCall) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
            val packageName = context.packageName
            if (!pm.isIgnoringBatteryOptimizations(packageName)) {
                val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)
                intent.data = Uri.parse("package:$packageName")
                context.startActivity(intent)
            }
        }
        call.resolve()
    }

    override fun handleOnDestroy() {
        receiver?.let { 
            try {
                context.unregisterReceiver(it) 
            } catch (e: Exception) {
                // Ignore unregistered receiver exceptions
            }
        }
        super.handleOnDestroy()
    }
}
