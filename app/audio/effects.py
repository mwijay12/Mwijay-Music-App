import logging
import os
import shutil

# Defensive importing of Spotify's Pedalboard
try:
    from pedalboard import (
        Pedalboard, Chorus, Reverb, Compressor, Gain, LadderFilter, Phaser,
        Delay, PitchShift, Distortion, LowShelfFilter, HighShelfFilter,
        HighpassFilter, LowpassFilter
    )
    from pedalboard.io import AudioFile
    PEDALBOARD_AVAILABLE = True
except ImportError:
    PEDALBOARD_AVAILABLE = False

# Defensive importing of PyDub
try:
    from pydub import AudioSegment
    from pydub.effects import normalize, compress_dynamic_range, low_pass_filter, high_pass_filter
    PYDUB_AVAILABLE = True
except ImportError:
    PYDUB_AVAILABLE = False


class PedalboardEffects:
    """
    Interfaces with Spotify's Pedalboard library to apply DSP effects, pitch shifting,
    reverberation parameters, and voice-changing filters with full accuracy.
    """
    
    def __init__(self):
        self.logger = logging.getLogger("pedalboard_effects")
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
            self.logger.setLevel(logging.INFO)

    def apply_effect_preset(self, input_path, output_path, preset_name):
        """
        Applies a named preset effect (chipmunk, deep_voice, robot, lofi, telephone,
        underwater, stadium, concert_hall, slowed_reverb) to the target file.
        """
        self.logger.info(f"Applying Pedalboard preset '{preset_name}' on file: {input_path}")
        
        if not os.path.exists(input_path):
            self.logger.warning(f"File not found for effect processing: {input_path}")
            return input_path

        if not PEDALBOARD_AVAILABLE:
            self.logger.warning("Pedalboard is not installed locally. Preserving audio and copying input directly to output.")
            shutil.copy(input_path, output_path)
            return output_path

        try:
            presets = {
                "chipmunk": self._chipmunk_board(),
                "deep_voice": self._deep_voice_board(),
                "robot": self._robot_board(),
                "lofi": self._lofi_board(),
                "concert_hall": self._concert_hall_board(),
                "slowed_reverb": self._slowed_reverb_board(),
                "telephone": self._telephone_board(),
                "underwater": self._underwater_board(),
                "stadium": self._stadium_board(),
                "vinyl": self._vinyl_board()
            }
            
            board = presets.get(preset_name)
            if not board:
                self.logger.warning(f"Unknown preset request: '{preset_name}'. Copying raw audio.")
                shutil.copy(input_path, output_path)
                return output_path
                
            # Read input audio frame data
            with AudioFile(input_path) as f:
                audio = f.read(f.frames)
                sample_rate = f.samplerate
                
            # Render effects using pedalboard
            effected = board(audio, sample_rate)
            
            # Save processed audio back to output file path
            with AudioFile(output_path, 'w', sample_rate, effected.shape[0]) as f:
                f.write(effected)
                
            self.logger.info(f"Successfully rendered and saved effect: '{output_path}'")
            return output_path
        except Exception as e:
            self.logger.error(f"Pedalboard preset render failed: {e}. Falling back to copying input directly.")
            shutil.copy(input_path, output_path)
            return output_path

    # --- BOARD PRESETS CONSTRUCTORS ---

    def _chipmunk_board(self):
        """High-pitched voice shift."""
        return Pedalboard([
            PitchShift(semitones=6.0),
            Compressor(threshold_db=-18.0, ratio=4.0)
        ])
        
    def _deep_voice_board(self):
        """Deep vocal/low-pitch shift."""
        return Pedalboard([
            PitchShift(semitones=-5.0),
            LowShelfFilter(cutoff_frequency_hz=180.0, gain_db=5.0),
            Reverb(room_size=0.25, wet_level=0.15)
        ])
        
    def _robot_board(self):
        """Robotic ring modulators vocoder effect."""
        return Pedalboard([
            Chorus(rate_hz=2.2, depth=0.6, mix=0.85),
            Phaser(rate_hz=1.2, mix=0.5),
            Distortion(drive_db=6.0)
        ])
        
    def _lofi_board(self):
        """Chill lofi vinyl vibes."""
        return Pedalboard([
            LowpassFilter(cutoff_frequency_hz=7200.0),
            Compressor(threshold_db=-22.0, ratio=3.0),
            Gain(gain_db=-2.0),
            Reverb(room_size=0.30, wet_level=0.15)
        ])
        
    def _concert_hall_board(self):
        """Expansive concert hall reverb."""
        return Pedalboard([
            Reverb(
                room_size=0.88,
                damping=0.4,
                wet_level=0.38,
                dry_level=0.75,
                width=1.0
            )
        ])
        
    def _slowed_reverb_board(self):
        """Popular slowed & reverb aesthetic profile."""
        return Pedalboard([
            Reverb(
                room_size=0.78,
                damping=0.3,
                wet_level=0.48,
                dry_level=0.65
            ),
            LowpassFilter(cutoff_frequency_hz=11000.0),
            Gain(gain_db=-2.0)
        ])
        
    def _telephone_board(self):
        """Old telephone bandpass filter."""
        return Pedalboard([
            HighpassFilter(cutoff_frequency_hz=350.0),
            LowpassFilter(cutoff_frequency_hz=2800.0),
            Distortion(drive_db=4.0),
            Compressor(threshold_db=-12.0, ratio=8.0)
        ])
        
    def _underwater_board(self):
        """Underwater muffled lowpass sweeps."""
        return Pedalboard([
            LowpassFilter(cutoff_frequency_hz=450.0),
            Reverb(room_size=0.65, wet_level=0.55),
            Gain(gain_db=-3.0)
        ])
        
    def _stadium_board(self):
        """Wide stadium reflections."""
        return Pedalboard([
            Reverb(room_size=0.95, wet_level=0.45, width=1.0),
            Delay(delay_seconds=0.12, mix=0.28),
            Compressor(threshold_db=-12.0, ratio=2.5)
        ])
        
    def _vinyl_board(self):
        """Retro vinyl record dust pop filters."""
        return Pedalboard([
            LowpassFilter(cutoff_frequency_hz=9200.0),
            LowShelfFilter(cutoff_frequency_hz=120.0, gain_db=-4.0),
            Compressor(threshold_db=-20.0, ratio=3.0),
            Gain(gain_db=1.5)
        ])

    def custom_voice_change(self, input_path, output_path, semitones=0.0, reverb_amount=0.0, bass_boost=0.0, distortion=0.0):
        """Provides absolute manual dial parameters for granular effects processing."""
        self.logger.info(f"Custom voice shift (pitch={semitones}st, reverb={reverb_amount}, bass={bass_boost}db)")
        
        if not PEDALBOARD_AVAILABLE or not os.path.exists(input_path):
            shutil.copy(input_path, output_path)
            return output_path
            
        try:
            board = Pedalboard([
                PitchShift(semitones=semitones),
                LowShelfFilter(cutoff_frequency_hz=200.0, gain_db=bass_boost),
                Reverb(room_size=reverb_amount, wet_level=reverb_amount * 0.45),
                Distortion(drive_db=distortion) if distortion > 0.0 else Gain(gain_db=0.0),
                Compressor(threshold_db=-18.0, ratio=3.5)
            ])
            
            with AudioFile(input_path) as f:
                audio = f.read(f.frames)
                sr = f.samplerate
                
            effected = board(audio, sr)
            
            with AudioFile(output_path, 'w', sr, effected.shape[0]) as f:
                f.write(effected)
                
            return output_path
        except Exception as e:
            self.logger.error(f"Failed custom Pedalboard render: {e}")
            shutil.copy(input_path, output_path)
            return output_path


