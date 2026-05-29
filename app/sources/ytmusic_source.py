import logging
import os
import json
import time
import threading
from ytmusicapi import YTMusic

class YTMusicSource:
    """
    A unified wrapper for YouTube Music API (ytmusicapi) supporting authenticated
    and guest modes with standard data schemas, robust error handling, rate limiting,
    and extensive logging.
    """
    
    def __init__(self, auth_path="oauth.json", rate_limit_delay=0.5):
        """
        Initializes the YTMusicSource.
        
        Args:
            auth_path (str): Path to oauth.json or browser headers file.
            rate_limit_delay (float): Seconds to delay between requests to avoid rate limits.
        """
        # Configure logging
        self.logger = logging.getLogger("ytmusic_source")
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
            self.logger.setLevel(logging.INFO)
            
        self.auth_path = auth_path
        self.rate_limit_delay = rate_limit_delay
        self.last_request_time = 0.0
        self._lock = threading.Lock()
        self.yt = None
        self.authenticated = False
        
        self._initialize_api()
        
    def _initialize_api(self):
        """Attempts to load YTMusic in authenticated mode, falling back to guest mode on failure."""
        try:
            if self.auth_path and os.path.exists(self.auth_path):
                self.logger.info(f"Attempting to load YTMusic with credentials at {self.auth_path}...")
                
                # Check if it's a valid JSON file
                try:
                    with open(self.auth_path, "r", encoding="utf-8") as f:
                        json.load(f)
                except Exception as json_err:
                    self.logger.warning(f"Credentials file {self.auth_path} is not valid JSON. Trying as raw headers string: {json_err}")
                
                self.yt = YTMusic(self.auth_path)
                self.authenticated = True
                self.logger.info("Successfully initialized YTMusic in AUTHENTICATED mode.")
            else:
                self.logger.info("No credentials file found. Initializing YTMusic in GUEST mode.")
                self.yt = YTMusic()
                self.authenticated = False
                self.logger.info("Successfully initialized YTMusic in GUEST mode.")
        except Exception as e:
            self.logger.error(f"Failed to initialize YTMusic with credentials: {e}. Falling back to GUEST mode...")
            try:
                self.yt = YTMusic()
                self.authenticated = False
                self.logger.info("Successfully initialized YTMusic in GUEST mode after fallback.")
            except Exception as fallback_err:
                self.logger.critical(f"Failed to initialize YTMusic even in GUEST mode: {fallback_err}")
                raise fallback_err

    def _rate_limit(self):
        """Throttles requests to avoid getting rate-limited or blocked by YouTube."""
        with self._lock:
            now = time.time()
            elapsed = now - self.last_request_time
            if elapsed < self.rate_limit_delay:
                sleep_time = self.rate_limit_delay - elapsed
                time.sleep(sleep_time)
            self.last_request_time = time.time()

    def _to_standard_format(self, item, item_type=None):
        """
        Converts a ytmusicapi item dictionary into the standard music source format.
        
        Args:
            item (dict): Raw item metadata from ytmusicapi.
            item_type (str, optional): Overrides inferred item type ('song', 'video', 'album', 'artist').
            
        Returns:
            dict: The standardized music source dictionary, or None on processing failure.
        """
        try:
            if not item:
                return None
            
            # Determine the item type
            res_type = item_type or item.get("resultType")
            if not res_type:
                # Infer from fields
                if "videoId" in item:
                    res_type = "song"  # default to song
                elif "browseId" in item:
                    if item.get("type") == "artist" or "subscribers" in item:
                        res_type = "artist"
                    else:
                        res_type = "album"
                else:
                    res_type = "song"
                    
            # Safe ID extraction
            item_id = item.get("videoId") or item.get("browseId") or item.get("playlistId")
            if not item_id:
                item_id = ""

            # Extract title
            title = item.get("title") or item.get("name") or "Unknown"

            # Extract artist(s)
            artist_name = "Unknown Artist"
            artists_data = item.get("artists")
            if artists_data:
                if isinstance(artists_data, list):
                    names = []
                    for a in artists_data:
                        if isinstance(a, dict) and "name" in a:
                            names.append(a["name"])
                        elif isinstance(a, str):
                            names.append(a)
                    if names:
                        artist_name = ", ".join(names)
                elif isinstance(artists_data, str):
                    artist_name = artists_data
            elif item.get("artist"):
                artist_data = item.get("artist")
                if isinstance(artist_data, list):
                    artist_name = ", ".join([a.get("name", "") if isinstance(a, dict) else str(a) for a in artist_data])
                elif isinstance(artist_data, dict):
                    artist_name = artist_data.get("name", "Unknown Artist")
                else:
                    artist_name = str(artist_data)
            elif res_type == "artist":
                artist_name = title

            # Extract album
            album_name = None
            album_data = item.get("album")
            if album_data:
                if isinstance(album_data, dict):
                    album_name = album_data.get("name")
                else:
                    album_name = str(album_data)
            elif res_type == "album":
                album_name = title

            # Extract duration
            duration = item.get("duration")
            duration_sec = item.get("duration_seconds")
            if duration_sec is not None:
                duration_sec = int(duration_sec)
                if not duration:
                    minutes = duration_sec // 60
                    seconds = duration_sec % 60
                    duration = f"{minutes}:{seconds:02d}"
            elif duration:
                # Try to calculate seconds from duration string "MM:SS" or "HH:MM:SS"
                try:
                    parts = list(map(int, duration.split(":")))
                    if len(parts) == 2:
                        duration_sec = parts[0] * 60 + parts[1]
                    elif len(parts) == 3:
                        duration_sec = parts[0] * 3600 + parts[1] * 60 + parts[2]
                except Exception:
                    duration_sec = None

            # Extract thumbnail (highest resolution available)
            thumbnail_url = None
            thumbnails = item.get("thumbnails")
            if thumbnails and isinstance(thumbnails, list):
                try:
                    # Take the highest resolution thumbnail (usually last one)
                    thumbnail_url = thumbnails[-1].get("url")
                except IndexError:
                    pass
            
            # Build standard URL
            if res_type in ["song", "video"]:
                url = f"https://music.youtube.com/watch?v={item_id}" if item_id else ""
            elif res_type == "album":
                url = f"https://music.youtube.com/browse/{item_id}" if item_id else ""
            elif res_type == "artist":
                url = f"https://music.youtube.com/channel/{item_id}" if item_id else ""
            else:
                url = f"https://music.youtube.com/watch?v={item_id}" if item_id else ""

            # Extract year
            year = item.get("year")
            if year:
                try:
                    year = int(year)
                except ValueError:
                    import re
                    match = re.search(r"\b\d{4}\b", str(year))
                    if match:
                        year = int(match.group(0))
                    else:
                        year = None
            else:
                year = None

            return {
                "source": "ytmusic",
                "id": item_id,
                "title": title,
                "artist": artist_name,
                "album": album_name,
                "duration": duration or "0:00",
                "duration_seconds": duration_sec or 0,
                "thumbnail": thumbnail_url or "",
                "url": url,
                "year": year,
                "type": res_type
            }
        except Exception as e:
            self.logger.error(f"Error converting item to standard format: {e}", exc_info=True)
            return None

    def search_songs(self, query, limit=20):
        """
        Searches YouTube Music for songs matching the query.
        
        Args:
            query (str): The search query.
            limit (int): Maximum number of results to return.
            
        Returns:
            list: A list of song dictionaries formatted in the standard schema.
        """
        self._rate_limit()
        try:
            self.logger.info(f"Searching songs for: '{query}' (limit={limit})")
            results = self.yt.search(query, filter="songs", limit=limit)
            standardized = []
            for r in results:
                item = self._to_standard_format(r, item_type="song")
                if item:
                    standardized.append(item)
            return standardized
        except Exception as e:
            self.logger.error(f"Error in search_songs for query '{query}': {e}", exc_info=True)
            return []

    def search_videos(self, query, limit=20):
        """
        Searches YouTube Music for music videos matching the query.
        
        Args:
            query (str): The search query.
            limit (int): Maximum number of results to return.
            
        Returns:
            list: A list of video dictionaries formatted in the standard schema.
        """
        self._rate_limit()
        try:
            self.logger.info(f"Searching videos for: '{query}' (limit={limit})")
            results = self.yt.search(query, filter="videos", limit=limit)
            standardized = []
            for r in results:
                item = self._to_standard_format(r, item_type="video")
                if item:
                    standardized.append(item)
            return standardized
        except Exception as e:
            self.logger.error(f"Error in search_videos for query '{query}': {e}", exc_info=True)
            return []

    def search_albums(self, query, limit=10):
        """
        Searches YouTube Music for albums matching the query.
        
        Args:
            query (str): The search query.
            limit (int): Maximum number of results to return.
            
        Returns:
            list: A list of album dictionaries formatted in the standard schema.
        """
        self._rate_limit()
        try:
            self.logger.info(f"Searching albums for: '{query}' (limit={limit})")
            results = self.yt.search(query, filter="albums", limit=limit)
            standardized = []
            for r in results:
                item = self._to_standard_format(r, item_type="album")
                if item:
                    standardized.append(item)
            return standardized
        except Exception as e:
            self.logger.error(f"Error in search_albums for query '{query}': {e}", exc_info=True)
            return []

    def search_artists(self, query, limit=10):
        """
        Searches YouTube Music for artists matching the query.
        
        Args:
            query (str): The search query.
            limit (int): Maximum number of results to return.
            
        Returns:
            list: A list of artist dictionaries formatted in the standard schema.
        """
        self._rate_limit()
        try:
            self.logger.info(f"Searching artists for: '{query}' (limit={limit})")
            results = self.yt.search(query, filter="artists", limit=limit)
            standardized = []
            for r in results:
                item = self._to_standard_format(r, item_type="artist")
                if item:
                    standardized.append(item)
            return standardized
        except Exception as e:
            self.logger.error(f"Error in search_artists for query '{query}': {e}", exc_info=True)
            return []

    def search_all(self, query):
        """
        Searches YouTube Music for songs, videos, albums, and artists all at once.
        
        Args:
            query (str): The search query.
            
        Returns:
            dict: A dictionary categorized by result type, each containing lists in standard schema.
        """
        self._rate_limit()
        try:
            self.logger.info(f"Performing global search for: '{query}'")
            results = self.yt.search(query)
            categorized = {
                "songs": [],
                "videos": [],
                "albums": [],
                "artists": [],
                "other": []
            }
            for r in results:
                item_type = r.get("resultType")
                item = self._to_standard_format(r)
                if not item:
                    continue
                    
                if item_type == "song":
                    categorized["songs"].append(item)
                elif item_type == "video":
                    categorized["videos"].append(item)
                elif item_type == "album":
                    categorized["albums"].append(item)
                elif item_type == "artist":
                    categorized["artists"].append(item)
                else:
                    categorized["other"].append(item)
            return categorized
        except Exception as e:
            self.logger.error(f"Error in search_all for query '{query}': {e}", exc_info=True)
            return {"songs": [], "videos": [], "albums": [], "artists": [], "other": []}

    def get_song_details(self, video_id):
        """
        Retrieves full details and metadata for a specific song.
        
        Args:
            video_id (str): The unique YouTube video ID.
            
        Returns:
            dict: Standard formatted dictionary with extra details if available.
        """
        self._rate_limit()
        try:
            self.logger.info(f"Getting song details for video_id: {video_id}")
            song_data = self.yt.get_song(video_id)
            
            video_details = song_data.get("videoDetails", {})
            
            title = video_details.get("title") or "Unknown Song"
            artist = video_details.get("author") or "Unknown Artist"
            duration_sec = video_details.get("lengthSeconds")
            if duration_sec:
                try:
                    duration_sec = int(duration_sec)
                    minutes = duration_sec // 60
                    seconds = duration_sec % 60
                    duration = f"{minutes}:{seconds:02d}"
                except ValueError:
                    duration = "0:00"
                    duration_sec = 0
            else:
                duration = "0:00"
                duration_sec = 0
                
            thumbnails = video_details.get("thumbnail", {}).get("thumbnails", [])
            thumbnail_url = thumbnails[-1].get("url") if thumbnails else ""
            
            standard_metadata = {
                "source": "ytmusic",
                "id": video_id,
                "title": title,
                "artist": artist,
                "album": None,
                "duration": duration,
                "duration_seconds": duration_sec,
                "thumbnail": thumbnail_url,
                "url": f"https://music.youtube.com/watch?v={video_id}",
                "year": None,
                "type": "song"
            }
            
            standard_metadata["raw"] = {
                "description": video_details.get("shortDescription"),
                "view_count": video_details.get("viewCount"),
                "is_live": video_details.get("isLiveContent"),
            }
            return standard_metadata
        except Exception as e:
            self.logger.error(f"Error getting song details for {video_id}: {e}", exc_info=True)
            return None

    def get_album_details(self, album_id):
        """
        Retrieves metadata and track list for a specific album.
        
        Args:
            album_id (str): The unique YouTube Music album browse ID.
            
        Returns:
            dict: A dictionary containing album details (in standard format) and a list of tracks.
        """
        self._rate_limit()
        try:
            self.logger.info(f"Getting album details for album_id: {album_id}")
            album_data = self.yt.get_album(album_id)
            
            standard_album = self._to_standard_format(album_data, item_type="album")
            if not standard_album:
                standard_album = {
                    "source": "ytmusic",
                    "id": album_id,
                    "title": album_data.get("title", "Unknown Album"),
                    "artist": "Unknown Artist",
                    "album": album_data.get("title", "Unknown Album"),
                    "duration": "0:00",
                    "duration_seconds": 0,
                    "thumbnail": "",
                    "url": f"https://music.youtube.com/browse/{album_id}",
                    "year": album_data.get("year"),
                    "type": "album"
                }
                
            artists = album_data.get("artists")
            if artists:
                if isinstance(artists, list):
                    standard_album["artist"] = ", ".join([a.get("name", "") if isinstance(a, dict) else str(a) for a in artists])
                elif isinstance(artists, str):
                    standard_album["artist"] = artists

            tracks = []
            raw_tracks = album_data.get("tracks", [])
            for t in raw_tracks:
                track_item = self._to_standard_format(t, item_type="song")
                if track_item:
                    track_item["album"] = standard_album["title"]
                    if not track_item["thumbnail"]:
                        track_item["thumbnail"] = standard_album["thumbnail"]
                    if track_item["artist"] == "Unknown Artist":
                        track_item["artist"] = standard_album["artist"]
                    tracks.append(track_item)
                    
            return {
                "album": standard_album,
                "description": album_data.get("description"),
                "tracks": tracks,
                "track_count": len(tracks),
                "duration": album_data.get("duration", "0:00")
            }
        except Exception as e:
            self.logger.error(f"Error getting album details for {album_id}: {e}", exc_info=True)
            return None

    def get_artist_details(self, artist_id):
        """
        Retrieves biography, metadata, and top songs/releases for a specific artist channel.
        
        Args:
            artist_id (str): The unique YouTube Music artist channel ID (browseId).
            
        Returns:
            dict: A dictionary containing artist info (standard format) and their categorized discography.
        """
        self._rate_limit()
        try:
            self.logger.info(f"Getting artist details for artist_id: {artist_id}")
            artist_data = self.yt.get_artist(artist_id)
            
            standard_artist = self._to_standard_format(artist_data, item_type="artist")
            if not standard_artist:
                standard_artist = {
                    "source": "ytmusic",
                    "id": artist_id,
                    "title": artist_data.get("name", "Unknown Artist"),
                    "artist": artist_data.get("name", "Unknown Artist"),
                    "album": None,
                    "duration": "0:00",
                    "duration_seconds": 0,
                    "thumbnail": "",
                    "url": f"https://music.youtube.com/channel/{artist_id}",
                    "year": None,
                    "type": "artist"
                }
                
            discography = {
                "songs": [],
                "albums": [],
                "singles": [],
                "videos": []
            }
            
            # Parse songs section
            songs_sec = artist_data.get("songs", {})
            songs_list = songs_sec.get("results", []) or songs_sec.get("items", []) or []
            for s in songs_list:
                item = self._to_standard_format(s, item_type="song")
                if item:
                    item["artist"] = standard_artist["title"]
                    discography["songs"].append(item)
                    
            # Parse albums section
            albums_sec = artist_data.get("albums", {})
            albums_list = albums_sec.get("results", []) or albums_sec.get("items", []) or []
            for a in albums_list:
                item = self._to_standard_format(a, item_type="album")
                if item:
                    item["artist"] = standard_artist["title"]
                    discography["albums"].append(item)
                    
            # Parse singles/EPs section
            singles_sec = artist_data.get("singles", {})
            singles_list = singles_sec.get("results", []) or singles_sec.get("items", []) or []
            for s in singles_list:
                item = self._to_standard_format(s, item_type="album")
                if item:
                    item["artist"] = standard_artist["title"]
                    discography["singles"].append(item)
                    
            # Parse videos section
            videos_sec = artist_data.get("videos", {})
            videos_list = videos_sec.get("results", []) or videos_sec.get("items", []) or []
            for v in videos_list:
                item = self._to_standard_format(v, item_type="video")
                if item:
                    item["artist"] = standard_artist["title"]
                    discography["videos"].append(item)
                    
            return {
                "artist": standard_artist,
                "description": artist_data.get("description"),
                "subscribers": artist_data.get("subscribers"),
                "discography": discography,
                "views": artist_data.get("views")
            }
        except Exception as e:
            self.logger.error(f"Error getting artist details for {artist_id}: {e}", exc_info=True)
            return None

    def get_lyrics(self, video_id):
        """
        Retrieves the lyrics for a given video_id.
        
        Args:
            video_id (str): The unique YouTube video ID.
            
        Returns:
            dict: Dictionary with lyrics string or None.
        """
        self._rate_limit()
        try:
            self.logger.info(f"Fetching watch playlist to get lyrics browse ID for video_id: {video_id}")
            watch_playlist = self.yt.get_watch_playlist(videoId=video_id)
            lyrics_id = watch_playlist.get("lyrics")
            if not lyrics_id:
                self.logger.warning(f"No lyrics ID found for video_id: {video_id}")
                return {"lyrics": None, "source": "ytmusic", "id": video_id}
            
            self.logger.info(f"Fetching lyrics text with lyrics_id: {lyrics_id}")
            lyrics_data = self.yt.get_lyrics(lyrics_id)
            return {
                "lyrics": lyrics_data.get("lyrics"),
                "source": "ytmusic",
                "id": video_id
            }
        except Exception as e:
            self.logger.error(f"Error fetching lyrics for video_id {video_id}: {e}", exc_info=True)
            return {"lyrics": None, "source": "ytmusic", "id": video_id, "error": str(e)}

    def get_song_credits(self, video_id):
        """
        Retrieves producers, writers, songwriters, and performers credits for a song.
        
        Args:
            video_id (str): The unique YouTube video ID.
            
        Returns:
            dict: A dictionary containing credits parsed by role/responsibility.
        """
        self._rate_limit()
        try:
            self.logger.info(f"Getting song credits for video_id: {video_id}")
            if hasattr(self.yt, "get_song_credits"):
                credits_data = self.yt.get_song_credits(video_id)
                return {
                    "source": "ytmusic",
                    "id": video_id,
                    "credits": credits_data
                }
            else:
                self.logger.warning("YTMusic.get_song_credits is not available in the installed version of ytmusicapi. Falling back.")
                return {
                    "source": "ytmusic",
                    "id": video_id,
                    "credits": [],
                    "note": "Feature not supported by the local ytmusicapi package version."
                }
        except Exception as e:
            self.logger.error(f"Error getting song credits for {video_id}: {e}", exc_info=True)
            return {"source": "ytmusic", "id": video_id, "credits": [], "error": str(e)}

    def get_trending(self, country="KE"):
        """
        Retrieves currently trending music videos/songs in a specific country.
        
        Args:
            country (str): ISO 3166-1 Alpha-2 country code (default 'KE' for Kenya).
            
        Returns:
            list: A list of standard formatted song/video dicts trending in that country.
        """
        self._rate_limit()
        try:
            self.logger.info(f"Fetching trending charts for country: '{country}'")
            charts = self.yt.get_charts(country=country)
            trending_data = charts.get("trending", {})
            items = trending_data.get("items", [])
            
            standardized = []
            for item in items:
                formatted = self._to_standard_format(item, item_type="video")
                if formatted:
                    standardized.append(formatted)
            return standardized
        except Exception as e:
            self.logger.error(f"Error fetching trending charts for country '{country}': {e}", exc_info=True)
            return []

    def get_charts(self, country="US"):
        """
        Retrieves global or regional top songs, videos, and artists charts.
        
        Args:
            country (str): ISO 3166-1 Alpha-2 country code (default 'US').
            
        Returns:
            dict: Categorized top songs, videos, artists, and trending lists formatted in standard schema.
        """
        self._rate_limit()
        try:
            self.logger.info(f"Fetching complete music charts for country: '{country}'")
            charts = self.yt.get_charts(country=country)
            
            formatted_charts = {
                "country": country,
                "songs": [],
                "videos": [],
                "artists": []
            }
            
            # Songs
            songs_items = charts.get("songs", {}).get("items", [])
            for item in songs_items:
                formatted = self._to_standard_format(item, item_type="song")
                if formatted:
                    formatted_charts["songs"].append(formatted)
                    
            # Videos
            videos_items = charts.get("videos", {}).get("items", [])
            for item in videos_items:
                formatted = self._to_standard_format(item, item_type="video")
                if formatted:
                    formatted_charts["videos"].append(formatted)
                    
            # Artists
            artists_items = charts.get("artists", {}).get("items", [])
            for item in artists_items:
                formatted = self._to_standard_format(item, item_type="artist")
                if formatted:
                    formatted_charts["artists"].append(formatted)
                    
            return formatted_charts
        except Exception as e:
            self.logger.error(f"Error fetching charts for country '{country}': {e}", exc_info=True)
            return {"country": country, "songs": [], "videos": [], "artists": []}

    def get_moods_and_genres(self):
        """
        Fetches moods and genres categories available for browsing.
        
        Returns:
            dict: A dictionary of mood and genre titles mapped to their API query parameters.
        """
        self._rate_limit()
        try:
            self.logger.info("Fetching moods and genres categories...")
            categories = self.yt.get_mood_categories()
            return categories
        except Exception as e:
            self.logger.error(f"Error fetching moods and genres: {e}", exc_info=True)
            return {}

    def get_mood_playlists(self, params):
        """
        Retrieves the curated playlists for a specific mood or genre parameter string.
        
        Args:
            params (str): The parameter string retrieved from get_moods_and_genres.
            
        Returns:
            list: A list of standard formatted playlists.
        """
        self._rate_limit()
        try:
            self.logger.info("Fetching playlists for mood/genre params...")
            playlists = self.yt.get_mood_playlists(params)
            standardized = []
            for p in playlists:
                formatted = {
                    "source": "ytmusic",
                    "id": p.get("playlistId"),
                    "title": p.get("title", "Curated Playlist"),
                    "artist": "YouTube Music Curator",
                    "album": None,
                    "duration": None,
                    "duration_seconds": None,
                    "thumbnail": p.get("thumbnails", [{}])[-1].get("url") if p.get("thumbnails") else "",
                    "url": f"https://music.youtube.com/playlist?list={p.get('playlistId')}" if p.get("playlistId") else "",
                    "year": None,
                    "type": "playlist"
                }
                standardized.append(formatted)
            return standardized
        except Exception as e:
            self.logger.error(f"Error fetching mood playlists: {e}", exc_info=True)
            return []

    def get_recommendations(self, video_id):
        """
        Retrieves personalized or contextual recommendations (related songs) based on a song.
        
        Args:
            video_id (str): The unique YouTube video ID.
            
        Returns:
            list: A list of standard formatted song/video dicts.
        """
        self._rate_limit()
        try:
            self.logger.info(f"Fetching recommendations for video_id: {video_id}")
            
            try:
                related = self.yt.get_song_related(video_id)
                related_tracks = []
                if isinstance(related, list):
                    for section in related:
                        if isinstance(section, dict):
                            contents = section.get("contents", [])
                            for item in contents:
                                formatted = self._to_standard_format(item, item_type="song")
                                if formatted:
                                    related_tracks.append(formatted)
                        else:
                            formatted = self._to_standard_format(section, item_type="song")
                            if formatted:
                                related_tracks.append(formatted)
                
                if related_tracks:
                    self.logger.info(f"Retrieved {len(related_tracks)} similar songs via get_song_related.")
                    return related_tracks
            except Exception as related_err:
                self.logger.warning(f"get_song_related failed: {related_err}. Falling back to watch playlist queue...")

            # Fallback to get_watch_playlist
            watch_playlist = self.yt.get_watch_playlist(videoId=video_id, limit=20)
            tracks = watch_playlist.get("tracks", [])
            standardized = []
            for t in tracks:
                if t.get("videoId") == video_id:
                    continue
                formatted = self._to_standard_format(t, item_type="song")
                if formatted:
                    standardized.append(formatted)
            return standardized
        except Exception as e:
            self.logger.error(f"Error fetching recommendations for {video_id}: {e}", exc_info=True)
            return []

    def get_watch_playlist(self, video_id):
        """
        Retrieves the upcoming autoplay queue/playlist starting from a song.
        
        Args:
            video_id (str): The seed YouTube video ID.
            
        Returns:
            dict: A dictionary containing track list (standard formatted), title, and optional lyrics browse ID.
        """
        self._rate_limit()
        try:
            self.logger.info(f"Fetching watch playlist queue for video_id: {video_id}")
            watch_data = self.yt.get_watch_playlist(videoId=video_id, limit=25)
            
            tracks = []
            raw_tracks = watch_data.get("tracks", [])
            for t in raw_tracks:
                formatted = self._to_standard_format(t, item_type="song")
                if formatted:
                    tracks.append(formatted)
                    
            return {
                "tracks": tracks,
                "lyrics_id": watch_data.get("lyrics"),
                "playlist_id": watch_data.get("playlistId")
            }
        except Exception as e:
            self.logger.error(f"Error fetching watch playlist for {video_id}: {e}", exc_info=True)
            return {"tracks": [], "lyrics_id": None, "playlist_id": None}

    def get_user_playlists(self):
        """
        Retrieves playlists created or saved in the authenticated user's library.
        
        Returns:
            list: A list of standard formatted playlists.
        """
        if not self.authenticated:
            self.logger.warning("Attempted to access library playlists in guest mode. Action not supported.")
            return []
            
        self._rate_limit()
        try:
            self.logger.info("Retrieving library playlists for authenticated user...")
            playlists = self.yt.get_library_playlists()
            standardized = []
            for p in playlists:
                formatted = {
                    "source": "ytmusic",
                    "id": p.get("playlistId"),
                    "title": p.get("title", "My Playlist"),
                    "artist": "User Playlist",
                    "album": None,
                    "duration": None,
                    "duration_seconds": None,
                    "thumbnail": p.get("thumbnails", [{}])[-1].get("url") if p.get("thumbnails") else "",
                    "url": f"https://music.youtube.com/playlist?list={p.get('playlistId')}" if p.get("playlistId") else "",
                    "year": None,
                    "type": "playlist"
                }
                standardized.append(formatted)
            return standardized
        except Exception as e:
            self.logger.error(f"Error getting library playlists: {e}", exc_info=True)
            return []

    def create_playlist(self, name, description, tracks=None):
        """
        Creates a new playlist in the user's library.
        
        Args:
            name (str): Playlist name/title.
            description (str): Detailed description.
            tracks (list, optional): List of YouTube video/song IDs to pre-populate.
            
        Returns:
            str: The unique created playlistId, or None on failure.
        """
        if not self.authenticated:
            self.logger.warning("Attempted to create playlist in guest mode. Action not supported.")
            return None
            
        self._rate_limit()
        try:
            self.logger.info(f"Creating library playlist: '{name}'")
            video_ids = tracks if isinstance(tracks, list) else []
            playlist_id = self.yt.create_playlist(title=name, description=description, videoIds=video_ids)
            self.logger.info(f"Successfully created playlist with ID: {playlist_id}")
            return playlist_id
        except Exception as e:
            self.logger.error(f"Error creating playlist '{name}': {e}", exc_info=True)
            return None

    def add_to_playlist(self, playlist_id, video_ids):
        """
        Appends songs to an existing user playlist.
        
        Args:
            playlist_id (str): The unique target playlist ID.
            video_ids (list): A list of YouTube video IDs to append.
            
        Returns:
            bool: True if successful, False otherwise.
        """
        if not self.authenticated:
            self.logger.warning("Attempted to modify playlist in guest mode. Action not supported.")
            return False
            
        if not isinstance(video_ids, list) or not video_ids:
            self.logger.warning("Invalid list of video_ids provided for add_to_playlist.")
            return False
            
        self._rate_limit()
        try:
            self.logger.info(f"Adding {len(video_ids)} songs to playlist ID: {playlist_id}")
            status = self.yt.add_playlist_items(playlistId=playlist_id, videoIds=video_ids)
            self.logger.info(f"Finished adding playlist items: {status}")
            return True
        except Exception as e:
            self.logger.error(f"Error adding items to playlist {playlist_id}: {e}", exc_info=True)
            return False

    def get_listening_history(self):
        """
        Retrieves the authenticated user's YouTube Music playback history.
        
        Returns:
            list: A list of standard formatted song/video dicts in the user's history.
        """
        if not self.authenticated:
            self.logger.warning("Attempted to fetch listening history in guest mode. Action not supported.")
            return []
            
        self._rate_limit()
        try:
            self.logger.info("Fetching listening history...")
            history = self.yt.get_history()
            standardized = []
            for h in history:
                formatted = self._to_standard_format(h)
                if formatted:
                    standardized.append(formatted)
            return standardized
        except Exception as e:
            self.logger.error(f"Error getting listening history: {e}", exc_info=True)
            return []
