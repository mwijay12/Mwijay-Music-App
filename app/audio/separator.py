import logging
import os
import shutil

# Defensive importing of Deezer's Spleeter
try:
    from spleeter.separator import Separator
    SPLEETER_AVAILABLE = True
except ImportError:
    SPLEETER_AVAILABLE = False


class MwijaySourceSeparator:
    """
    Interfaces with Deezer's Spleeter engine to split standard mixed stereo tracks
    into individual stems (Vocals, Drums, Bass, Instruments) for Karaoke or remixing.
    """
    
    def __init__(self):
        self.logger = logging.getLogger("source_separator")
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
            self.logger.setLevel(logging.INFO)
            
        self.separator_2stems = None
        self.separator_4stems = None
        
        self._initialize_spleeter()

    def _initialize_spleeter(self):
        """Attempts to load separator models (lazy instantiation)."""
        if not SPLEETER_AVAILABLE:
            self.logger.warning("Spleeter library is not installed. Separations will run in mock fallback mode.")
            return
            
        try:
            # 2stems = vocals + accompaniment (Karaoke mode)
            self.separator_2stems = Separator('spleeter:2stems')
            # 4stems = vocals + drums + bass + other
            self.separator_4stems = Separator('spleeter:4stems')
            self.logger.info("Deezer Spleeter separator engines loaded successfully.")
        except Exception as e:
            self.logger.error(f"Spleeter separator initialization failed: {e}. Falling back to mock mode.")
            self.separator_2stems = None
            self.separator_4stems = None

    def make_karaoke(self, audio_path, output_dir):
        """
        Splits a song into two stems (accompaniment.wav and vocals.wav).
        Ideal for instant, high-quality vocal extraction or backing track generation.
        """
        self.logger.info(f"Karaoke Split: processing file: {audio_path} ➔ {output_dir}")
        
        song_name = os.path.splitext(os.path.basename(audio_path))[0]
        vocals_path = os.path.join(output_dir, song_name, "vocals.wav")
        backing_path = os.path.join(output_dir, song_name, "accompaniment.wav")
        
        if not os.path.exists(audio_path):
            self.logger.warning(f"Audio file not found: {audio_path}")
            return {"karaoke": backing_path, "vocals_only": vocals_path, "note": "File not found"}

        if not SPLEETER_AVAILABLE or not self.separator_2stems:
            self.logger.warning("Spleeter not available. Simulating separation by copying input as backing track.")
            os.makedirs(os.path.join(output_dir, song_name), exist_ok=True)
            shutil.copy(audio_path, backing_path)
            shutil.copy(audio_path, vocals_path)  # Mock copy
            return {
                "karaoke": backing_path,
                "vocals_only": vocals_path,
                "note": "Spleeter fallback active. Tracks are unseparated copies."
            }

        try:
            # Execute actual separation process
            self.separator_2stems.separate_to_file(audio_path, output_dir)
            self.logger.info(f"Separation complete! Stems saved in: {os.path.join(output_dir, song_name)}")
            return {
                "karaoke": backing_path,
                "vocals_only": vocals_path
            }
        except Exception as e:
            self.logger.error(f"Spleeter execution failed: {e}. Falling back to copy.")
            os.makedirs(os.path.join(output_dir, song_name), exist_ok=True)
            shutil.copy(audio_path, backing_path)
            shutil.copy(audio_path, vocals_path)
            return {
                "karaoke": backing_path,
                "vocals_only": vocals_path,
                "error": str(e)
            }

    def get_all_stems(self, audio_path, output_dir):
        """
        Splits a song into four separate stems:
        - vocals.wav
        - drums.wav
        - bass.wav
        - other.wav (melody / chord layers)
        """
        self.logger.info(f"Full Stems Split: processing file: {audio_path} ➔ {output_dir}")
        
        song_name = os.path.splitext(os.path.basename(audio_path))[0]
        stems_dir = os.path.join(output_dir, song_name)
        
        stems = {
            "vocals": os.path.join(stems_dir, "vocals.wav"),
            "drums": os.path.join(stems_dir, "drums.wav"),
            "bass": os.path.join(stems_dir, "bass.wav"),
            "other": os.path.join(stems_dir, "other.wav")
        }
        
        if not os.path.exists(audio_path):
            return stems

        if not SPLEETER_AVAILABLE or not self.separator_4stems:
            self.logger.warning("Spleeter 4stems not available. Simulating separation by copying input.")
            os.makedirs(stems_dir, exist_ok=True)
            for path in stems.values():
                shutil.copy(audio_path, path)
            return stems

        try:
            self.separator_4stems.separate_to_file(audio_path, output_dir)
            return stems
        except Exception as e:
            self.logger.error(f"Spleeter 4stems execution failed: {e}")
            os.makedirs(stems_dir, exist_ok=True)
            for path in stems.values():
                shutil.copy(audio_path, path)
            return stems
