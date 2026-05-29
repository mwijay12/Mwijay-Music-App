import logging
import os
import math
import random

# Defensive importing of librosa and numpy
try:
    import librosa
    import numpy as np
    LIBROSA_AVAILABLE = True
except ImportError:
    LIBROSA_AVAILABLE = False
    # Mock fallback arrays
    class np_mock:
        @staticmethod
        def mean(arr, axis=None):
            if not arr: return 0.0
            return sum(arr) / len(arr)
        @staticmethod
        def argmax(arr):
            return arr.index(max(arr)) if arr else 0
        @staticmethod
        def corrcoef(a, b):
            return [[1.0, 0.5], [0.5, 1.0]]
    np = np_mock


class MwijayAudioAnalyzer:
    """
    Performs high-fidelity audio spectrum, tempo, zero-crossing, and chord key
    analysis using Librosa, with a robust fallback estimator for offline testing.
    """
    
    def __init__(self):
        self.logger = logging.getLogger("audio_analyzer")
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
            self.logger.setLevel(logging.INFO)

    def analyze_song(self, audio_file_path):
        """
        Extracts BPM, energy, spectral brightness, zero-crossing percussive rates,
        tonal keys, danceability index, and rule-based mood classifications from audio.
        """
        self.logger.info(f"Analyzing audio signatures for file: {audio_file_path}")
        
        if not os.path.exists(audio_file_path):
            self.logger.warning(f"File not found: {audio_file_path}. Generating synthetic audio metadata.")
            return self._generate_synthetic_analysis()

        if not LIBROSA_AVAILABLE:
            self.logger.warning("Librosa package is not compiled locally. Using heuristic estimators.")
            return self._generate_synthetic_analysis()

        try:
            import numpy as real_np  # use actual numpy inside compile check
            
            # Load first 30 seconds to perform swift, high-fidelity analyses
            y, sr = librosa.load(audio_file_path, duration=30)
            
            # 1. TEMPO / BPM
            tempo, beats = librosa.beat.beat_track(y=y, sr=sr)
            tempo_val = float(tempo[0]) if isinstance(tempo, (list, real_np.ndarray)) else float(tempo)
            
            # 2. ENERGY (RMS Energy normalized)
            energy = float(real_np.mean(librosa.feature.rms(y=y)))
            energy_normalized = min(energy * 8.0, 1.0)  # Normalize to 0-1 scale safely
            
            # 3. SPECTRAL BRIGHTNESS (Centroid)
            spectral_centroids = librosa.feature.spectral_centroid(y=y, sr=sr)
            brightness = float(real_np.mean(spectral_centroids))
            
            # 4. ZERO CROSSING RATE (Percussive Noisiness)
            zcr = librosa.feature.zero_crossing_rate(y)
            percussion_level = float(real_np.mean(zcr))
            
            # 5. MFCC (Tonal Fingerprinting / Constellation Vector)
            mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
            tonal_fingerprint = mfccs.mean(axis=1).tolist()
            
            # 6. CHROMA & KEY DETECTION
            chroma = librosa.feature.chroma_stft(y=y, sr=sr)
            keys = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
            key_index = int(real_np.argmax(real_np.mean(chroma, axis=1)))
            detected_key = keys[key_index]
            
            # 7. DANCEABILITY INDEX
            # Combination of tempo regularity and onset beat strength
            beat_strength = float(real_np.mean(librosa.onset.onset_strength(y=y, sr=sr)))
            danceability = min((beat_strength * tempo_val / 240.0), 1.0)
            
            # 8. VALENCE (Major vs Minor chord profile correlation)
            major_profile = real_np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
            minor_profile = real_np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
            
            chroma_mean = real_np.mean(chroma, axis=1)
            major_corr = float(real_np.corrcoef(chroma_mean, major_profile)[0,1])
            minor_corr = float(real_np.corrcoef(chroma_mean, minor_profile)[0,1])
            
            is_major = major_corr > minor_corr
            valence = 0.75 if is_major else 0.35
            
            return {
                "tempo_bpm": round(tempo_val, 1),
                "energy": round(energy_normalized, 3),
                "danceability": round(danceability, 3),
                "valence": round(valence, 3),
                "brightness": round(brightness, 2),
                "key": detected_key,
                "mode": "major" if is_major else "minor",
                "percussion_level": round(percussion_level, 4),
                "tonal_fingerprint": tonal_fingerprint,
                "tempo_category": self._tempo_category(tempo_val),
                "mood_estimate": self._estimate_mood(tempo_val, energy_normalized, valence, danceability)
            }
        except Exception as e:
            self.logger.error(f"Failed real Librosa analysis: {e}. Defaulting to synthetic estimators.")
            return self._generate_synthetic_analysis()

    def _tempo_category(self, bpm):
        if bpm < 70: return "very_slow"
        elif bpm < 100: return "slow"
        elif bpm < 120: return "medium"
        elif bpm < 140: return "fast"
        else: return "very_fast"
        
    def _estimate_mood(self, tempo, energy, valence, dance):
        """Standard audio parameter-mapping classification for moods."""
        if valence > 0.58 and energy > 0.58 and dance > 0.6:
            return "happy_energetic"
        elif valence > 0.58 and energy < 0.45:
            return "happy_chill"
        elif valence < 0.42 and energy > 0.58:
            return "angry_intense"
        elif valence < 0.42 and energy < 0.45:
            return "sad_melancholic"
        elif dance > 0.68 and tempo > 118:
            return "party_mode"
        else:
            return "neutral"

    def get_waveform_data(self, audio_path, num_points=200):
        """
        Downsamples high-frequency signal waveforms to a custom array length,
        providing suitable datasets for frontend canvas/SVG visualizers.
        """
        if not LIBROSA_AVAILABLE or not os.path.exists(audio_path):
            # Synthetic waveform
            synthetic_wf = [round(abs(math.sin(i * 0.15)) * (0.5 + random.random() * 0.5), 3) for i in range(num_points)]
            return {
                "waveform": synthetic_wf,
                "duration": 180.0,
                "sample_rate": 22050,
                "num_points": num_points
            }
            
        try:
            import numpy as real_np
            y, sr = librosa.load(audio_path, duration=30)
            
            hop = len(y) // num_points
            waveform = [
                float(real_np.mean(real_np.abs(y[i:i+hop])))
                for i in range(0, len(y), hop)
            ][:num_points]
            
            max_val = max(waveform) or 1.0
            waveform_normalized = [round(v / max_val, 3) for v in waveform]
            
            return {
                "waveform": waveform_normalized,
                "duration": float(librosa.get_duration(y=y, sr=sr)),
                "sample_rate": sr,
                "num_points": num_points
            }
        except Exception:
            synthetic_wf = [round(abs(math.sin(i * 0.15)) * (0.5 + random.random() * 0.5), 3) for i in range(num_points)]
            return {
                "waveform": synthetic_wf,
                "duration": 180.0,
                "sample_rate": 22050,
                "num_points": num_points
            }

    def detect_beats(self, audio_path):
        """Extracts beat counts and interval arrays suitable for the game timing."""
        if not LIBROSA_AVAILABLE or not os.path.exists(audio_path):
            return {
                "tempo": 120.0,
                "beat_timestamps": [float(i * 0.5) for i in range(60)],
                "total_beats": 60,
                "beat_intervals": [0.5] * 59
            }
            
        try:
            import numpy as real_np
            y, sr = librosa.load(audio_path)
            tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
            tempo_val = float(tempo[0]) if isinstance(tempo, (list, real_np.ndarray)) else float(tempo)
            
            beat_times = librosa.frames_to_time(beat_frames, sr=sr)
            return {
                "tempo": round(tempo_val, 1),
                "beat_timestamps": beat_times.tolist(),
                "total_beats": len(beat_times),
                "beat_intervals": real_np.diff(beat_times).tolist()
            }
        except Exception:
            return {
                "tempo": 120.0,
                "beat_timestamps": [float(i * 0.5) for i in range(60)],
                "total_beats": 60,
                "beat_intervals": [0.5] * 59
            }

    def fingerprint_song(self, audio_path):
        """Simplistic structural analysis constellation mapper for song verification matches."""
        if not LIBROSA_AVAILABLE or not os.path.exists(audio_path):
            return {
                "mfcc_mean": [0.0] * 13,
                "mfcc_std": [0.0] * 13,
                "spectral_centroid_mean": 1500.0,
                "zero_crossing_mean": 0.08
            }
            
        try:
            import numpy as real_np
            y, sr = librosa.load(audio_path, duration=10)
            mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
            
            return {
                "mfcc_mean": mfcc.mean(axis=1).tolist(),
                "mfcc_std": mfcc.std(axis=1).tolist(),
                "spectral_centroid_mean": float(real_np.mean(librosa.feature.spectral_centroid(y=y, sr=sr))),
                "zero_crossing_mean": float(real_np.mean(librosa.feature.zero_crossing_rate(y)))
            }
        except Exception:
            return {
                "mfcc_mean": [0.0] * 13,
                "mfcc_std": [0.0] * 13,
                "spectral_centroid_mean": 1500.0,
                "zero_crossing_mean": 0.08
            }

    def _generate_synthetic_analysis(self):
        """Synthetic mock generator providing consistent, structured data formats."""
        bpms = [78.0, 95.0, 112.0, 120.0, 128.0, 140.0]
        keys = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
        modes = ['major', 'minor']
        moods = ['happy_chill', 'happy_energetic', 'sad_melancholic', 'party_mode', 'neutral']
        
        bpm = random.choice(bpms)
        energy = round(0.35 + random.random() * 0.6, 3)
        dance = round(0.4 + random.random() * 0.5, 3)
        valence = round(0.2 + random.random() * 0.7, 3)
        
        return {
            "tempo_bpm": bpm,
            "energy": energy,
            "danceability": dance,
            "valence": valence,
            "brightness": round(1000 + random.random() * 2000, 2),
            "key": random.choice(keys),
            "mode": random.choice(modes),
            "percussion_level": round(0.02 + random.random() * 0.1, 4),
            "tonal_fingerprint": [round(random.uniform(-10, 10), 2) for _ in range(13)],
            "tempo_category": self._tempo_category(bpm),
            "mood_estimate": self._estimate_mood(bpm, energy, valence, dance)
        }
