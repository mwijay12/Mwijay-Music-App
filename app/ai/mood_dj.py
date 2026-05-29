import json
import os
import time
import logging
import random
from datetime import datetime

# Defensive importing of google.generativeai for Gemini calls
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False


class MoodDJ:
    """
    Translates user emotions, emojis, times-of-day, and mood transition pathways
    into structured song recommendation vectors using Google Gemini AI, and gathers
    playable music streams using the UnifiedSearch pipeline.
    """
    
    def __init__(self, unified_search, api_key=None):
        """
        Initializes the MoodDJ.
        
        Args:
            unified_search: An instance of UnifiedSearch to locate track files.
            api_key (str): Optional Google Gemini API key certificate.
        """
        self.logger = logging.getLogger("mood_dj")
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
            self.logger.setLevel(logging.INFO)
            
        self.unified_search = unified_search
        
        # Load credentials
        self.api_keys = []
        keys_env = os.getenv("GEMINI_KEYS")
        if keys_env:
            self.api_keys = [k.strip() for k in keys_env.split(",") if k.strip()]
            
        primary_key = api_key or os.getenv("GEMINI_API_KEY")
        if primary_key and primary_key not in self.api_keys:
            self.api_keys.insert(0, primary_key)
            
        self.current_key_idx = 0
        self.api_key = self.api_keys[0] if self.api_keys else primary_key
        self.model = None
        self.is_online = False
        
        self._initialize_gemini()
        
    def _initialize_gemini(self):
        """Attempts to instantiate the GenerativeModel client using credentials."""
        try:
            if self.api_key and GEMINI_AVAILABLE:
                genai.configure(api_key=self.api_key)
                self.model = genai.GenerativeModel("gemini-1.5-flash")
                self.is_online = True
                self.logger.info(f"Successfully configured Google Gemini API client with {len(self.api_keys)} fallback keys.")
            else:
                self.logger.warning("Gemini credentials missing or package not installed. Operating in offline mode.")
                self.is_online = False
        except Exception as e:
            self.logger.error(f"Failed to load Gemini Client: {e}. Falling back to offline operations.")
            self.is_online = False

    def _call_gemini_with_fallback(self, func, *args, **kwargs):
        """
        Executes a Gemini generative function. If it fails due to rate limits
        or quota limits, it rotates to the next available API key in self.api_keys
        and retries.
        """
        if not self.api_keys:
            return func(*args, **kwargs)
            
        attempts = len(self.api_keys)
        for attempt in range(attempts):
            try:
                current_key = self.api_keys[self.current_key_idx]
                genai.configure(api_key=current_key)
                self.model = genai.GenerativeModel("gemini-1.5-flash")
                return func(*args, **kwargs)
            except Exception as e:
                err_str = str(e).lower()
                if any(x in err_str for x in ["429", "quota", "exhausted", "limit", "invalid", "api key"]):
                    next_idx = (self.current_key_idx + 1) % len(self.api_keys)
                    self.logger.warning(
                        f"Gemini API key at index {self.current_key_idx} failed (Error: {e}). "
                        f"Rotating to key at index {next_idx}..."
                    )
                    self.current_key_idx = next_idx
                    self.api_key = self.api_keys[self.current_key_idx]
                else:
                    raise e
                    
        raise RuntimeError("All configured Gemini API keys have been exhausted or failed.")

    def _rate_limit_delay(self):
        """Standard throttling delay to respect API quotas."""
        time.sleep(0.2)

    def _offline_analyze_mood(self, user_input):
        """Curates high-fidelity offline fallback mood structures when Gemini is unavailable."""
        user_input_lower = user_input.lower()
        
        # Default metrics
        mood = "neutral"
        energy = 5
        valence = 5
        genres = ["pop", "acoustic"]
        tempo = "moderate"
        color = "#8A8A8A"
        emoji = "🎵"
        description = "Enjoy a highly customized listening session built around your vibe."
        
        if any(k in user_input_lower for k in ["sad", "cry", "broke", "heart", "lonely", "hurt", "grief", "😭", "💔"]):
            mood = "heartbreak"
            energy = 3
            valence = 2
            genres = ["r&b", "soul", "ballads", "acoustic"]
            tempo = "slow"
            color = "#4A90D9"
            emoji = "💔"
            description = "Gentle tunes and melancholy chords to accompany quiet reflections."
        elif any(k in user_input_lower for k in ["happy", "glad", "excite", "joy", "celebrate", "great", "party", "smile", "😀", "🎉", "🔥"]):
            mood = "joyful"
            energy = 8
            valence = 9
            genres = ["dance", "pop", "afrobeats", "funk"]
            tempo = "fast"
            color = "#FFD700"
            emoji = "🎉"
            description = "Upbeat grooves and energetic vocals to keep your spirits flying high!"
        elif any(k in user_input_lower for k in ["workout", "gym", "pump", "run", "fit", "strong", "active", "💪", "🏃"]):
            mood = "energetic"
            energy = 10
            valence = 7
            genres = ["hip-hop", "electronic", "rock", "afrobeats"]
            tempo = "fast"
            color = "#FF4500"
            emoji = "⚡"
            description = "Intense, fast-paced rhythms to supercharge your workouts and push limits."
        elif any(k in user_input_lower for k in ["relax", "sleep", "chill", "calm", "study", "peace", "zen", "😴", "🧘"]):
            mood = "relaxed"
            energy = 2
            valence = 6
            genres = ["lofi", "ambient", "jazz", "acoustic"]
            tempo = "slow"
            color = "#7FFF00"
            emoji = "🧘"
            description = "Quiet soundscapes and mellow notes for studying, meditation, or wind-down."
            
        return {
            "mood": mood,
            "energy_level": energy,
            "valence": valence,
            "suggested_genres": genres,
            "tempo_range": tempo,
            "color": color,
            "emoji": emoji,
            "description": description
        }

    def analyze_mood(self, user_input):
        """
        Interprets natural text messages or descriptions, classifying them
        into emotional properties, tempos, and color codes using Gemini.
        """
        if not self.is_online or not self.model:
            self.logger.info("Gemini Offline: Performing local regex mood profiling.")
            return self._offline_analyze_mood(user_input)
            
        self._rate_limit_delay()
        
        prompt = f"""
        Analyze the emotional tone, vibe, and mood of the following user statement:
        "{user_input}"
        
        Map this mood to structured music properties.
        Return ONLY a raw JSON dictionary (no markdown blocks, no triple backticks) matching this exact format:
        {{
            "mood": "a short keyword describing the emotion (e.g. melancholy, heartbreak, euphoric, motivated, zen)",
            "energy_level": 5,      // 1-10 numerical scale of physical intensity (1 ambient, 10 peak workout)
            "valence": 5,           // 1-10 numerical scale from sad/negative (1) to happy/positive (10)
            "suggested_genres": ["genre1", "genre2"], // 3-4 genres, blending mainstream, indie, and African vibes (like Afrobeats, Amapiano, Bongo Flava, Gengetone) when relevant
            "tempo_range": "slow/moderate/fast",
            "color": "#HEXVAL",     // An glowing HSL color code in hex format matching this specific mood (e.g. deep blue for sadness, warm gold for joy)
            "emoji": "corresponding mood emoji",
            "description": "A comforting or encouraging 1-sentence DJ intro message summarizing the musical vibe."
        }}
        """
        
        try:
            call_func = lambda: self.model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            response = self._call_gemini_with_fallback(call_func)
            return json.loads(response.text.strip())
        except Exception as e:
            self.logger.error(f"Gemini analyze_mood failed: {e}. Falling back to offline analyzer.")
            return self._offline_analyze_mood(user_input)

    def _offline_song_suggestions(self, mood_info, num_songs):
        """Curates a high-quality local playlist pool of African and global hits matching the mood."""
        mood = mood_info.get("mood", "neutral")
        
        heartbreak_pool = [
            {"title": "Suzanna", "artist": "Sauti Sol"},
            {"title": "Someone Like You", "artist": "Adele"},
            {"title": "Let Her Go", "artist": "Passenger"},
            {"title": "Stay With Me", "artist": "Sam Smith"},
            {"title": "Fix You", "artist": "Coldplay"},
            {"title": "Driver's License", "artist": "Olivia Rodrigo"},
            {"title": "Say Something", "artist": "A Great Big World"},
            {"title": "Heartbreak Anniversary", "artist": "Giveon"},
            {"title": "Jealous", "artist": "Labrinth"},
            {"title": "Mapenzi", "artist": "Kidum"},
            {"title": "All of Me", "artist": "John Legend"},
            {"title": "Yesterday", "artist": "The Beatles"},
            {"title": "Back to Black", "artist": "Amy Winehouse"},
            {"title": "Too Good At Goodbyes", "artist": "Sam Smith"}
        ]
        
        joyful_pool = [
            {"title": "Happy", "artist": "Pharrell Williams"},
            {"title": "Can't Stop the Feeling", "artist": "Justin Timberlake"},
            {"title": "Uptown Funk", "artist": "Bruno Mars"},
            {"title": "Jerusalema", "artist": "Master KG"},
            {"title": "Extravaganza", "artist": "Sauti Sol"},
            {"title": "Walking on Sunshine", "artist": "Katrina and the Waves"},
            {"title": "Best Day of My Life", "artist": "American Authors"},
            {"title": "I Gotta Feeling", "artist": "Black Eyed Peas"},
            {"title": "Sura Yako", "artist": "Sauti Sol"},
            {"title": "Love Nwantiti", "artist": "Ckay"},
            {"title": "On the Low", "artist": "Burna Boy"},
            {"title": "Inama", "artist": "Diamond Platnumz"},
            {"title": "Enjoy", "artist": "Jux ft. Diamond Platnumz"}
        ]
        
        energetic_pool = [
            {"title": "Lose Yourself", "artist": "Eminem"},
            {"title": "Eye of the Tiger", "artist": "Survivor"},
            {"title": "Stronger", "artist": "Kanye West"},
            {"title": "Remember the Name", "artist": "Fort Minor"},
            {"title": "Till I Collapse", "artist": "Eminem"},
            {"title": "Can't Hold Us", "artist": "Macklemore"},
            {"title": "Ye", "artist": "Burna Boy"},
            {"title": "Unavailable", "artist": "Davido"},
            {"title": "Amapiano", "artist": "Asake ft. Olamide"},
            {"title": "Harder, Better, Faster, Stronger", "artist": "Daft Punk"},
            {"title": "Don't Stop Me Now", "artist": "Queen"},
            {"title": "Wake Me Up", "artist": "Avicii"},
            {"title": "Blinding Lights", "artist": "The Weeknd"},
            {"title": "Mwema", "artist": "Mercy Masika"}
        ]
        
        relaxed_pool = [
            {"title": "Strawberry Letter 23", "artist": "Shuggie Otis"},
            {"title": "Weightless", "artist": "Marconi Union"},
            {"title": "Come Away With Me", "artist": "Norah Jones"},
            {"title": "Banana Pancakes", "artist": "Jack Johnson"},
            {"title": "Sunset Lover", "artist": "Petit Biscuit"},
            {"title": "Teardrop", "artist": "Massive Attack"},
            {"title": "Morning", "artist": "Sauti Sol"},
            {"title": "Melancholy Hill", "artist": "Gorillaz"},
            {"title": "Ocean Eyes", "artist": "Billie Eilish"},
            {"title": "Location", "artist": "Khalid"}
        ]
        
        pool = relaxed_pool
        if mood == "heartbreak":
            pool = heartbreak_pool
        elif mood == "joyful" or mood == "euphoric":
            pool = joyful_pool
        elif mood == "energetic" or mood == "motivated":
            pool = energetic_pool
            
        selected = pool.copy()
        random.shuffle(selected)
        return selected[:num_songs]

    def _suggest_songs_for_mood(self, mood_info, num_songs):
        """Requests Gemini to list songs that fit the designated musical parameters."""
        if not self.is_online or not self.model:
            return self._offline_song_suggestions(mood_info, num_songs)
            
        self._rate_limit_delay()
        
        prompt = f"""
        Suggest {num_songs} real, widely-known songs fitting this emotional profile:
        Mood: {mood_info['mood']}
        Energy Level: {mood_info['energy_level']}/10
        Valence: {mood_info['valence']}/10
        Suggested Genres: {', '.join(mood_info['suggested_genres'])}
        Tempo: {mood_info['tempo_range']}
        
        Provide a highly diverse, creative mix:
        - Include mainstream popular hits.
        - Include alternative/indie gems.
        - Include modern or classic African hits (Afrobeats, Amapiano, Bongo Flava, Gengetone, Sheng vibes) as suitable.
        
        Return ONLY a raw JSON list of dictionaries (no backticks, no code formatting):
        [
            {{"title": "Song Title", "artist": "Artist Name"}},
            ...
        ]
        """
        
        try:
            call_func = lambda: self.model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            response = self._call_gemini_with_fallback(call_func)
            return json.loads(response.text.strip())
        except Exception as e:
            self.logger.error(f"Gemini _suggest_songs_for_mood failed: {e}. Falling back to offline tracks list.")
            return self._offline_song_suggestions(mood_info, num_songs)

    def _generate_dj_message(self, mood_info, tracks):
        """Generates Swahili-English Sheng comments for a playlist using Gemini."""
        if not self.is_online or not self.model:
            return f"Yo, feeling that {mood_info['mood']} vibe! Here are {len(tracks)} tracks matching your mood {mood_info['emoji']}. Stay tuned!"
            
        self._rate_limit_delay()
        
        prompt = f"""
        You are a super cool, urban radio DJ on Mwijay Music App.
        Write a short, engaging, and empathetic intro message (2-3 sentences max) for a playlist created for this user mood:
        Mood: {mood_info['mood']} ({mood_info['emoji']})
        Description: {mood_info['description']}
        
        Style: Young, warm, and highly energetic, utilizing Swahili-English Sheng vibes (e.g. 'mambo vipi', 'rada', 'kazi safi', 'mzuka').
        Keep it natural and direct.
        """
        
        try:
            call_func = lambda: self.model.generate_content(prompt)
            response = self._call_gemini_with_fallback(call_func)
            return response.text.strip()
        except Exception:
            return f"Yo, feeling that {mood_info['mood']} vibe! Here are {len(tracks)} tracks matching your mood {mood_info['emoji']}. Let's play!"

    def create_mood_playlist(self, user_input, num_songs=15):
        """
        Complete pipeline: analyzes mood descriptions, curates tracks lists,
        and aggregates standard playback results by searching parallel libraries.
        """
        # 1. Analyze mood properties
        mood_info = self.analyze_mood(user_input)
        
        # 2. Curate matching songs list
        songs_list = self._suggest_songs_for_mood(mood_info, num_songs)
        
        # 3. Resolve tracks metadata in parallel using unified_search
        tracks = []
        for song in songs_list:
            title = song.get("title")
            artist = song.get("artist")
            if not title:
                continue
                
            q = f"{artist} - {title}" if artist else title
            search_res = self.unified_search.search(q, limit=1)
            
            if search_res and search_res["results"]:
                tracks.append(search_res["results"][0])
            else:
                tracks.append({
                    "title": title,
                    "artist": artist or "Unknown Artist",
                    "sources": [],
                    "best_source": "none",
                    "thumbnail": "",
                    "duration": "0:00",
                    "type": "song",
                    "note": "Not found in active libraries"
                })
                
        # 4. Generate custom intro message
        dj_msg = self._generate_dj_message(mood_info, tracks)
        
        playlist_name = f"{mood_info['emoji']} {mood_info['mood'].title()} Vibe"
        if mood_info["mood"] == "heartbreak":
            playlist_name = "Heartbreak Hotel 💔"
        elif mood_info["mood"] in ["joyful", "euphoric"]:
            playlist_name = "Golden Sunshine 🎉"
        elif mood_info["mood"] in ["energetic", "motivated"]:
            playlist_name = "Thunder Strike ⚡"
        elif mood_info["mood"] in ["relaxed", "zen"]:
            playlist_name = "Serene Slumber 🧘"
            
        return {
            "mood_info": mood_info,
            "playlist_name": playlist_name,
            "tracks": tracks[:num_songs],
            "ai_message": dj_msg
        }

    def mood_from_emoji(self, emojis):
        """Creates a customized playlist matching mood parameters defined by raw emoji chains."""
        self.logger.info(f"Generating mood playlist from emojis: {emojis}")
        return self.create_mood_playlist(f"Curate music matching the exact emotional vibe of these emojis: {emojis}")

    def mood_transition(self, current_mood, target_mood, num_songs=10):
        """
        Creates a playlist that smoothly transitions a user's emotional state
        by blending songs of increasing valence and energy levels.
        """
        self.logger.info(f"Creating mood transition playlist: '{current_mood}' to '{target_mood}' ({num_songs} tracks)")
        
        if not self.is_online or not self.model:
            # Local fallback: blend half-and-half
            current_info = self.analyze_mood(current_mood)
            target_info = self.analyze_mood(target_mood)
            
            c_songs = self._suggest_songs_for_mood(current_info, num_songs // 2)
            t_songs = self._suggest_songs_for_mood(target_info, num_songs - len(c_songs))
            songs_list = c_songs + t_songs
        else:
            self._rate_limit_delay()
            prompt = f"""
            Curate a transition playlist of {num_songs} widely-known songs that starts in the mood of "{current_mood}"
            and gradually, song-by-song, transitions into the target mood of "{target_mood}".
            The transition must be extremely smooth and step-by-step (e.g. melancholy -> hopeful -> nostalgic -> energetic -> euphoric).
            
            Return ONLY a raw JSON list of dictionaries:
            [
                {{"title": "Song Title", "artist": "Artist Name", "transition_stage": "Brief vibe description of this step"}}
            ]
            """
            try:
                call_func = lambda: self.model.generate_content(
                    prompt,
                    generation_config={"response_mime_type": "application/json"}
                )
                response = self._call_gemini_with_fallback(call_func)
                songs_list = json.loads(response.text.strip())
            except Exception as e:
                self.logger.error(f"Transition generation failed: {e}. Blending half-and-half.")
                current_info = self.analyze_mood(current_mood)
                target_info = self.analyze_mood(target_mood)
                c_songs = self._suggest_songs_for_mood(current_info, num_songs // 2)
                t_songs = self._suggest_songs_for_mood(target_info, num_songs - len(c_songs))
                songs_list = c_songs + t_songs

        # Map each resolved track
        tracks = []
        for song in songs_list:
            title = song.get("title")
            artist = song.get("artist")
            if not title:
                continue
                
            q = f"{artist} - {title}" if artist else title
            search_res = self.unified_search.search(q, limit=1)
            
            if search_res and search_res["results"]:
                track = search_res["results"][0].copy()
                if "transition_stage" in song:
                    track["transition_stage"] = song["transition_stage"]
                tracks.append(track)
            else:
                tracks.append({
                    "title": title,
                    "artist": artist or "Unknown Artist",
                    "sources": [],
                    "best_source": "none",
                    "thumbnail": "",
                    "duration": "0:00",
                    "type": "song",
                    "transition_stage": song.get("transition_stage", "")
                })
                
        playlist_name = f"Vibe Shift: {current_mood.title()} ➔ {target_mood.title()}"
        ai_message = f"Starting you off with the mellow notes of {current_mood}, but we are moving on up to the bright lights of {target_mood}! Hit play and let the vibe shift take over."
        
        return {
            "current_mood": current_mood,
            "target_mood": target_mood,
            "playlist_name": playlist_name,
            "tracks": tracks,
            "ai_message": ai_message
        }

    def time_based_mood(self, time_of_day=None):
        """Crates custom playlists suited for morning, afternoon, evening, or late night."""
        if not time_of_day:
            hour = datetime.now().hour
            if 5 <= hour < 12:
                time_of_day = "morning"
            elif 12 <= hour < 17:
                time_of_day = "afternoon"
            elif 17 <= hour < 22:
                time_of_day = "evening"
            else:
                time_of_day = "late_night"
                
        time_of_day = time_of_day.lower().strip()
        
        mood_prompts = {
            "morning": "energetic morning start, upbeat motivation to face the day",
            "afternoon": "focused afternoon study sessions, chill lofi study beats and jazz",
            "evening": "chill evening wind-down, smooth relaxing acoustic and afrobeats",
            "late_night": "deep late night ambient soundscapes, quiet introspective sleep beats"
        }
        
        prompt = mood_prompts.get(time_of_day, mood_prompts["evening"])
        self.logger.info(f"Generating time-based playlist for session: '{time_of_day}'")
        
        playlist = self.create_mood_playlist(prompt, num_songs=10)
        playlist["playlist_name"] = f"{time_of_day.replace('_', ' ').title()} Session 📻"
        return playlist
