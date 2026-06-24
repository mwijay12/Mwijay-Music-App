import logging
import os
import uvicorn
from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

# Import core modules
# Import core modules
from app.sources.ytmusic_source import YTMusicSource
from app.sources.other_sources import (
    JamendoSource, AudiusSource, ArchiveSource, CcMixterSource,
    HearThisSource, LibriVoxSource, LastFMSource, GeniusSource, TheAudioDBSource,
    DeezerSource, ITunesSource
)
from app.sources.unified_search import UnifiedSearch
from app.ai.mood_dj import MoodDJ
from app.analytics.listening_stats import ListeningStats
from app.analytics.wrapped import MwijayWrapped
from app.audio.audio_engine import MwijayAudioEngine

# Initialize logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("mwijay_server")

# Instantiate FastAPI application
app = FastAPI(
    title="Mwijay Music Engine API",
    description="The unified Python AI, DSP audio effects, listening analytics, and gamification microservice for Mwijay Music App.",
    version="1.0.0"
)

# Configure CORS Middleware (Crucial for React Vite client-side queries)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── INITIALIZE BACKEND MODULES ──────────────────
logger.info("Instantiating core backend providers...")
try:
    ytmusic = YTMusicSource(auth_path="oauth.json")
    jamendo = JamendoSource()
    lastfm = LastFMSource()
    audius = AudiusSource()
    archive = ArchiveSource()
    genius = GeniusSource()
    ccmixter = CcMixterSource()
    hearthis = HearThisSource()
    librivox = LibriVoxSource()
    theaudiodb = TheAudioDBSource()
    deezer = DeezerSource()
    itunes = ITunesSource()
    
    unified_search = UnifiedSearch(
        ytmusic=ytmusic,
        jamendo=jamendo,
        lastfm=lastfm,
        audius=audius,
        archive=archive,
        genius=genius,
        ccmixter=ccmixter,
        hearthis=hearthis,
        librivox=librivox,
        theaudiodb=theaudiodb,
        deezer=deezer,
        itunes=itunes
    )
    mood_dj = MoodDJ(unified_search=unified_search)
    listening_stats = ListeningStats()
    wrapped = MwijayWrapped(listening_stats=listening_stats)
    audio_engine = MwijayAudioEngine()
    logger.info("All backend engine modules loaded successfully.")
except Exception as e:
    logger.error(f"Failed to load engine components: {e}", exc_info=True)
    raise e

# ─── PYDANTIC MODELS FOR REQUEST PAYLOADS ────────

class AudioTranscribeRequest(BaseModel):
    audio_url: Optional[str] = None
    audio_base64: Optional[str] = None
    mime_type: Optional[str] = None

class MoodPlaylistRequest(BaseModel):
    user_input: str = Field(..., example="feeling pumped for the gym")
    num_songs: int = Field(default=15, ge=1, le=50)

class EmojiMoodRequest(BaseModel):
    emojis: str = Field(..., example="🔥💪🏃")

class MoodTransitionRequest(BaseModel):
    current_mood: str = Field(..., example="sad")
    target_mood: str = Field(..., example="happy")
    num_songs: int = Field(default=10, ge=2, le=30)

class TimeMoodRequest(BaseModel):
    time_of_day: Optional[str] = Field(default=None, example="morning")

class ListenLogRequest(BaseModel):
    user_id: str
    track_data: Dict[str, Any]
    duration_listened: int = Field(..., ge=0)
    device_type: str = "mobile"
    skip_point: Optional[int] = None

# Gamification request schemas removed (calculations are fully client-side now)

class AudioXrayRequest(BaseModel):
    audio_path: str
    metadata: Optional[Dict[str, Any]] = None

class AudioQuizRequest(BaseModel):
    audio_path: str
    duration: int = Field(default=5, ge=1, le=20)

class AudioEffectRequest(BaseModel):
    input_path: str
    output_path: str
    preset_name: str

