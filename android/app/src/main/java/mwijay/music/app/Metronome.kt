package mwijay.music.app

import android.media.AudioAttributes
import android.media.SoundPool
import android.os.Handler
import android.os.Looper

class Metronome(context: android.content.Context) {
    private var bpm: Int = 120
    private var isRunning = false
    private val handler = Handler(Looper.getMainLooper())
    
    private val soundPool = SoundPool.Builder()
        .setMaxStreams(1)
        .setAudioAttributes(
            AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build()
        )
        .build()
        
    private var tickSoundId: Int = -1
    
    init {
        // You would need a tick sound in res/raw/tick.wav
        // For now, we'll try to load one or just use a placeholder logic
        // tickSoundId = soundPool.load(context, R.raw.tick, 1)
    }

    fun setBpm(newBpm: Int) {
        bpm = newBpm
    }

    fun start() {
        if (isRunning) return
        isRunning = true
        tick()
    }

    fun stop() {
        isRunning = false
        handler.removeCallbacksAndMessages(null)
    }

    private fun tick() {
        if (!isRunning) return
        
        // Play sound if loaded
        if (tickSoundId != -1) {
            soundPool.play(tickSoundId, 1f, 1f, 1, 0, 1f)
        }
        
        val interval = (60000 / bpm).toLong()
        handler.postDelayed({ tick() }, interval)
    }
}