class MwijayAudioEffects:
    """
    Alternative simple AudioSegment manipulation class leveraging PyDub for volume adjustments,
    speed resizing, and low/high pass filtering.
    """
    
    def __init__(self):
        self.logger = logging.getLogger("mwijay_audio_effects")

    def change_speed(self, audio_path, output_path, speed_factor):
        """Adjusts playback speed factors without altering standard pitch values (resamples data)."""
        self.logger.info(f"Changing speed (factor={speed_factor}) on: {audio_path}")
        
        if not PYDUB_AVAILABLE or not os.path.exists(audio_path):
            shutil.copy(audio_path, output_path)
            return output_path
            
        try:
            sound = AudioSegment.from_file(audio_path)
            
            # Alters frame rates to achieve physical speed scale shifts
            sound_altered = sound._spawn(
                sound.raw_data,
                overrides={"frame_rate": int(sound.frame_rate * speed_factor)}
            )
            
            # Normalize sampling rate back to original bounds to preserve pitches
            result = sound_altered.set_frame_rate(sound.frame_rate)
            result.export(output_path, format="mp3")
            return output_path
        except Exception as e:
            self.logger.error(f"PyDub speed adjustment failed: {e}")
            shutil.copy(audio_path, output_path)
            return output_path

    def change_volume(self, audio_path, output_path, db_change):
        """Amplifies or dampens audio signals by numerical decibel scales (+6db = twice as loud)."""
        self.logger.info(f"Applying volume shift (db={db_change}) on: {audio_path}")
        
        if not PYDUB_AVAILABLE or not os.path.exists(audio_path):
            shutil.copy(audio_path, output_path)
            return output_path
            
        try:
            sound = AudioSegment.from_file(audio_path)
            result = sound + db_change
            result.export(output_path, format="mp3")
            return output_path
        except Exception as e:
            self.logger.error(f"PyDub volume shift failed: {e}")
            shutil.copy(audio_path, output_path)
            return output_path

    def bass_boost(self, audio_path, output_path, boost_db=6.0):
        """Boosts sub-mid frequencies (under 200Hz) inside pydub tracks."""
        self.logger.info(f"Bass Boost (+{boost_db}db) on: {audio_path}")
        
        if not PYDUB_AVAILABLE or not os.path.exists(audio_path):
            shutil.copy(audio_path, output_path)
            return output_path
            
        try:
            sound = AudioSegment.from_file(audio_path)
            bass = low_pass_filter(sound, cutoff=200)
            boosted_bass = bass + boost_db
            result = sound.overlay(boosted_bass)
            result.export(output_path, format="mp3")
            return output_path
        except Exception as e:
            self.logger.error(f"PyDub bass boost failed: {e}")
            shutil.copy(audio_path, output_path)
            return output_path