class AudioKaraokeRequest(BaseModel):
    input_path: str
    output_dir: str

class AudioBeatTapRequest(BaseModel):
    input_path: str


# ─── API HEALTH CHECK ───────────────────────────

@app.get("/health", tags=["General"])
def health_check():
    """Returns the operational status of the Mwijay Music Engine microservice."""
    return {
        "status": "online",
        "firebase_active": listening_stats._is_firebase_active(),
        "gemini_active": mood_dj.is_online,
        "ytmusic_authenticated": ytmusic.authenticated
    }


# ─── SEARCH & DISCOVERY ENDPOINTS ───────────────

@app.get("/api/search", tags=["Search"])
def execute_search(
    q: str = Query(..., description="The query string to search for"),
    sources: str = Query("all", description="all, or comma-separated list of sources"),
    limit: int = Query(20, ge=1, le=50)
):
    """Performs a parallel, deduplicated search across active platforms (YTMusic, Jamendo, Audius, etc.)."""
    logger.info(f"API Executing search: '{q}' (sources={sources})")
    try:
        source_list = "all"
        if sources != "all":
            source_list = [s.strip() for s in sources.split(",")]
        return unified_search.search(q, sources=source_list, limit=limit)
    except Exception as e:
        logger.error(f"Search API failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/search/smart", tags=["Search"])
def execute_smart_search(q: str = Query(..., description="User voice or text search query")):
    """Analyses query intents to route directly to recommendations, country charts, or mood lists."""
    logger.info(f"API Executing smart search: '{q}'")
    try:
        return unified_search.smart_search(q)
    except Exception as e:
        logger.error(f"Smart Search API failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/deezer/search", tags=["Search"])
def deezer_search(q: str = Query(...), limit: int = 20):
    """Searches Deezer for tracks."""
    try:
        return deezer.search(q, limit=limit)
    except Exception as e:
        logger.error(f"Deezer search API failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/deezer/chart", tags=["Discovery"])
def deezer_chart(limit: int = 20):
    """Retrieves top tracks from Deezer global charts."""
    try:
        return deezer.get_chart(limit=limit)
    except Exception as e:
        logger.error(f"Deezer chart API failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/itunes/search", tags=["Search"])
def itunes_search(q: str = Query(...), limit: int = 20):
    """Searches iTunes for tracks."""
    try:
        return itunes.search(q, limit=limit)
    except Exception as e:
        logger.error(f"iTunes search API failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/itunes/chart", tags=["Discovery"])
def itunes_chart(country: str = "tz", limit: int = 20):
    """Retrieves top tracks from country-specific iTunes RSS feeds."""
    try:
        return itunes.get_chart(country=country, limit=limit)
    except Exception as e:
        logger.error(f"iTunes chart API failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/ytdlp/stream", tags=["Audio Engine"])
