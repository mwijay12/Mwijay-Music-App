import json
import urllib.request
import urllib.parse
import logging
import os

logger = logging.getLogger("other_sources")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

class JamendoSource:
    def __init__(self):
        self.keys = [
            os.getenv("JAMENDO_CLIENT_ID_1", "f28b4a9b"),
            os.getenv("JAMENDO_CLIENT_ID_2", "a2d99c7d")
        ]

    def search(self, query, limit=20):
        for key in self.keys:
            url = f"https://api.jamendo.com/v3.0/tracks/?client_id={key}&format=jsonpretty&limit={limit}&search={urllib.parse.quote(query)}"
            try:
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
                with urllib.request.urlopen(req, timeout=5) as response:
                    data = json.loads(response.read().decode('utf-8'))
                    results = []
                    for track in data.get('results', []):
                        duration_sec = int(track.get('duration', 0))
                        minutes = duration_sec // 60
                        seconds = duration_sec % 60
                        duration_str = f"{minutes}:{seconds:02d}"
                        results.append({
                            "source": "Jamendo",
                            "id": f"jamendo-{track.get('id')}",
                            "title": track.get('name'),
                            "artist": track.get('artist_name', 'Unknown Artist'),
                            "album": track.get('album_name') or "Jamendo Single",
                            "duration": duration_str,
                            "duration_seconds": duration_sec,
                            "thumbnail": track.get('image') or "",
                            "url": track.get('audio'),
                            "type": "song"
                        })
                    if results:
                        return results
            except Exception as e:
                logger.warning(f"Jamendo query failed with key {key}: {e}")
        return []

class AudiusSource:
    def search(self, query, limit=20):
        url = f"https://discoveryprovider.audius.co/v1/tracks/search?query={urllib.parse.quote(query)}&app_name=MwijayMusicApp&limit={limit}"
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
            with urllib.request.urlopen(req, timeout=5) as response:
                data = json.loads(response.read().decode('utf-8'))
                results = []
                for track in data.get('data', []):
                    duration_sec = int(track.get('duration', 0))
                    minutes = duration_sec // 60
                    seconds = duration_sec % 60
                    duration_str = f"{minutes}:{seconds:02d}"
                    results.append({
                        "source": "Audius",
                        "id": f"audius-{track.get('id')}",
                        "title": track.get('title'),
                        "artist": track.get('user', {}).get('name', 'Unknown Artist'),
                        "album": "Audius Single",
                        "duration": duration_str,
                        "duration_seconds": duration_sec,
                        "thumbnail": track.get('artwork', {}).get('480x480') or "",
                        "url": f"https://discoveryprovider.audius.co/v1/tracks/{track.get('id')}/stream",
                        "type": "song"
                    })
                return results
        except Exception as e:
            logger.warning(f"Audius query failed: {e}")
            return []

class ArchiveSource:
    def search(self, query, limit=20):
        search_query = f"({query}) AND mediatype:(audio)"
        url = f"https://archive.org/advancedsearch.php?q={urllib.parse.quote(search_query)}&fl[]=identifier,title,creator,downloads,subject&sort[]=downloads+desc&rows={limit}&output=json"
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
            with urllib.request.urlopen(req, timeout=5) as response:
                data = json.loads(response.read().decode('utf-8'))
                results = []
                docs = data.get('response', {}).get('docs', [])
                for doc in docs:
                    identifier = doc.get('identifier')
                    if not identifier:
                        continue
                    creator = doc.get('creator', 'Unknown Artist')
                    if isinstance(creator, list):
                        creator = ", ".join(creator)
                    results.append({
                        "source": "Archive.org",
                        "id": f"archive-{identifier}",
                        "title": doc.get('title', 'Untitled'),
                        "artist": creator,
                        "album": "Archive.org Audio",
                        "duration": "0:00",
                        "duration_seconds": 0,
                        "thumbnail": "",
                        "url": "",  # Client resolves on play or download
                        "type": "song"
                    })
                return results
        except Exception as e:
            logger.warning(f"Archive.org query failed: {e}")
            return []

