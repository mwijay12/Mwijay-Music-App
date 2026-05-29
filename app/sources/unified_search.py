import asyncio
import logging
import re
import time
import threading
from concurrent.futures import ThreadPoolExecutor

# Defensive importing of fuzzywuzzy for title/artist similarity matching
try:
    from fuzzywuzzy import fuzz
except ImportError:
    # A lightweight, pure-python fallback for string similarity in case fuzzywuzzy is missing.
    class fuzz:
        @staticmethod
        def token_set_ratio(s1, s2):
            s1, s2 = str(s1).lower().strip(), str(s2).lower().strip()
            if not s1 or not s2:
                return 0
            if s1 == s2:
                return 100
            w1 = set(s1.split())
            w2 = set(s2.split())
            if not w1 or not w2:
                return 0
            intersection = w1.intersection(w2)
            ratio = (len(intersection) / max(len(w1), len(w2))) * 100
            return int(ratio)


class SearchCache:
    """A thread-safe, self-expiring in-memory cache for search results."""
    
    def __init__(self, ttl_seconds=1800):
        """Initializes the cache with a default 30-minute time-to-live."""
        self.ttl = ttl_seconds
        self.cache = {}
        self.lock = threading.Lock()
        
    def get(self, key):
        """Retrieves a cached value if it is not expired."""
        with self.lock:
            if key in self.cache:
                value, timestamp = self.cache[key]
                if time.time() - timestamp < self.ttl:
                    return value
                else:
                    del self.cache[key]  # Expire
            return None
            
    def set(self, key, value):
        """Caches a value mapped to the current timestamp."""
        with self.lock:
            self.cache[key] = (value, time.time())


