import logging
import os
import time
from datetime import datetime, timedelta

# Defensive importing of Firebase Admin SDK
try:
    import firebase_admin
    from firebase_admin import credentials, firestore
    
    # Initialize Firebase if not already initialized
    if not firebase_admin._apps:
        cred_path = "service-account.json"
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        else:
            firebase_admin.initialize_app()
    db = firestore.client()
    FIREBASE_AVAILABLE = True
except Exception:
    FIREBASE_AVAILABLE = False
    db = None


class ListeningStats:
    """
    Tracks and analyzes user listening activities, device patterns, and consecutive day streaks,
    storing records directly in Google Firestore with a robust local memory fallback.
    """
    
    def __init__(self):
        self.logger = logging.getLogger("listening_stats")
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
            self.logger.setLevel(logging.INFO)
            
        # Local mock database for offline fallback testing
        self._local_history = []
        self._local_streaks = {}
        
    def _is_firebase_active(self):
        return FIREBASE_AVAILABLE and db is not None

    def log_listen(self, user_id, track_data, duration_listened, device_type="mobile", skip_point=None):
        """
        Logs a song listening session to the database, capturing track tags,
        sources, durations, and timing intervals.
        """
        now = datetime.now()
        timestamp_start = now - timedelta(seconds=duration_listened)
        
        # Inferred timing tags
        hour = now.hour
        if 5 <= hour < 12:
            time_of_day = "morning"
        elif 12 <= hour < 17:
            time_of_day = "afternoon"
        elif 17 <= hour < 22:
            time_of_day = "evening"
        else:
            time_of_day = "late_night"
            
        day_of_week = now.strftime("%A") # e.g. "Monday"
        
        listen_record = {
            "user_id": user_id,
            "track_id": track_data.get("id", ""),
            "title": track_data.get("title", "Unknown Title"),
            "artist": track_data.get("artist", "Unknown Artist"),
            "album": track_data.get("album", "Unknown Album"),
            "genre": track_data.get("genre", "pop"),
            "source": track_data.get("source", "ytmusic"),
            "timestamp_start": timestamp_start.isoformat(),
            "timestamp_end": now.isoformat(),
            "duration_listened": duration_listened,
            "skip_point": skip_point,
            "device_type": device_type,
            "time_of_day": time_of_day,
            "day_of_week": day_of_week,
            "mood": track_data.get("mood", "neutral")
        }
        
        if self._is_firebase_active():
            try:
                db.collection("listening_history").add(listen_record)
                self.logger.info(f"Log Listen: Track '{listen_record['title']}' saved to Firestore.")
            except Exception as e:
                self.logger.error(f"Firestore log_listen failed: {e}. Saving locally.")
                self._local_history.append(listen_record)
        else:
            self._local_history.append(listen_record)
            self.logger.info(f"Log Listen: Track '{listen_record['title']}' saved locally.")
            
        # Update user streak consecutively
        self.update_streak(user_id, duration_listened)
        return listen_record

    # --- STREAKS SYSTEM ---
    
    def update_streak(self, user_id, duration_listened):
        """
        Manages consecutive listening streaks. Minimum 5 minutes (300 seconds)
        per day required to progress. Handles weekly premium freezes.
        """
        today_str = datetime.now().strftime("%Y-%m-%d")
        yesterday_str = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        
        # Load user streak doc
        streak_data = {
            "current_streak": 0,
            "longest_streak": 0,
            "last_listen_date": "",
            "freeze_count": 0,
            "calendar": []
        }
        
        doc_ref = None
        if self._is_firebase_active():
            try:
                doc_ref = db.collection("user_streaks").document(user_id)
                doc = doc_ref.get()
                if doc.exists:
                    streak_data = doc.to_dict()
            except Exception as e:
                self.logger.error(f"Failed to fetch user streak from Firestore: {e}")
                
        elif user_id in self._local_streaks:
            streak_data = self._local_streaks[user_id]
            
        # Minimum 5 minutes listener check
        if duration_listened < 300:
            return streak_data

        calendar = streak_data.get("calendar", [])
        if today_str not in calendar:
            calendar.append(today_str)
            
        last_date = streak_data.get("last_listen_date", "")
        current = streak_data.get("current_streak", 0)
        longest = streak_data.get("longest_streak", 0)
        freezes = streak_data.get("freeze_count", 0)
        
        if last_date == today_str:
            # Already listened today, streak intact
            pass
        elif last_date == yesterday_str:
            # Listening consecutively
            current += 1
        elif last_date == "":
            # First day
            current = 1
        else:
            # Gap in listening. Check for active streak freeze
            last_date_dt = datetime.strptime(last_date, "%Y-%m-%d")
            days_diff = (datetime.now() - last_date_dt).days
            
            if days_diff <= freezes + 1:
                # Use freezes to cover the gap days
                freezes -= (days_diff - 1)
                current += 1
                self.logger.info(f"Streak preserved! Used streak freeze for gap. Freezes left: {freezes}")
            else:
                # Streak resets
                current = 1
                
        if current > longest:
            longest = current
            
        streak_data.update({
            "current_streak": current,
            "longest_streak": longest,
            "last_listen_date": today_str,
            "freeze_count": freezes,
            "calendar": calendar
        })
        
        # Save updates
        if self._is_firebase_active() and doc_ref:
            try:
                doc_ref.set(streak_data)
            except Exception as e:
                self.logger.error(f"Failed to save user streak to Firestore: {e}")
        else:
            self._local_streaks[user_id] = streak_data
            
        return streak_data

    def get_current_streak(self, user_id):
        """Returns the current streak count for the user."""
        if self._is_firebase_active():
            try:
                doc = db.collection("user_streaks").document(user_id).get()
                if doc.exists:
                    return doc.to_dict().get("current_streak", 0)
            except Exception:
                pass
        return self._local_streaks.get(user_id, {}).get("current_streak", 0)

    def get_longest_streak(self, user_id):
        """Returns the longest historical streak count for the user."""
        if self._is_firebase_active():
            try:
                doc = db.collection("user_streaks").document(user_id).get()
                if doc.exists:
                    return doc.to_dict().get("longest_streak", 0)
            except Exception:
                pass
        return self._local_streaks.get(user_id, {}).get("longest_streak", 0)

    def get_streak_calendar(self, user_id, month):
        """Returns calendar date markers for a specific month (format 'YYYY-MM')."""
        calendar_dates = []
        if self._is_firebase_active():
            try:
                doc = db.collection("user_streaks").document(user_id).get()
                if doc.exists:
                    calendar_dates = doc.to_dict().get("calendar", [])
            except Exception:
                pass
        else:
            calendar_dates = self._local_streaks.get(user_id, {}).get("calendar", [])
            
        # Filter calendar dates matching the target month prefix
        return [d for d in calendar_dates if d.startswith(month)]

    # --- LISTENING STATS ANALYTICS ---
    
    def _fetch_history(self, user_id, period="all"):
        """Fetches history records filtered by period (today, week, month, all)."""
        history = []
        
        if self._is_firebase_active():
            try:
                query = db.collection("listening_history").where("user_id", "==", user_id)
                docs = query.stream()
                history = [d.to_dict() for d in docs]
            except Exception as e:
                self.logger.error(f"Firestore history query failed: {e}")
                history = self._local_history
        else:
            history = [h for h in self._local_history if h["user_id"] == user_id]
            
        if period == "all" or not history:
            return history
            
        # Filter based on time duration
        cutoff_date = datetime.now()
        if period == "today":
            cutoff_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == "week":
            cutoff_date = datetime.now() - timedelta(days=7)
        elif period == "month":
            cutoff_date = datetime.now() - timedelta(days=30)
            
        filtered = []
        for item in history:
            try:
                item_date = datetime.fromisoformat(item["timestamp_end"])
                if item_date >= cutoff_date:
                    filtered.append(item)
            except Exception:
                # Fallback to appending if date is malformed
                filtered.append(item)
                
        return filtered

    def get_top_songs(self, user_id, period="week", limit=10):
        """Retrieves top tracks sorted by frequency within a specific timeline."""
        history = self._fetch_history(user_id, period)
        counts = {}
        for h in history:
            key = (h["track_id"], h["title"], h["artist"], h["source"], h["thumbnail"] if "thumbnail" in h else "")
            counts[key] = counts.get(key, 0) + 1
            
        sorted_counts = sorted(counts.items(), key=lambda x: x[1], reverse=True)[:limit]
        return [
            {
                "id": k[0], "title": k[1], "artist": k[2], "source": k[3], 
                "thumbnail": k[4] if len(k) > 4 else "", "play_count": count
            }
            for k, count in sorted_counts
        ]

    def get_top_artists(self, user_id, period="month", limit=10):
        """Retrieves top artists sorted by playback occurrence frequencies."""
        history = self._fetch_history(user_id, period)
        counts = {}
        for h in history:
            counts[h["artist"]] = counts.get(h["artist"], 0) + 1
            
        sorted_counts = sorted(counts.items(), key=lambda x: x[1], reverse=True)[:limit]
        return [{"artist": name, "play_count": count} for name, count in sorted_counts]

    def get_top_genres(self, user_id, period="all", limit=5):
        """Retrieves user's top genres."""
        history = self._fetch_history(user_id, period)
        counts = {}
        for h in history:
            genre = h.get("genre", "pop")
            counts[genre] = counts.get(genre, 0) + 1
            
        sorted_counts = sorted(counts.items(), key=lambda x: x[1], reverse=True)[:limit]
        return [{"genre": genre, "play_count": count} for genre, count in sorted_counts]

    def get_listening_time(self, user_id, period="today"):
        """Returns total listening time in seconds for a user during a period."""
        history = self._fetch_history(user_id, period)
        return sum(h.get("duration_listened", 0) for h in history)

    def get_listening_patterns(self, user_id):
        """Analyzes active listen patterns grouped by time_of_day and day_of_week."""
        history = self._fetch_history(user_id)
        
        times = {"morning": 0, "afternoon": 0, "evening": 0, "late_night": 0}
        days = {}
        
        for h in history:
            t = h.get("time_of_day", "afternoon")
            d = h.get("day_of_week", "Monday")
            times[t] = times.get(t, 0) + 1
            days[d] = days.get(d, 0) + 1
            
        return {
            "time_of_day": times,
            "day_of_week": days,
            "preferred_time": max(times, key=times.get) if history else "afternoon",
            "preferred_day": max(days, key=days.get) if history else "Monday"
        }

    def get_genre_breakdown(self, user_id):
        """Computes percentage breakdowns for genres listened to."""
        history = self._fetch_history(user_id)
        total = len(history)
        if total == 0:
            return {}
            
        counts = {}
        for h in history:
            genre = h.get("genre", "pop")
            counts[genre] = counts.get(genre, 0) + 1
            
        return {genre: round((count / total) * 100, 1) for genre, count in counts.items()}

    def get_source_breakdown(self, user_id):
        """Calculates breakdown stats for the different stream networks used."""
        history = self._fetch_history(user_id)
        total = len(history)
        if total == 0:
            return {}
            
        counts = {}
        for h in history:
            source = h.get("source", "ytmusic")
            counts[source] = counts.get(source, 0) + 1
            
        return {src: round((count / total) * 100, 1) for src, count in counts.items()}

    def get_skip_rate(self, user_id):
        """
        Determines the percentage skip rate of songs.
        Classified as skips if skipped before 30 seconds or less than 75% of full duration.
        """
        history = self._fetch_history(user_id)
        total = len(history)
        if total == 0:
            return 0.0
            
        skips = 0
        for h in history:
            skip_pt = h.get("skip_point")
            # If a skip second is logged, or duration listened is less than 30s
            if skip_pt is not None or h.get("duration_listened", 0) < 30:
                skips += 1
                
        return round((skips / total) * 100, 1)

    def get_discovery_rate(self, user_id):
        """Computes new song discovery rates (unique tracks vs repeated plays)."""
        history = self._fetch_history(user_id)
        total = len(history)
        if total == 0:
            return {"unique_songs": 0, "repeated_songs": 0, "discovery_ratio": 0.0}
            
        unique_tracks = set(h.get("track_id", "") for h in history)
        unique_count = len(unique_tracks)
        
        return {
            "unique_songs": unique_count,
            "repeated_songs": total - unique_count,
            "discovery_ratio": round((unique_count / total) * 100, 1)
        }

    def get_mood_timeline(self, user_id):
        """Resolves mood profiles timeline indices."""
        history = self._fetch_history(user_id)
        timeline = []
        for h in history:
            timeline.append({
                "timestamp": h.get("timestamp_end"),
                "mood": h.get("mood", "neutral")
            })
        return timeline