def get_ytdlp_stream(q: str = Query(...)):
    """Resolves and extracts a high-fidelity playable streaming audio URL using yt-dlp fallback."""
    try:
        import urllib.request
        import urllib.parse
        import re
        import json
        
        video_id = None
        if "youtube.com" in q or "youtu.be" in q:
            match = re.search(r"(?:v=|\/)([0-9A-Za-z_-]{11})", q)
            if match:
                video_id = match.group(1)
        else:
            search_res = ytmusic.search_songs(q, limit=1)
            if search_res:
                video_id = search_res[0].get("id")
        
        if not video_id:
            search_url = f"https://www.youtube.com/results?search_query={urllib.parse.quote(q)}"
            req = urllib.request.Request(search_url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=5) as response:
                html = response.read().decode('utf-8')
                video_ids = re.findall(r"watch\?v=([0-9A-Za-z_-]{11})", html)
                if video_ids:
                    video_id = video_ids[0]
                    
        if not video_id:
            raise HTTPException(status_code=404, detail="Could not resolve song on YouTube.")
            
        try:
            import yt_dlp
            ydl_opts = {
                'format': 'bestaudio/best',
                'quiet': True,
                'no_warnings': True,
                'skip_download': True
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
                stream_url = info.get('url')
                if stream_url:
                    return {"success": True, "videoId": video_id, "url": stream_url}
        except Exception as yt_err:
            logger.warning(f"yt_dlp extraction failed: {yt_err}. Using open invidious API proxy fallback...")
            
        invidious_instances = [
            "https://invidious.flokinet.to",
            "https://yewtu.be",
            "https://inv.tux.im"
        ]
        for inst in invidious_instances:
            try:
                url = f"{inst}/api/v1/videos/{video_id}"
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req, timeout=4) as response:
                    data = json.loads(response.read().decode('utf-8'))
                    format_streams = data.get('adaptiveFormats', [])
                    audio_streams = [f for f in format_streams if 'audio' in f.get('type', '')]
                    if audio_streams:
                        audio_streams.sort(key=lambda x: int(x.get('bitrate', 0)), reverse=True)
                        stream_url = audio_streams[0].get('url')
                        if stream_url:
                            return {"success": True, "videoId": video_id, "url": stream_url}
            except Exception as e:
                logger.debug(f"Invidious instance {inst} failed: {e}")
                
        return {
            "success": True, 
            "videoId": video_id, 
            "url": f"https://www.youtube.com/watch?v={video_id}",
            "note": "direct stream extraction failed, returning watch page URL"
        }
    except Exception as e:
        logger.error(f"ytdlp stream API failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── GEMINI AI MOOD DJ ENDPOINTS ────────────────

@app.post("/api/mood/playlist", tags=["Mood DJ"])
def create_mood_playlist(req: MoodPlaylistRequest):
    """Curates a playlist tailored to user natural language statements using Gemini AI."""
    logger.info(f"API Mood Playlist curation requested for: '{req.user_input}'")
    try:
        return mood_dj.create_mood_playlist(req.user_input, num_songs=req.num_songs)
    except Exception as e:
        logger.error(f"Mood Playlist API failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/mood/emoji", tags=["Mood DJ"])
def create_emoji_playlist(req: EmojiMoodRequest):
    """Translates a chain of raw emojis into structured emotional playlists."""
    logger.info(f"API Emoji Playlist requested for: '{req.emojis}'")
    try:
        return mood_dj.mood_from_emoji(req.emojis)
    except Exception as e:
        logger.error(f"Emoji Playlist API failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/mood/transition", tags=["Mood DJ"])
def create_mood_transition(req: MoodTransitionRequest):
    """Generates a playlist that gradually shifts tempos and positive valence between two vibes."""
    logger.info(f"API Mood Transition requested: '{req.current_mood}' ➔ '{req.target_mood}'")
    try:
        return mood_dj.mood_transition(req.current_mood, req.target_mood, num_songs=req.num_songs)
    except Exception as e:
        logger.error(f"Mood Transition API failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/mood/time", tags=["Mood DJ"])
def create_time_based_playlist(req: TimeMoodRequest):
    """Returns custom morning, afternoon, evening, or late night sessions."""
    logger.info(f"API Time-based Playlist requested: '{req.time_of_day}'")
    try:
        return mood_dj.time_based_mood(req.time_of_day)
    except Exception as e:
        logger.error(f"Time-based Playlist API failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class AnalyzeRequest(BaseModel):
    title: str
    artist: str
    lyrics: str

class ExplainLineRequest(BaseModel):
    line: str
    context: str
    artist: str

@app.post("/api/lyrics/analyze", tags=["AI Lyrics"])
async def analyze_lyrics(req: AnalyzeRequest):
    """Analyze full song lyrics with Gemini AI"""
    import google.generativeai as genai
    import json
    
    primary_key = os.getenv("GEMINI_API_KEY") or mood_dj.api_key
    if not primary_key:
        raise HTTPException(status_code=500, detail="Gemini API Key is missing. Please set GEMINI_API_KEY.")
        
    genai.configure(api_key=primary_key)
    model = genai.GenerativeModel('gemini-1.5-flash')
    
    prompt = f"""You are a senior musicologist, expert lyricist, and premium music critic specializing in East African music, Bongo Flava, and global lyricism. Perform a deep, high-fidelity, and serious semantic lyric analysis.

Song: "{req.title}" by {req.artist}

Lyrics:
{req.lyrics}

Analyze the poetic structure, literary themes, and Swahili cultural motifs (such as miseemo, methali, or local slang if Swahili). Return ONLY valid JSON in this exact format:
{
  "theme": "Core underlying theme in 3-6 words, highly precise",
  "mood": "Atmosphere and emotional state in 2-3 words",
  "meaning": "A deep, sophisticated, and insightful explanation of the song's core message, cultural relevance, and artistic significance (3-4 sentences).",
  "key_lines": ["3 most impactful lyrics (with original Swahili/slang if applicable) along with a very brief explanation of their poetic weight"],
  "emotions": ["list", "of", "specific", "nuanced", "emotions", "evoked"],
  "story": "A rich narrative summary outlining the lyric journey, character arcs, and thematic resolution of the song (3-4 sentences).",
  "metaphors": ["Detailed breakdowns of notable metaphors, Swahili double entendres (miseemo), wordplay, or cultural idioms decoded with scholarly precision"]
}

Be insightful, deep, and poetic. Do NOT make simple grade-school summaries.
Return ONLY the JSON, no other text. Do NOT use markdown code blocks or backticks."""
    
    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        
        # Clean response tags if any
        if text.startswith('```json'):
            text = text[7:]
        if text.startswith('```'):
            text = text[3:]
        if text.endswith('```'):
            text = text[:-3]
        text = text.strip()
        
        analysis = json.loads(text)
        
        return {
            "success": True,
            "analysis": analysis,
        }
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Gemini analysis: {text}")
        raise HTTPException(status_code=500, detail=f"Failed to parse AI response: {str(e)}")
    except Exception as e:
        logger.error(f"Lyrics Analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.post("/api/lyrics/explain-line", tags=["AI Lyrics"])
async def explain_line(req: ExplainLineRequest):
    """Explain meaning of a specific lyric line using Gemini AI"""
    import google.generativeai as genai
    
    primary_key = os.getenv("GEMINI_API_KEY") or mood_dj.api_key
    if not primary_key:
        raise HTTPException(status_code=500, detail="Gemini API Key is missing. Please set GEMINI_API_KEY.")
        
    genai.configure(api_key=primary_key)
    model = genai.GenerativeModel('gemini-1.5-flash')
    
    prompt = f"""You are a professional musicologist, literary expert, and cultural specialist in Swahili poetry and global lyricism. Explain the deep hidden meaning, double entendre, Swahili cultural context, or metaphor of this specific line with immense precision and poetic beauty.

Artist: {req.artist}
Line: "{req.line}"
Song context: {req.context}

Provide a deep, sophisticated, and highly insightful 3-4 sentence musicological critique of what this line truly signifies. 
If the line contains Swahili idioms (miseemo), Tanzanian slang, or regional metaphors, explain the deep cultural subtext and decode its meaning elegantly.
Be insightful and serious. Avoid grade-school simplifications."""
    
    try:
        response = model.generate_content(prompt)
        return {
            "success": True,
            "explanation": response.text.strip(),
        }
    except Exception as e:
        logger.error(f"Lyrics line explanation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Explanation failed: {str(e)}")


# ─── LISTENING STATISTICS & STREAKS ENDPOINTS ───

@app.post("/api/listen/log", status_code=status.HTTP_201_CREATED, tags=["Analytics"])
def log_listen_session(req: ListenLogRequest):
    """Saves a listening session to Firestore, updating user consecutive-day streaks."""
    logger.info(f"API Log Listen: logging '{req.track_data.get('title')}' for user {req.user_id}")
    try:
        return listening_stats.log_listen(
            user_id=req.user_id,
            track_data=req.track_data,
            duration_listened=req.duration_listened,
            device_type=req.device_type,
            skip_point=req.skip_point
        )
    except Exception as e:
        logger.error(f"Log Listen API failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stats/dashboard", tags=["Analytics"])
def get_user_analytics_dashboard(user_id: str = Query(...)):
    """Aggregates all listening breakdown percentages, skip rates, and schedules."""
    try:
        return {
            "total_listening_time_sec": listening_stats.get_listening_time(user_id, period="all"),
            "today_listening_time_sec": listening_stats.get_listening_time(user_id, period="today"),
            "skip_rate_percentage": listening_stats.get_skip_rate(user_id),
            "discovery_rate": listening_stats.get_discovery_rate(user_id),
            "genre_percentages": listening_stats.get_genre_breakdown(user_id),
            "source_percentages": listening_stats.get_source_breakdown(user_id),
            "patterns": listening_stats.get_listening_patterns(user_id),
            "streak": {
                "current": listening_stats.get_current_streak(user_id),
                "longest": listening_stats.get_longest_streak(user_id)
            }
        }
    except Exception as e:
        logger.error(f"Stats Dashboard API failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stats/top-songs", tags=["Analytics"])
def get_top_songs(user_id: str = Query(...), period: str = "week", limit: int = 10):
    return listening_stats.get_top_songs(user_id, period, limit)

@app.get("/api/stats/top-artists", tags=["Analytics"])
def get_top_artists(user_id: str = Query(...), period: str = "month", limit: int = 10):
    return listening_stats.get_top_artists(user_id, period, limit)

@app.get("/api/stats/wrapped", tags=["Analytics"])
def get_annual_wrapped(user_id: str = Query(...), year: int = Query(2026)):
    """Compiles Spotify-Wrapped styled carousel slide decks for the user."""
    logger.info(f"API Annual Wrapped requested for user {user_id} ({year})")
    try:
        return wrapped.get_wrapped_slides(user_id, year)
    except Exception as e:
        logger.error(f"Wrapped Slides API failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ─── GAMIFICATION & XP LEVELS ENDPOINTS (DEPRECATED) ─────────
# Gamification endpoints are deprecated. Calculations are completed 100% locally on the React/TypeScript client.


# ─── DSP SOUND EFFECTS & ANALYSIS ENDPOINTS ──────

@app.post("/api/audio/xray", tags=["Audio Engine"])
def get_song_xray(req: AudioXrayRequest):
    """Generates spectral waveforms, downbeat game timings, and Gemini AI music theory facts."""
    try:
        return audio_engine.full_song_xray(req.audio_path, req.metadata)
    except Exception as e:
        logger.error(f"Song X-Ray API failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/audio/quiz-clip", tags=["Audio Engine"])
def slice_quiz_song(req: AudioQuizRequest):
    """Cuts a high-fidelity 5-second slice from a random sweet spot for song quiz recognition."""
    try:
        return audio_engine.prepare_quiz_song(req.audio_path, req.duration)
    except Exception as e:
        logger.error(f"Quiz Clip Slicer API failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/audio/effects", tags=["Audio Engine"])
def apply_pedalboard_preset(req: AudioEffectRequest):
    """Alters pitch or inserts professional studio Chorus/Reverb using Spotify's Pedalboard."""
    try:
        res_path = audio_engine.apply_effect(req.input_path, req.preset_name, req.output_path)
        return {"success": True, "output_path": res_path}
    except Exception as e:
        logger.error(f"Audio Effect Preset API failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/audio/karaoke", tags=["Audio Engine"])
def separate_karaoke_vocals(req: AudioKaraokeRequest):
    """Strips vocals to generate high-fidelity backing accompaniment files for Karaoke mode."""
    try:
        res = audio_engine.make_karaoke_version(req.input_path, req.output_dir)
        return {"success": True, **res}
    except Exception as e:
        logger.error(f"Vocal Source Separation API failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/audio/beat-tap", tags=["Audio Engine"])
def get_rhythmic_beat_coordinates(req: AudioBeatTapRequest):
    """Extracts millisecond downbeat timestamp vectors mapped to tap difficulty indexes."""
    try:
        return audio_engine.get_beat_tap_data(req.input_path)
    except Exception as e:
        logger.error(f"Beat Tap API failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── FORISMATIC PROXY ENDPOINT ───────────────────

@app.get("/proxy/quote", tags=["Quotes"])
def proxy_quote():
    """Proxies request to Forismatic API to bypass CORS limitations on the client side."""
    import urllib.request
    import json
    url = "https://api.forismatic.com/api/1.0/?method=getQuote&format=json&lang=en"
    try:
        req = urllib.request.Request(
            url,
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            data = response.read().decode('utf-8')
            # Forismatic sometimes returns invalid escaped characters like \'
            cleaned = data.replace("\\'", "'")
            try:
                parsed = json.loads(cleaned)
                return parsed
            except json.JSONDecodeError:
                # If still invalid, try replacing other escape sequences or raise
                raise HTTPException(status_code=502, detail="Invalid JSON response from Forismatic.")
    except Exception as e:
        logger.error(f"Forismatic quote proxy failed: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to fetch quote from Forismatic: {str(e)}")


@app.post("/api/audio/transcribe", tags=["Audio Engine"])
def transcribe_audio_track(req: AudioTranscribeRequest):
    """Downloads/decodes audio and transcribes it word-for-word in synchronized timed LRC format using Gemini AI."""
    import base64
    import uuid
    import time
    import json
    
    # Load fallback api keys
    keys_env = os.getenv("GEMINI_KEYS")
    api_keys = [k.strip() for k in keys_env.split(",") if k.strip()] if keys_env else []
    primary_key = os.getenv("GEMINI_API_KEY") or mood_dj.api_key
    if primary_key and primary_key not in api_keys:
        api_keys.insert(0, primary_key)
        
    if not api_keys:
        logger.error("No Gemini API keys configured.")
        raise HTTPException(status_code=500, detail="Gemini API Key is missing. Please set GEMINI_API_KEY or GEMINI_KEYS.")
        
    try:
        import google.generativeai as genai
    except ImportError:
        logger.error("google-generativeai library is not installed.")
        raise HTTPException(status_code=500, detail="google-generativeai library is not installed.")

    # Create temp directory
    os.makedirs("temp_audio", exist_ok=True)
    file_id = str(uuid.uuid4())
    
    # Determine extension
    ext = ".mp3"
    mime_type = req.mime_type or "audio/mp3"
    if "wav" in mime_type:
        ext = ".wav"
    elif "ogg" in mime_type:
        ext = ".ogg"
    elif "webm" in mime_type:
        ext = ".webm"
        
    temp_file_path = f"temp_audio/{file_id}{ext}"
    
    try:
        # Step 1: Write file locally
        if req.audio_base64:
            logger.info("Decoding base64 audio transcription payload...")
            audio_bytes = base64.b64decode(req.audio_base64)
            with open(temp_file_path, "wb") as f:
                f.write(audio_bytes)
        elif req.audio_url:
            logger.info(f"Downloading stream URL for transcription: {req.audio_url}")
            import urllib.request
            download_req = urllib.request.Request(
                req.audio_url,
                headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
            )
            with urllib.request.urlopen(download_req, timeout=30) as response:
                with open(temp_file_path, "wb") as f:
                    f.write(response.read())
        else:
            raise HTTPException(status_code=400, detail="Either audio_url or audio_base64 must be provided.")
            
        # Verify file exists and is not empty
        if not os.path.exists(temp_file_path) or os.path.getsize(temp_file_path) == 0:
            raise HTTPException(status_code=400, detail="Failed to retrieve or store audio track locally.")
            
        # Try transcription with each API key until success
        last_error = None
        for idx, key in enumerate(api_keys):
            try:
                logger.info(f"Attempting transcription using Gemini key index {idx}...")
                genai.configure(api_key=key)
                
                # Step 2: Upload to Gemini Files API
                logger.info(f"Uploading file '{temp_file_path}' to Gemini API...")
                audio_file = genai.upload_file(path=temp_file_path)
                
                # Step 3: Wait for file processing
                wait_start = time.time()
                while audio_file.state.name == "PROCESSING":
                    if time.time() - wait_start > 60:
                        raise TimeoutError("Gemini file processing timed out.")
                    time.sleep(1)
                    audio_file = genai.get_file(audio_file.name)
                    
                if audio_file.state.name == "FAILED":
                    raise ValueError("Gemini file processing failed.")
                    
                # Step 4: Perform timed transcription using gemini-1.5-flash
                logger.info(f"Invoking Gemini model to transcribe audio file: {audio_file.name}")
                model = genai.GenerativeModel("gemini-1.5-flash")
                
                prompt = """
                Analyze this audio file and perform a highly accurate, timed, word-for-word lyrics transcription.
                If the song is in Swahili, transcribe in Swahili. If it is in English, transcribe in English.
                Return ONLY a JSON object matching this exact structure (no markdown, no backticks, no code block notation):
                {
                    "lyrics": "plain text lyrics line-by-line",
                    "segments": [
                        {"timestamp": "MM:SS", "content": "Line of lyrics"},
                        ...
                    ]
                }
                Ensure the timestamps are formatted exactly as MM:SS and correspond precisely to the time of speech in the audio.
                """
                
                response = model.generate_content(
                    [audio_file, prompt],
                    generation_config={"response_mime_type": "application/json"}
                )
                
                # Step 5: Clean up Gemini file immediately
                try:
                    logger.info(f"Cleaning up Gemini uploaded file: {audio_file.name}")
                    genai.delete_file(audio_file.name)
                except Exception as delete_err:
                    logger.warning(f"Failed to delete Gemini upload: {delete_err}")
                    
                # Return parsed JSON response
                try:
                    transcription_result = json.loads(response.text.strip())
                    return transcription_result
                except Exception as parse_err:
                    logger.error(f"Failed to parse Gemini JSON transcription output: {parse_err}. Raw content: {response.text}")
                    clean_text = response.text.replace("```json", "").replace("```", "").strip()
                    try:
                        return json.loads(clean_text)
                    except Exception:
                        raise HTTPException(status_code=502, detail=f"Gemini returned invalid JSON lyrics layout: {response.text}")
                        
            except Exception as err:
                err_str = str(err).lower()
                if any(x in err_str for x in ["429", "quota", "exhausted", "limit", "invalid", "api key"]):
                    logger.warning(f"Gemini transcription failed with key index {idx}. Error: {err}. Rotating keys...")
                    last_error = err
                    try:
                        if 'audio_file' in locals() and audio_file:
                            genai.delete_file(audio_file.name)
                    except Exception:
                        pass
                    continue
                else:
                    logger.error(f"Non-rotating error during transcription: {err}")
                    raise err
        
        # If all keys failed
        logger.error("All Gemini API keys failed for transcription.")
        raise HTTPException(status_code=500, detail=f"All configured Gemini API keys failed: {last_error}")
                
    except Exception as err:
        logger.error(f"AI Transcription endpoint failed: {err}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(err))
        
    finally:
        # STEP 6: Guarantee local cleanup of temp files
        if os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except Exception as cleanup_err:
                logger.warning(f"Failed to remove local temporary file '{temp_file_path}': {cleanup_err}")


# ─── RUN SERVER ──────────────────────────────────

if __name__ == "__main__":
    # Launch uvicorn locally on port 8000
    uvicorn.run("app.server:app", host="0.0.0.0", port=8000, reload=True)
