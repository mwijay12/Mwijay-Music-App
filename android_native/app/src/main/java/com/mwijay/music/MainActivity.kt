package com.mwijay.music

import com.getcapacitor.BridgeActivity

/**
 * MainActivity.kt
 *
 * App entry point. Registers the MusicPlugin Capacitor bridge BEFORE
 * calling super.onCreate() so it's available from the first WebView load.
 */
class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: android.os.Bundle?) {
        // IMPORTANT: Register custom plugins before super.onCreate()
        registerPlugin(MusicPlugin::class.java)
        super.onCreate(savedInstanceState)
    }
}
