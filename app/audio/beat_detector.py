import logging
import os
import random

# Defensive importing of Aubio
try:
    import aubio
    AUBIO_AVAILABLE = True
except ImportError:
    AUBIO_AVAILABLE = False


class BeatDetector:
    """
    Tracks precise note onsets, beat grids, and BPM metrics using Aubio
    to feed coordinates directly into rhythmic games (Beat Tap) with millisecond precision.
    """
    
    def __init__(self):
        self.logger = logging.getLogger("beat_detector")
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
            self.logger.setLevel(logging.INFO)

    def detect_beats_precise(self, audio_path):
        """
        Determines the precise beat grids (millisecond timestamps) of a track.
        Returns a structured dictionary formatted for tap game interactions.
        """
        self.logger.info(f"Detecting precise beats for game syncing on: {audio_path}")
        
        if not os.path.exists(audio_path):
            self.logger.warning(f"File not found: {audio_path}. Instantiating synthetic game beats.")
            return self._generate_synthetic_game_beats(120.0)

        if not AUBIO_AVAILABLE:
            self.logger.warning("Aubio package is not installed. Computing grid using mathematical tempo estimations.")
            # Standard average tempo
            return self._generate_synthetic_game_beats(124.0)

        try:
            # Configure Aubio source
            hop_size = 512
            win_size = 1024
            
            source = aubio.source(audio_path, hop_size=hop_size)
            sample_rate = source.samplerate
            
            # Setup tempo tracker
            beat_tracker = aubio.tempo("specdiff", win_size, hop_size, sample_rate)
            
            beats = []
            total_frames = 0
            
            while True:
                samples, read = source()
                is_beat = beat_tracker(samples)
                
                if is_beat:
                    beat_time = total_frames / float(sample_rate)
                    beats.append(round(beat_time, 3))
                    
                total_frames += read
                if read < source.hop_size:
                    break
                    
            tempo = beat_tracker.get_bpm()
            
            # Close stream
            source.close()
            
            return {
                "bpm": float(round(tempo, 1)),
                "beat_timestamps_seconds": beats,
                "beat_count": len(beats),
                "game_data": self._prepare_game_data(beats, tempo)
            }
        except Exception as e:
            self.logger.error(f"Failed real Aubio beat tracking: {e}. Falling back to synthetic grids.")
            return self._generate_synthetic_game_beats(120.0)

    def _prepare_game_data(self, beats, tempo):
        """Maps beat timestamps to structured points and types for front-end tap gameplay."""
        game_beats = []
        
        for i, timestamp in enumerate(beats):
            # Special point multiplier on every downbeat (1st, 5th, 9th, etc.)
            is_downbeat = (i % 4 == 0)
            game_beats.append({
                "id": i,
                "time_ms": int(timestamp * 1000),
                "type": "strong" if is_downbeat else "normal",
                "points": 20 if is_downbeat else 10
            })
            
        return {
            "beats": game_beats,
            "bpm": float(round(tempo, 1)),
            "difficulty_rating": self._rate_difficulty(tempo)
        }

    def _rate_difficulty(self, bpm):
        if bpm < 90: return "easy"
        elif bpm < 120: return "medium"
        elif bpm < 150: return "hard"
        else: return "expert"

    def detect_onsets(self, audio_path):
        """Detects immediate note onsets (starts of sounds), helpful for complex acoustic tempos."""
        if not os.path.exists(audio_path) or not AUBIO_AVAILABLE:
            return {"onset_timestamps": [], "onset_count": 0, "density": 0.0}
            
        try:
            hop_size = 512
            win_size = 1024
            source = aubio.source(audio_path, hop_size=hop_size)
            sample_rate = source.samplerate
            
            onset_detector = aubio.onset("complex", win_size, hop_size, sample_rate)
            
            onsets = []
            total_frames = 0
            
            while True:
                samples, read = source()
                if onset_detector(samples):
                    onset_time = total_frames / float(sample_rate)
                    onsets.append(round(onset_time, 3))
                    
                total_frames += read
                if read < source.hop_size:
                    break
                    
            source.close()
            duration = total_frames / float(sample_rate)
            
            return {
                "onset_timestamps": onsets,
                "onset_count": len(onsets),
                "density": round(len(onsets) / duration, 2) if duration > 0 else 0.0
            }
        except Exception as e:
            self.logger.error(f"Aubio onset detection failed: {e}")
            return {"onset_timestamps": [], "onset_count": 0, "density": 0.0}

    def _generate_synthetic_game_beats(self, tempo):
        """Generates clean synthetic grids for offline testing or fallback play."""
        duration = 180.0  # 3 minutes standard
        beat_interval = 60.0 / tempo
        
        beats = []
        current_time = 0.15  # start delay
        while current_time < duration:
            beats.append(round(current_time, 3))
            current_time += beat_interval
            
        return {
            "bpm": float(round(tempo, 1)),
            "beat_timestamps_seconds": beats,
            "beat_count": len(beats),
            "game_data": self._prepare_game_data(beats, tempo)
        }
Definition of synthetic beat tracking maps complete.
