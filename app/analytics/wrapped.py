import logging
import os
from datetime import datetime
from app.analytics.listening_stats import ListeningStats

# Try importing Gemini for personality updates
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False


class MwijayWrapped:
    """
    Generates structured annual listening summaries, Spotify-style slideshow statistics,
    and AI-powered music personality cards from user playback histories.
    """
    
    def __init__(self, listening_stats=None):
        self.logger = logging.getLogger("mwijay_wrapped")
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
            self.logger.setLevel(logging.INFO)
            
        self.stats = listening_stats or ListeningStats()
        
    def _generate_ai_personality(self, unique_artists, unique_songs, top_genre, minutes):
        """Asks Gemini to generate a creative, shareable Music Personality profile."""
        if not GEMINI_AVAILABLE or not os.getenv("GEMINI_API_KEY"):
            # Local offline rule-based fallback personality
            if unique_artists > 40 and unique_songs / unique_artists > 4:
                return {
                    "title": "The Sonic Nomad 🌍",
                    "spirit_animal": "Migrating Falcon 🦅",
                    "music_soulmate": "Burna Boy",
                    "description": "You range far and wide across soundscapes, collecting tracks like artifacts."
                }
            elif unique_songs < 20:
                return {
                    "title": "The Devoted Disciple 🎧",
                    "spirit_animal": "Gentle Koala 🐨",
                    "music_soulmate": "Adele",
                    "description": "You find comfort in familiarity. When you love a song, it becomes the soundtrack to your life."
                }
            else:
                return {
                    "title": "The Genre Alchemist 🧪",
                    "spirit_animal": "Chameleon 🦎",
                    "music_soulmate": "Sauti Sol",
                    "description": "You blend indie gems and mainstream hits, synthesizing your own unique audio experience."
                }

        try:
            genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
            model = genai.GenerativeModel("gemini-1.5-flash")
            prompt = f"""
            Based on these annual music listening statistics:
            - Minutes listened: {minutes}
            - Unique Songs played: {unique_songs}
            - Unique Artists scanned: {unique_artists}
            - Top Genre: {top_genre}
            
            Generate a fun, shareable music personality profile for the user.
            Return ONLY a raw JSON dictionary with these keys:
            {{
                "title": "Fun title (e.g. The Deep-Dive Archivist, The Sunset Dreamer)",
                "spirit_animal": "Fitting spirit animal based on mood",
                "music_soulmate": "A famous artist with a similar audio signature",
                "description": "1-2 sentences explaining their listening personality."
            }}
            """
            response = model.generate_content(prompt, generation_config={"response_mime_type": "application/json"})
            import json
            return json.loads(response.text.strip())
        except Exception as e:
            self.logger.error(f"Gemini personality generation failed: {e}")
            return {
                "title": "The Audio Adventurer 🎸",
                "spirit_animal": "Dolphin 🐬",
                "music_soulmate": "Pharrell Williams",
                "description": "Always chasing the next great beat, you live life in stereo."
            }

    def generate_wrapped(self, user_id, year):
        """
        Compiles complete end-of-year data including total minutes, unique count metrics,
        top song breakdowns, active day timelines, source percentages, and AI cards.
        """
        self.logger.info(f"Compiling yearly wrapped statistics for user {user_id} in {year}...")
        
        # Fetch complete history
        all_history = self.stats._fetch_history(user_id, period="all")
        
        # Filter for the target year
        year_str = str(year)
        history = [h for h in all_history if h.get("timestamp_end", "").startswith(year_str)]
        
        if not history:
            return {
                "year": year,
                "total_minutes": 0,
                "total_plays": 0,
                "unique_artists": 0,
                "unique_songs": 0,
                "top_songs": [],
                "top_artists": [],
                "top_genre": "None",
                "listening_personality": {
                    "title": "The Silent Observer 🤐",
                    "spirit_animal": "Sleeping Sloth 🦥",
                    "music_soulmate": "None",
                    "description": "You kept a low profile this year. Let's make some noise next year!"
                },
                "comparative_percentage": 0
            }
            
        total_seconds = sum(h.get("duration_listened", 0) for h in history)
        minutes = int(total_seconds // 60)
        
        unique_artists_set = set(h.get("artist") for h in history)
        unique_songs_set = set(h.get("track_id") for h in history)
        
        # Top Songs & Artists
        song_counts = {}
        artist_counts = {}
        genre_counts = {}
        source_counts = {}
        mood_months = {}
        
        for h in history:
            s_key = (h.get("track_id", ""), h.get("title", ""), h.get("artist", ""), h.get("thumbnail", ""))
            song_counts[s_key] = song_counts.get(s_key, 0) + 1
            
            art = h.get("artist", "")
            artist_counts[art] = artist_counts.get(art, 0) + 1
            
            gen = h.get("genre", "pop")
            genre_counts[gen] = genre_counts.get(gen, 0) + 1
            
            src = h.get("source", "ytmusic")
            source_counts[src] = source_counts.get(src, 0) + 1
            
            # Extract month
            try:
                dt = datetime.fromisoformat(h.get("timestamp_end", ""))
                month_name = dt.strftime("%B") # e.g. "January"
                mood = h.get("mood", "neutral")
                if month_name not in mood_months:
                    mood_months[month_name] = {}
                mood_months[month_name][mood] = mood_months[month_name].get(mood, 0) + 1
            except Exception:
                pass
                
        # Sort aggregates
        top_songs_list = sorted(song_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        top_artists_list = sorted(artist_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        top_genre = max(genre_counts, key=genre_counts.get) if genre_counts else "pop"
        
        # AI Personality Card
        personality = self._generate_ai_personality(
            len(unique_artists_set), len(unique_songs_set), top_genre, minutes
        )
        
        # Calculate comparative benchmark percentile
        # In a real app we'd scan all users, here we build a realistic scale based on minutes
        if minutes > 15000:
            percentile = 98
        elif minutes > 8000:
            percentile = 92
        elif minutes > 3000:
            percentile = 84
        elif minutes > 1000:
            percentile = 70
        else:
            percentile = 45
            
        # Month-by-month dominant mood
        mood_timeline = {}
        for m, moods in mood_months.items():
            mood_timeline[m] = max(moods, key=moods.get)
            
        # Source breakdowns
        total_plays = len(history)
        source_pct = {k: round((v / total_plays) * 100, 1) for k, v in source_counts.items()}
        
        return {
            "year": year,
            "total_minutes": minutes,
            "total_plays": total_plays,
            "unique_artists": len(unique_artists_set),
            "unique_songs": len(unique_songs_set),
            "top_songs": [
                {"id": k[0], "title": k[1], "artist": k[2], "thumbnail": k[3], "plays": count}
                for k, count in top_songs_list
            ],
            "top_artists": [
                {"artist": name, "plays": count} for name, count in top_artists_list
            ],
            "top_genre": top_genre.title(),
            "listening_personality": personality,
            "comparative_percentage": percentile,
            "mood_chart": mood_timeline,
            "source_breakdown": source_pct
        }

    def get_wrapped_slides(self, user_id, year):
        """
        Formats the annual Wrapped dataset into a slide-by-slide representation
        ideal for rendering high-fidelity cards on frontend carousels.
        """
        w = self.generate_wrapped(user_id, year)
        
        if w["total_plays"] == 0:
            return [
                {
                    "slide_id": 1,
                    "type": "welcome",
                    "title": "Welcome to your Year in Review!",
                    "text": "Listen to at least 1 song in this year to unlock your personal Wrapped slideshow."
                }
            ]
            
        slides = [
            {
                "slide_id": 1,
                "type": "intro",
                "title": f"Mwijay Wrapped {year}",
                "headline": "Ready to re-live your year in music?",
                "bg_color": "#1A0933",
                "accent_color": "#E0Aaff"
            },
            {
                "slide_id": 2,
                "type": "listening_time",
                "title": "Your Time on Mwijay",
                "stat": f"{w['total_minutes']:,} mins",
                "subtext": f"You listened to music on Mwijay for {w['total_minutes']:,} minutes this year! That puts you in the top {100 - w['comparative_percentage']}% of listeners.",
                "bg_color": "#03001C",
                "accent_color": "#D4ADFC"
            },
            {
                "slide_id": 3,
                "type": "top_genre",
                "title": "Your Audio Oasis",
                "stat": w["top_genre"],
                "subtext": "This genre kept your pulse pounding and defined your year's vibe.",
                "bg_color": "#0B2447",
                "accent_color": "#A5D7E8"
            },
            {
                "slide_id": 4,
                "type": "top_artist",
                "title": "Your Ultimate Icon",
                "stat": w["top_artists"][0]["artist"] if w["top_artists"] else "Unknown Artist",
                "subtext": f"You couldn't get enough of them, streaming their catalog {w['top_artists'][0]['plays'] if w['top_artists'] else 0} times!",
                "bg_color": "#19376D",
                "accent_color": "#576CBC"
            },
            {
                "slide_id": 5,
                "type": "top_songs",
                "title": "Your Anthem Playlist",
                "songs": w["top_songs"],
                "bg_color": "#11009E",
                "accent_color": "#4942E4"
            },
            {
                "slide_id": 6,
                "type": "personality",
                "title": "Your Listening Personality",
                "stat": w["listening_personality"]["title"],
                "badge": w["listening_personality"]["spirit_animal"],
                "subtext": f"{w['listening_personality']['description']} Your music soulmate: {w['listening_personality']['music_soulmate']}.",
                "bg_color": "#4A00B4",
                "accent_color": "#E500A4"
            }
        ]
        return slides

    def compare_with_friends(self, user_id, friend_ids):
        """Compares user's top genre and minutes listened against listed friends."""
        self_data = self.generate_wrapped(user_id, datetime.now().year)
        
        comparisons = []
        for fid in friend_ids:
            f_data = self.generate_wrapped(fid, datetime.now().year)
            similarity = 0
            # Basic similarity metric: overlap in top artists/genres
            if self_data["top_genre"] == f_data["top_genre"]:
                similarity += 40
                
            self_artists = set(a["artist"] for a in self_data["top_artists"])
            f_artists = set(a["artist"] for a in f_data["top_artists"])
            overlap = self_artists.intersection(f_artists)
            similarity += len(overlap) * 12
            
            comparisons.append({
                "friend_id": fid,
                "minutes_listened": f_data["total_minutes"],
                "top_genre": f_data["top_genre"],
                "compatibility_rating": min(similarity, 100)
            })
            
        return {
            "user_id": user_id,
            "minutes_listened": self_data["total_minutes"],
            "top_genre": self_data["top_genre"],
            "comparisons": comparisons
        }