class CcMixterSource:
    def search(self, query, limit=20):
        url = f"https://ccmixter.org/api/query?tags={urllib.parse.quote(query)}&f=json&limit={limit}"
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
            with urllib.request.urlopen(req, timeout=5) as response:
                data = json.loads(response.read().decode('utf-8'))
                results = []
                for track in data:
                    files = track.get('files', [])
                    download_url = files[0].get('download_url') if files else ""
                    if not download_url:
                        continue
                    results.append({
                        "source": "ccMixter",
                        "id": f"ccmixter-{track.get('id')}",
                        "title": track.get('item_name'),
                        "artist": track.get('user_name', 'Unknown Artist'),
                        "album": "ccMixter Beat",
                        "duration": "0:00",
                        "duration_seconds": 0,
                        "thumbnail": "",
                        "url": download_url,
                        "type": "song"
                    })
                return results
        except Exception as e:
            logger.warning(f"ccMixter query failed: {e}")
            return []

class HearThisSource:
    def search(self, query, limit=20):
        url = f"https://hearthis.at/api/search?q={urllib.parse.quote(query)}&count={limit}&page=1"
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
            with urllib.request.urlopen(req, timeout=5) as response:
                data = json.loads(response.read().decode('utf-8'))
                if not isinstance(data, list):
                    return []
                results = []
                for track in data:
                    try:
                        duration_sec = int(track.get('duration', 0))
                    except ValueError:
                        duration_sec = 0
                    minutes = duration_sec // 60
                    seconds = duration_sec % 60
                    duration_str = f"{minutes}:{seconds:02d}"
                    results.append({
                        "source": "HearThis.at",
                        "id": f"hearthis-{track.get('id')}",
                        "title": track.get('title'),
                        "artist": track.get('user', {}).get('username', 'Unknown Artist'),
                        "album": "HearThis Vibe",
                        "duration": duration_str,
                        "duration_seconds": duration_sec,
                        "thumbnail": track.get('thumb') or "",
                        "url": track.get('stream_url'),
                        "type": "song"
                    })
                return results
        except Exception as e:
            logger.warning(f"HearThis.at query failed: {e}")
            return []

class LibriVoxSource:
    def search(self, query, limit=20):
        url = f"https://librivox.org/api/feed/audiobooks/?title=~{urllib.parse.quote(query)}&format=json"
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
            with urllib.request.urlopen(req, timeout=5) as response:
                data = json.loads(response.read().decode('utf-8'))
                books = data.get('books', [])
                if not isinstance(books, list):
                    return []
                results = []
                for book in books[:limit]:
                    stream_url = book.get('url_zip_file') or ""
                    identifier = ""
                    if 'archive.org/download/' in stream_url:
                        parts = stream_url.split('archive.org/download/')
                        if len(parts) > 1:
                            identifier = parts[1].split('/')[0]
                    
                    final_url = ""
                    if not identifier:
                        final_url = book.get('url_rss') or book.get('url_zip_file') or ""
                    
                    try:
                        totallength = book.get('totallength')
                        duration_sec = int(totallength) if totallength else 0
                    except ValueError:
                        duration_sec = 0
                    minutes = duration_sec // 60
                    seconds = duration_sec % 60
                    duration_str = f"{minutes}:{seconds:02d}"
                    
                    authors = book.get('authors', [])
                    author_names = ", ".join([f"{a.get('first_name', '')} {a.get('last_name', '')}".strip() for a in authors]) if authors else "LibriVox Reader"
                    
                    results.append({
                        "source": "LibriVox",
                        "id": f"archive-{identifier}" if identifier else f"librivox-{book.get('id')}",
                        "title": book.get('title', 'Untitled Book'),
                        "artist": author_names,
                        "album": "LibriVox Audiobook",
                        "duration": duration_str,
                        "duration_seconds": duration_sec,
                        "thumbnail": "",
                        "url": final_url,
                        "type": "song"
                    })
                return results
        except Exception as e:
            logger.warning(f"LibriVox query failed: {e}")
            return []

class LastFMSource:
    def __init__(self):
        self.api_key = os.getenv("LASTFM_API_KEY", "3b5fffb881a309d9ab9c7ed625394753")

    def search(self, query, limit=20):
        url = f"https://ws.audioscrobbler.com/2.0/?method=track.search&track={urllib.parse.quote(query)}&api_key={self.api_key}&format=json&limit={limit}"
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
            with urllib.request.urlopen(req, timeout=5) as response:
                data = json.loads(response.read().decode('utf-8'))
                tracks = data.get('results', {}).get('trackmatches', {}).get('track', [])
                results = []
                for track in tracks:
                    images = track.get('image', [])
                    img_url = images[-1].get('#text') if images else ""
                    results.append({
                        "source": "Last.fm",
                        "id": f"lastfm-{track.get('mbid') or track.get('name')}",
                        "title": track.get('name'),
                        "artist": track.get('artist', 'Unknown Artist'),
                        "album": "Last.fm Entry",
                        "duration": "0:00",
                        "duration_seconds": 0,
                        "thumbnail": img_url or "",
                        "url": track.get('url') or "",
                        "type": "song"
                    })
                return results
        except Exception as e:
            logger.warning(f"Last.fm query failed: {e}")
            return []

