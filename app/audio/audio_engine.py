import logging
import os
import json
import random

# Import sub-modules
from app.audio.analyzer import MwijayAudioAnalyzer
from app.audio.effects import PedalboardEffects, MwijayAudioEffects
from app.audio.separator import MwijaySourceSeparator
from app.audio.beat_detector import BeatDetector

# Try importing Gemini for AI-driven X-Ray insights
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False


class MwijayAudioEngine:
    """
    The master coordinator for all audio operations in the Mwijay Music App.
    Coordinates spectral analysis, voice modifications, vocal stem separations,
    precise rhythmic beat game timings, and Gemini-based Song X-Rays.
    """
    
    def __init__(self, gemini_api_key=None):
        self.logger = logging.getLogger("audio_engine")
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
            self.logger.setLevel(logging.INFO)
            
        self.analyzer = MwijayAudioAnalyzer()
        self.pedalboard = PedalboardEffects()
        self.pydub_effects = MwijayAudioEffects()
        self.separator = MwijaySourceSeparator()
        self.beat_detector = BeatDetector()
        
        # Configure Gemini
        self.api_key = gemini_api_key or os.getenv("GEMINI_API_KEY")
        self.is_ai_online = False
        self._initialize_gemini()

    def _initialize_gemini(self):
        """Attempts to register the Google Gemini API model."""
        if not GEMINI_AVAILABLE or not self.api_key:
            self.logger.warning("Gemini credentials missing or package not installed. X-Rays will use local heuristic comments.")
            return
            
        try:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel("gemini-1.5-flash")
            self.is_ai_online = True
            self.logger.info("Successfully loaded Google Gemini API for Mwijay Audio Engine.")
        except Exception as e:
            self.logger.error(f"Failed to load Gemini Client: {e}. Defaulting to offline.")
            self.is_ai_online = False

    def full_song_xray(self, audio_path, metadata=None):
        """
        Executes a complete Song X-Ray. Extracts precise digital properties,
        waveform visualizations, and beat points, and coordinates with Gemini
        to construct music theory and behavioral insights.
        """
        self.logger.info(f"Executing complete Song X-Ray: {audio_path}")
        
        # 1. Run physical digital analysis
        features = self.analyzer.analyze_song(audio_path)
        waveform = self.analyzer.get_waveform_data(audio_path, num_points=100)
        beats = self.beat_detector.detect_beats_precise(audio_path)
        
        # 2. Get AI observations
        ai_insights = self._get_ai_xray_insights(features, metadata)
        
        return {
            "audio_features": features,
            "waveform": waveform["waveform"],
            "beats": beats,
            "ai_insights": ai_insights,
            "tempo_category": features["tempo_category"],
            "mood": features["mood_estimate"],
            "key": features["key"],
            "mode": features["mode"]
        }

    def _get_ai_xray_insights(self, features, metadata):
        """Requests Gemini to write a music theory and behavioral breakdown of the track's audio profile."""
        if not self.is_ai_online or not self.model:
            return self._offline_xray_insights(features, metadata)
            
        prompt = f"""
        I have analyzed the digital properties of a song.
        Audio features data:
        - BPM: {features['tempo_bpm']} ({features['tempo_category']})
        - Energy Level: {features['energy']}/1.0
        - Valence (Happy/Sad): {features['valence']}/1.0
        - Key: {features['key']} {features['mode']}
        - Danceability index: {features['danceability']}/1.0
        
        Metadata: {metadata or 'Unknown Track'}
        
        Write a professional, highly creative Song X-Ray profile.
        Return ONLY a raw JSON dictionary matching this exact keys structure:
        {{
            "mood_description": "1-sentence human description of the vibe (e.g. upbeat sunset highway drive, moody midnight coffee shop)",
            "best_activities": ["activity1", "activity2"], // 3 activities this tempo/energy is perfect for
            "sounds_like": ["similar_artist1", "similar_artist2"], // 2-3 similar artists or songs
            "music_theory_facts": "1-sentence observation about how the chord key or BPM tempo impacts the sound",
            "love_it_because": "Why someone would fall in love with this track",
            "skip_it_if": "When this track might not fit someone's vibe"
        }}
        """
        
        try:
            response = self.model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            return json.loads(response.text.strip())
        except Exception as e:
            self.logger.error(f"Gemini X-Ray query failed: {e}. Falling back to offline heuristics.")
            return self._offline_xray_insights(features, metadata)

    def _offline_xray_insights(self, features, metadata):
        """Fallback analysis insights when offline."""
        mood = features["mood_estimate"]
        
        if mood == "happy_energetic":
            desc = "A sparkling, high-tempo celebration that fills the room with positive waves."
            acts = ["Gym workouts", "Road trips", "Morning pump-up"]
            sims = ["Pharrell Williams", "Bruno Mars"]
            theory = f"The fast {features['tempo_bpm']} BPM and bright {features['key']} Major chord key push the rhythm forward with high intensity."
            love = "The driving percussion and melodic lift are impossible to sit still to."
            skip = "You are looking for low-key, introspective ambient study tracks."
        elif mood == "sad_melancholic":
            desc = "A deep, reflective journey through emotional chords and soft acoustics."
            acts = ["Late night thinking", "Rainy day walks", "Quiet writing sessions"]
            sims = ["Adele", "Coldplay"]
            theory = f"The slow {features['tempo_bpm']} BPM tempo and minor third {features['key']} key create a quiet space for emotional release."
            love = "The vulnerable melodies feel like a comforting hand in quiet hours."
            skip = "You are ready to hit the gym or host a high-energy house party."
        elif mood == "happy_chill":
            desc = "A breezy, sun-kissed groove perfect for catching lazy weekend vibes."
            acts = ["Sunday brunch", "Beach relaxation", "Study focus background"]
            sims = ["Jack Johnson", "Sauti Sol"]
            theory = f"A relaxed {features['tempo_bpm']} BPM matching major chords creates a calm, comforting sway."
            love = "It washes over you like absolute sunshine, melting away all daily stresses."
            skip = "You need aggressive, heavy bass beats to power a workout session."
        else:
            desc = "A balanced, highly versatile rhythmic groove fitting any daily schedule."
            acts = ["Commuting", "Office focus", "Casual hosting"]
            sims = ["The Weeknd", "Khalid"]
            theory = f"The moderate {features['tempo_bpm']} BPM provides a stable, highly readable tempo."
            love = "It fits effortlessly into the background, providing consistent groove energy."
            skip = "You are seeking extreme ambient frequencies or absolute speed-core noise."
            
        return {
            "mood_description": desc,
            "best_activities": acts,
            "sounds_like": sims,
            "music_theory_facts": theory,
            "love_it_because": love,
            "skip_it_if": skip
        }

    def prepare_quiz_song(self, audio_path, clip_duration=5):
        """
        Slices a high-fidelity preview segment from an audio file
        adding fade-in/out envelopes for the Song Recognition game.
        """
        self.logger.info(f"Quiz Clip: preparing {clip_duration}s preview for: {audio_path}")
        
        # Resolve target paths
        clip_path = audio_path.replace(".mp3", "_quiz_clip.mp3")
        
        # Check if PyDub is installed
        try:
            from pydub import AudioSegment
            sound = AudioSegment.from_file(audio_path)
            total_duration_sec = len(sound) / 1000.0
            
            # Slice from the sweet spot (between 25% and 65% of the total duration)
            min_start = total_duration_sec * 0.25
            max_start = total_duration_sec * 0.65
            start_point = random.uniform(min_start, max_start)
            
            start_ms = int(start_point * 1000.0)
            end_ms = start_ms + (clip_duration * 1000)
            
            # Extract slice
            clip = sound[start_ms:end_ms]
            
            # Apply fade envelopes to prevent clipping pops
            clip = clip.fade_in(200).fade_out(300)
            clip.export(clip_path, format="mp3")
            
            return {
                "clip_path": clip_path,
                "start_second": round(start_point, 1),
                "duration": clip_duration
            }
        except Exception as e:
            self.logger.error(f"PyDub quiz slice failed: {e}. Returning mock clip parameters.")
            # Mock details
            return {
                "clip_path": audio_path,
                "start_second": 15.0,
                "duration": clip_duration,
                "note": "PyDub slice fallback active."
            }

    def apply_effect(self, audio_path, effect_name, output_path):
        """Applies a named preset effect (like chipmunk, robot, telephone, concert hall) to a track."""
        return self.pedalboard.apply_effect_preset(audio_path, output_path, effect_name)

    def make_karaoke_version(self, audio_path, output_dir):
        """Extracts vocals and instrumental tracks for karaoke sing-alongs using Spleeter."""
        return self.separator.make_karaoke(audio_path, output_dir)

    def get_beat_tap_data(self, audio_path):
        """Resolves rhythmic beat coordinates for tap gameplay."""
        return self.beat_detector.detect_beats_precise(audio_path)