class UnifiedSearch:
    """
    Coordinates simultaneous parallel searches across multiple music platforms,
    merging their metadata, ranking them by relevance, and deduplicating tracks.
    """
    
    def __init__(self, ytmusic=None, jamendo=None, lastfm=None, audius=None, archive=None, genius=None, ccmixter=None, hearthis=None, librivox=None, theaudiodb=None, deezer=None, itunes=None):
        """
        Initializes the UnifiedSearch coordinator.
        """
        self.logger = logging.getLogger("unified_search")
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
            self.logger.setLevel(logging.INFO)
            
        self.ytmusic = ytmusic
        self.jamendo = jamendo
        self.lastfm = lastfm
        self.audius = audius
        self.archive = archive
        self.genius = genius
        self.ccmixter = ccmixter
        self.hearthis = hearthis
        self.librivox = librivox
        self.theaudiodb = theaudiodb
        self.deezer = deezer
        self.itunes = itunes
        
        # ThreadPoolExecutor to run blocking synchronous SDK searches in parallel
        self.executor = ThreadPoolExecutor(max_workers=10)
        
        # Cache search queries for 30 minutes (1800 seconds)
        self.cache = SearchCache(ttl_seconds=1800)
        
    def _source_priority(self, source_name):
        """Returns priority score where 1 is highest (preferred)."""
        priorities = {
            "ytmusic": 1,
            "deezer": 2,
            "itunes": 3,
            "audius": 4,
            "jamendo": 5,
            "ccmixter": 6,
            "hearthis": 7,
            "archive": 8,
            "librivox": 9,
            "lastfm": 10,
            "genius": 11,
            "theaudiodb": 12
        }
        return priorities.get(source_name.lower().strip(), 13)

    def _get_source_quality(self, source_name):
        """Returns standard quality label for different music sources."""
        qualities = {
            "ytmusic": "high",
            "deezer": "high",
            "itunes": "high",
            "audius": "high",
            "jamendo": "medium",
            "ccmixter": "medium",
            "hearthis": "medium",
            "archive": "low",
            "librivox": "low",
            "lastfm": "medium",
            "genius": "text",
            "theaudiodb": "text"
        }
        return qualities.get(source_name.lower().strip(), "medium")

    async def _search_single_source(self, source_name, source_instance, query, limit):
        """
        Performs a query search against a single source run inside a ThreadPoolExecutor,
        with a strict 5-second deadline timeout.
        """
        if not source_instance:
            return []
            
        loop = asyncio.get_running_loop()
        try:
            # Duck-type the interface so it binds to any underlying python search methods safely
            def worker():
                if hasattr(source_instance, "search_songs"):
                    return source_instance.search_songs(query, limit=limit)
                elif hasattr(source_instance, "search"):
                    return source_instance.search(query, limit=limit)
                elif hasattr(source_instance, "search_all"):
                    res = source_instance.search_all(query)
                    if isinstance(res, dict):
                        return res.get("songs", []) + res.get("videos", [])
                    return res
                else:
                    self.logger.warning(f"Source '{source_name}' does not expose search endpoints. Skipping.")
                    return []
                    
            # Wrap standard blocking thread inside async event loops with a 5.0 second timeout
            results = await asyncio.wait_for(
                loop.run_in_executor(self.executor, worker),
                timeout=5.0
            )
            
            if not isinstance(results, list):
                results = []
                
            # Tag metadata source before flushes
            display_names = {
                "ytmusic": "ytmusic",
                "deezer": "Deezer",
                "itunes": "iTunes",
                "audius": "Audius",
                "jamendo": "Jamendo",
                "archive": "Archive.org",
                "ccmixter": "ccMixter",
                "hearthis": "HearThis.at",
                "librivox": "LibriVox",
                "lastfm": "Last.fm",
                "genius": "Genius",
                "theaudiodb": "TheAudioDB"
            }
            display_name = display_names.get(source_name.lower().strip(), source_name)
            for r in results:
                if isinstance(r, dict):
                    r["source"] = r.get("source") or display_name
                    
            return results
        except asyncio.TimeoutError:
            self.logger.warning(f"Timeout of 5.0s exceeded for source: '{source_name}'")
            return []
        except Exception as e:
            self.logger.error(f"Failed search in source '{source_name}': {e}", exc_info=True)
            return []

    def deduplicate_and_rank(self, raw_results, query):
        """
        Matches songs across multiple networks using title/artist fuzzy set ratios,
        merges their playable sources, and ranks them by query relevance.
        """
        merged_results = []
        
        for item in raw_results:
            if not item or not isinstance(item, dict):
                continue
                
            title = item.get("title", "").strip()
            artist = item.get("artist", "").strip()
            if not title:
                continue
                
            # Perform fuzzy match comparison against already aggregated tracks
            matched_song = None
            for existing in merged_results:
                title_sim = fuzz.token_set_ratio(title, existing["title"])
                artist_sim = fuzz.token_set_ratio(artist, existing["artist"])
                
                # High-confidence match threshold (85% similarity for both fields)
                if title_sim >= 85 and artist_sim >= 85:
                    matched_song = existing
                    break
                    
            source_info = {
                "name": item.get("source", "unknown"),
                "id": item.get("id", ""),
                "quality": self._get_source_quality(item.get("source", "unknown")),
                "url": item.get("url", "")
            }
            
            if matched_song:
                # Merge source listing if not already present
                if not any(s["name"] == source_info["name"] for s in matched_song["sources"]):
                    matched_song["sources"].append(source_info)
                
                # Upgrade standard metadata details if this source is of higher priority quality
                current_best = matched_song["best_source"]
                new_source = source_info["name"]
                
                if self._source_priority(new_source) < self._source_priority(current_best):
                    matched_song["best_source"] = new_source
                    matched_song["id"] = item.get("id", matched_song["id"])
                    matched_song["url"] = item.get("url", matched_song["url"])
                    if item.get("thumbnail"):
                        matched_song["thumbnail"] = item.get("thumbnail")
                    if item.get("duration") and item.get("duration") != "0:00":
                        matched_song["duration"] = item.get("duration")
                        
                if "raw_metadata" not in matched_song:
                    matched_song["raw_metadata"] = {}
                matched_song["raw_metadata"][item.get("source")] = item
            else:
                # Create a brand new merged track record
                new_song = {
                    "title": title,
                    "artist": artist,
                    "sources": [source_info],
                    "best_source": item.get("source", "unknown"),
                    "id": item.get("id", ""),
                    "url": item.get("url", ""),
                    "thumbnail": item.get("thumbnail", ""),
                    "duration": item.get("duration", "0:00"),
                    "duration_seconds": item.get("duration_seconds", 0),
                    "type": item.get("type", "song"),
                    "year": item.get("year"),
                    "raw_metadata": {item.get("source"): item}
                }
                merged_results.append(new_song)
                
        # Rank by query relevance scores
        ranked = self._rank_results(merged_results, query)
        return ranked

    def _rank_results(self, songs, query):
        """Ranks list elements based on similarity matches to the search query."""
        def rank_score(song):
            title_match = fuzz.token_set_ratio(query, song["title"])
            artist_match = fuzz.token_set_ratio(query, song["artist"])
            
            # Base score is the maximum similarity matching
            score = max(title_match, artist_match)
            
            # Boost if query matches both fields well
            if title_match > 75 and artist_match > 75:
                score += 20
                
            # Boost premium source presence
            if any(s["name"] == "ytmusic" for s in song["sources"]):
                score += 15
                
            return score
            
        return sorted(songs, key=rank_score, reverse=True)

    def search(self, query, sources="all", limit=20):
        """
        Performs a thread-safe parallel search across specified directories,
        coalescing and caching the output dictionary.
        
        Args:
            query (str): The search query phrase.
            sources (str or list): "all" or specific list of string source identifiers.
            limit (int): Max elements to fetch per channel.
            
        Returns:
            dict: An aggregated JSON-like response dictionary.
        """
        # Resolve cache lookup
        cache_key = f"{query}:{sources}:{limit}"
        cached_res = self.cache.get(cache_key)
        if cached_res:
            self.logger.info(f"Retrieving cached search results for: '{query}'")
            return cached_res
            
        # Parse active interfaces
        source_mapping = {
            "ytmusic": self.ytmusic,
            "deezer": self.deezer,
            "itunes": self.itunes,
            "jamendo": self.jamendo,
            "lastfm": self.lastfm,
            "audius": self.audius,
            "archive": self.archive,
            "genius": self.genius,
            "ccmixter": self.ccmixter,
            "hearthis": self.hearthis,
            "librivox": self.librivox,
            "theaudiodb": self.theaudiodb
        }
        
        active_sources = {}
        if sources == "all":
            active_sources = {k: v for k, v in source_mapping.items() if v is not None}
        elif isinstance(sources, list):
            for s in sources:
                s_name = s.lower().strip()
                if s_name in source_mapping and source_mapping[s_name] is not None:
                    active_sources[s_name] = source_mapping[s_name]
        elif isinstance(sources, str):
            s_name = sources.lower().strip()
            if s_name in source_mapping and source_mapping[s_name] is not None:
                active_sources[s_name] = source_mapping[s_name]
                
        if not active_sources:
            self.logger.warning("No active music interfaces loaded for search query.")
            return {"query": query, "total_results": 0, "results": [], "source_counts": {}}
            
        async def run_parallel_searches():
            tasks = []
            for s_name, s_inst in active_sources.items():
                tasks.append(self._search_single_source(s_name, s_inst, query, limit))
            results_lists = await asyncio.gather(*tasks)
            return results_lists
            
        try:
            # Spawn dedicated loop to avoid thread safety conflicts with host frameworks
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                raw_results_nested = loop.run_until_complete(run_parallel_searches())
            finally:
                loop.close()
        except Exception as run_err:
            self.logger.error(f"Event loop execution error: {run_err}. Falling back to synchronous search.")
            raw_results_nested = []
            for s_name, s_inst in active_sources.items():
                try:
                    if hasattr(s_inst, "search_songs"):
                        res = s_inst.search_songs(query, limit=limit)
                    elif hasattr(s_inst, "search"):
                        res = s_inst.search(query, limit=limit)
                    else:
                        res = []
                    for r in res:
                        if isinstance(r, dict):
                            r["source"] = s_name
                    raw_results_nested.append(res)
                except Exception as sync_err:
                    self.logger.error(f"Synchronous fallback failed for '{s_name}': {sync_err}")
                    
        # Coalesce counts
        raw_results = []
        source_counts = {}
        for i, res_list in enumerate(raw_results_nested):
            s_name = list(active_sources.keys())[i]
            if res_list:
                raw_results.extend(res_list)
                source_counts[s_name] = len(res_list)
            else:
                source_counts[s_name] = 0
                
        # Deduplicate, rank, and format
        merged = self.deduplicate_and_rank(raw_results, query)
        
        output = {
            "query": query,
            "total_results": len(merged),
            "results": merged,
            "source_counts": source_counts
        }
        
        self.cache.set(cache_key, output)
        return output

    def smart_search(self, query):
        """
        Uses keyword intent analysis to intelligently route user queries to mood lists,
        similar track recommendations, charts, or default unified searches.
        """
        query_lower = query.lower().strip()
        
        # Intent 1: Similar track recommendations ("songs like Bohemian Rhapsody")
        similar_match = re.search(r"(?:songs like|similar to|music like)\s+(.+)", query_lower)
        if similar_match:
            target_song = similar_match.group(1)
            self.logger.info(f"Smart Search Intent: Recommendations search for '{target_song}'")
            seed_search = self.search(target_song, limit=1)
            if seed_search and seed_search["results"]:
                seed_song = seed_search["results"][0]
                seed_id = seed_song.get("id")
                if self.ytmusic and seed_id:
                    recs = self.ytmusic.get_recommendations(seed_id)
                    if recs:
                        return {
                            "intent": "similar_songs",
                            "seed": seed_song,
                            "results": recs,
                            "source": "ytmusic"
                        }
            return self.search(query)
            
        # Intent 2: Trending country charts ("trending in Nigeria")
        trending_match = re.search(r"(?:trending in|charts in|top songs in)\s+(\w+)", query_lower)
        if trending_match or "trending" in query_lower or "charts" in query_lower:
            country_name = trending_match.group(1) if trending_match else "KE"
            country_map = {
                "kenya": "KE", "nigeria": "NG", "usa": "US", "uk": "GB", "uganda": "UG", "tanzania": "TZ",
                "ke": "KE", "ng": "NG", "us": "US", "gb": "GB", "ug": "UG", "tz": "TZ"
            }
            country_code = country_map.get(country_name.lower(), "KE")
            self.logger.info(f"Smart Search Intent: Charts requested for country '{country_code}'")
            if self.ytmusic:
                trending = self.ytmusic.get_trending(country=country_code)
                if trending:
                    return {
                        "intent": "trending_charts",
                        "country": country_code,
                        "results": trending,
                        "source": "ytmusic"
                    }
            return self.search(query)
            
        # Intent 3: Mood searches ("play something sad")
        mood_keywords = ["sad", "happy", "pumped", "chill", "workout", "romantic", "focused", "relax", "melancholy"]
        found_mood = None
        for mood in mood_keywords:
            if mood in query_lower:
                found_mood = mood
                break
                
        if found_mood or "mood" in query_lower:
            self.logger.info(f"Smart Search Intent: Mood search detected: '{found_mood or 'general'}'")
            search_query = f"{found_mood or ''} music playlists".strip()
            return self.search(search_query)
            
        # Default fallback
        self.logger.info("Smart Search Intent: Default search")
        return self.search(query)

    def get_best_source(self, track_info):
        """
        Given a track dictionary, returns the highest quality playable source
        according to priority: YTMusic > Audius > Jamendo > Archive.
        """
        if not track_info or "sources" not in track_info:
            return None
            
        sources = track_info["sources"]
        if not sources:
            return None
            
        # Sort by numerical source priority mapping
        sorted_sources = sorted(sources, key=lambda s: self._source_priority(s["name"]))
        return sorted_sources[0]