class GeniusSource:
    def __init__(self):
        self.token = os.getenv("GENIUS_ACCESS_TOKEN", "UzOGslLV5dBAiD6DqBUmrBCXOpW91bcKt8ep52tgAemUetCdedV7SVNmwHm0bSs9")

    def search(self, query, limit=20):
        url = f"https://api.genius.com/search?q={urllib.parse.quote(query)}"
        try:
            req = urllib.request.Request(url, headers={
                'Authorization': f'Bearer {self.token}',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            })
            with urllib.request.urlopen(req, timeout=5) as response:
                data = json.loads(response.read().decode('utf-8'))
                hits = data.get('response', {}).get('hits', [])
                results = []
                for hit in hits[:limit]:
                    song = hit.get('result', {})
                    results.append({
                        "source": "Genius",
                        "id": f"genius-{song.get('id')}",
                        "title": song.get('title'),
                        "artist": song.get('primary_artist', {}).get('name', 'Unknown Artist'),
                        "album": "Genius Lyric Page",
                        "duration": "0:00",
                        "duration_seconds": 0,
                        "thumbnail": song.get('song_art_image_thumbnail_url') or "",
                        "url": song.get('url') or "",
                        "type": "song"
                    })
                return results
        except Exception as e:
            logger.warning(f"Genius query failed: {e}")
            return []

class TheAudioDBSource:
    def __init__(self):
        self.api_key = os.getenv("AUDIODB_API_KEY", "123")

    def search(self, query, limit=20):
        # TheAudioDB search endpoint for artists: search.php?s={artist}
        url = f"https://www.theaudiodb.com/api/v1/json/{self.api_key}/search.php?s={urllib.parse.quote(query)}"
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
            with urllib.request.urlopen(req, timeout=5) as response:
                content = response.read().decode('utf-8').strip()
                if not content:
                    return []
                data = json.loads(content)
                artists = data.get('artists')
                if not artists:
                    return []
                results = []
                for artist in artists[:limit]:
                    results.append({
                        "source": "TheAudioDB",
                        "id": f"audiodb-{artist.get('idArtist')}",
                        "title": f"Profile: {artist.get('strArtist')}",
                        "artist": artist.get('strArtist', 'Unknown Artist'),
                        "album": artist.get('strGenre') or "Artist Profile",
                        "duration": "0:00",
                        "duration_seconds": 0,
                        "thumbnail": artist.get('strArtistBanner') or artist.get('strArtistThumb') or "",
                        "url": f"https://www.theaudiodb.com/artist/{artist.get('idArtist')}",
                        "type": "artist"
                    })
                return results
        except Exception as e:
            logger.warning(f"TheAudioDB query failed: {e}")
            return []

class DeezerSource:
    def search(self, query, limit=20):
        url = f"https://api.deezer.com/search?q={urllib.parse.quote(query)}&limit={limit}"
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
            with urllib.request.urlopen(req, timeout=5) as response:
                data = json.loads(response.read().decode('utf-8'))
                results = []
                for track in data.get('data', []):
                    duration_sec = int(track.get('duration', 0))
                    minutes = duration_sec // 60
                    seconds = duration_sec % 60
                    duration_str = f"{minutes}:{seconds:02d}"
                    results.append({
                        "source": "Deezer",
                        "id": f"deezer-{track.get('id')}",
                        "title": track.get('title'),
                        "artist": track.get('artist', {}).get('name', 'Unknown Artist'),
                        "album": track.get('album', {}).get('title', 'Deezer Album'),
                        "duration": duration_str,
                        "duration_seconds": duration_sec,
                        "thumbnail": track.get('album', {}).get('cover_medium') or track.get('artist', {}).get('picture_medium') or "",
                        "url": track.get('preview') or "",
                        "type": "song"
                    })
                return results
        except Exception as e:
            logger.warning(f"Deezer query failed: {e}")
            return []

    def get_chart(self, limit=20):
        url = f"https://api.deezer.com/chart/0/tracks?limit={limit}"
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
            with urllib.request.urlopen(req, timeout=5) as response:
                data = json.loads(response.read().decode('utf-8'))
                results = []
                for track in data.get('data', []):
                    duration_sec = int(track.get('duration', 0))
                    minutes = duration_sec // 60
                    seconds = duration_sec % 60
                    duration_str = f"{minutes}:{seconds:02d}"
                    results.append({
                        "source": "Deezer",
                        "id": f"deezer-{track.get('id')}",
                        "title": track.get('title'),
                        "artist": track.get('artist', {}).get('name', 'Unknown Artist'),
                        "album": track.get('album', {}).get('title', 'Deezer Album'),
                        "duration": duration_str,
                        "duration_seconds": duration_sec,
                        "thumbnail": track.get('album', {}).get('cover_medium') or track.get('artist', {}).get('picture_medium') or "",
                        "url": track.get('preview') or "",
                        "type": "song"
                    })
                return results
        except Exception as e:
            logger.warning(f"Deezer chart failed: {e}")
            return []

class ITunesSource:
    def search(self, query, limit=20):
        url = f"https://itunes.apple.com/search?term={urllib.parse.quote(query)}&media=music&limit={limit}"
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
            with urllib.request.urlopen(req, timeout=5) as response:
                data = json.loads(response.read().decode('utf-8'))
                results = []
                for track in data.get('results', []):
                    duration_ms = track.get('trackTimeMillis', 0)
                    duration_sec = duration_ms // 1000
                    minutes = duration_sec // 60
                    seconds = duration_sec % 60
                    duration_str = f"{minutes}:{seconds:02d}"
                    results.append({
                        "source": "iTunes",
                        "id": f"itunes-{track.get('trackId')}",
                        "title": track.get('trackName'),
                        "artist": track.get('artistName', 'Unknown Artist'),
                        "album": track.get('collectionName', 'iTunes Single'),
                        "duration": duration_str,
                        "duration_seconds": duration_sec,
                        "thumbnail": track.get('artworkUrl100') or "",
                        "url": track.get('previewUrl') or "",
                        "type": "song"
                    })
                return results
        except Exception as e:
            logger.warning(f"iTunes query failed: {e}")
            return []

    def get_chart(self, country="tz", limit=20):
        url = f"https://itunes.apple.com/{country}/rss/topsongs/limit={limit}/json"
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
            with urllib.request.urlopen(req, timeout=5) as response:
                data = json.loads(response.read().decode('utf-8'))
                entries = data.get('feed', {}).get('entry', [])
                if isinstance(entries, dict):
                    entries = [entries]
                
                results = []
                for entry in entries:
                    track_id = entry.get('id', {}).get('attributes', {}).get('im:id')
                    title = entry.get('im:name', {}).get('label')
                    artist = entry.get('im:artist', {}).get('label', 'Unknown Artist')
                    
                    images = entry.get('im:image', [])
                    thumbnail = images[-1].get('label') if images else ""
                    
                    links = entry.get('link', [])
                    if isinstance(links, dict):
                        links = [links]
                    
                    preview_url = ""
                    duration_sec = 0
                    for link in links:
                        attrs = link.get('attributes', {})
                        if attrs.get('im:duration'):
                            duration_sec = int(attrs.get('im:duration')) // 1000
                        if attrs.get('type') == 'audio/x-m4a' or attrs.get('title') == 'Preview':
                            preview_url = attrs.get('href', '')
                            
                    minutes = duration_sec // 60
                    seconds = duration_sec % 60
                    duration_str = f"{minutes}:{seconds:02d}" if duration_sec else "0:30"
                    
                    results.append({
                        "source": "iTunes",
                        "id": f"itunes-{track_id}" if track_id else f"itunes-chart-{hash(title + artist)}",
                        "title": title,
                        "artist": artist,
                        "album": "iTunes Top Charts",
                        "duration": duration_str,
                        "duration_seconds": duration_sec or 30,
                        "thumbnail": thumbnail,
                        "url": preview_url,
                        "type": "song"
                    })
                return results
        except Exception as e:
            logger.warning(f"iTunes charts failed for country {country}: {e}")
            return []
