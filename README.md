# Mwijay Music App 🎵
### High-Fidelity Localized Bongo Flava Player & Client-Side AI Audio Engine

Mwijay Music App is an offline-first, client-side progressive hybrid mobile application tailored for the East African / Tanzanian musical identity. It combines a vibrant, glassmorphic visual aesthetic with a Text-to-Speech (TTS) Speech Synthesis assistant, zero-latency DSP audio presets, real-time microphone voice modulators, and local progression metrics.

---

## 🏛️ Architectural Philosophy & VPS Decoupling

To ensure maximum performance on low-resource hardware, the application implements a fully decoupled architecture:

```
  ┌──────────────────────────────────────────────────────────┐
  │                   CLIENT-SIDE PHONE                      │
  │  (Vite + React + TypeScript + Capacitor Native Shell)    │
  │                                                          │
  │  ┌───────────────────────┐   ┌────────────────────────┐  │
  │  │   Tone.js DSP Engine  │   │   Meyda.js Analyzer    │  │
  │  │   • Voice Presets     │   │   • Energy Auto-BPM    │  │
  │  │   • Parametric EQ3    │   │   • Chroma Key Search  │  │
  │  │   • Live Mic Changer  │   │   • ZCR / RMS Moods    │  │
  │  └───────────────────────┘   └────────────────────────┘  │
  │  ┌────────────────────────────────────────────────────┐  │
  │  │               Gamification Engine                  │  │
  │  │   • IndexedDB Database ("MwijayMusicDB")           │  │
  │  │   • Timezone-safe Streaks & Milestones Checkers    │  │
  │  │   • Level-Up Confetti & TTS Speech Congrats            │  │
  │  └────────────────────────────────────────────────────┘  │
  └───────────────────────────┬──────────────────────────────┘
                              │ (Lightweight Web Queries)
                              ▼
  ┌──────────────────────────────────────────────────────────┐
  │                 AWS EC2 VPS (2GB RAM)                    │
  │                 (FastAPI Microservice)                   │
  │                                                          │
  │  • Unified Platform Search & Discovery (YTMusic, Jamendo)│
  │  • Gemini AI Mood DJ & Transition Playlists              │
  │  • NO heavy Python audio models loaded (Librosa/Spleeter)│
  └──────────────────────────────────────────────────────────┘
```

* **Client-Side Heavy Processing**: All DSP sound manipulation, voice filters, equalizer gains, waveform visualizers, metronome ticks, and audio calculations run **100% locally on the phone's CPU/GPU**. This guarantees the app is fully functional offline inside native mobile APKs.
* **Decoupled VPS Scope**: The Python server (`app/server.py`) acts purely as a lightweight, memory-efficient search coordinator and Gemini API DJ router. Memory-heavy Python ML/DSP packages (`librosa`, `pedalboard`, `aubio`, `spleeter`) are completely deprecated and removed, freeing up all system RAM on your 2GB AWS EC2 instance.

---

## 🛠️ Detailed Technical Deep-Dive

### 1. Client-Side DSP Audio Engine (`services/audioEngine.ts`)
The audio engine connects HTML5 `<audio>` player streams directly into a complex Tone.js Web Audio node graph:

```
  HTML5 <audio> ➔ MediaElementAudioSourceNode
                         │
                         ▼
                     Tone.EQ3 (Bass, Mid, Treble Parametric EQ)
                         │
                         ▼
                   Tone.PitchShift (Semitone Modulation)
                         │
                         ▼
                 Tone.BitCrusher (Sample-Rate Crusher)
                         │
                         ▼
                   Tone.Filter (Lowpass / Highpass Sweep)
                         │
                         ▼
                 Tone.Distortion (Vinyl Hiss / Tube warmth)
                         │
                         ▼
                  Tone.Chorus (Phase & Space sweeps)
                         │
                         ▼
                  Tone.Reverb (Reverberation decay space)
                         │
                         ▼
              Tone.FeedbackDelay (Echo tempo intervals)
                         │
                         ▼
                 Tone.Volume (Preamp Amplification)
                         │
                         ▼
                  Tone.Destination (Output)
```

* **Voice Changer Presets**: Directly alters the frequency and sample-depth parameters of the active nodes:
  * `Chipmunk 🐿️`: Pitch shifts semitones by `+6`.
  * `Deep Voice 🦁`: Pitch shifts by `-5` and boosts lower EQ gains.
  * `Robot 🤖`: Blends in `BitCrusher` sample reduction (`8-bit`) and high-frequency depth chorus sweeps.
* **Music Atmosphere Presets**:
  * `Slowed + Reverb 🌌`: Lowers playback speed natively to `85%`, shifts pitch down, and runs a huge `5.0s` stadium reverb tail.
  * `Nightcore ⚡`: Speeds up playback to `125%` and shifts pitch up by `+2 semitones` for that classic high-energy vibe.
  * `Lofi Vibes 📻`, `Telephone 📞`, `Underwater 🌊`, `Stadium 🏟️`, `Vinyl 🎧`.
* **Vocal Mic Modulation**: Accesses `navigator.mediaDevices.getUserMedia` microphone lines to feed vocals into pitch-shifting nodes in real-time, allowing users to talk through vocal presets with zero lag.

### 2. Client-Side Audio Analyzer (`services/audioAnalyzer.ts`)
Rather than uploading heavy audio files to the server, the app decodes PCM channels directly inside the browser using standard Web Audio `decodeAudioData`:

* **Energy Autocorrelation BPM Detection**:
  1. Computes Root-Mean-Square (RMS) energy profiles across 100ms window blocks of Float32 PCM vectors.
  2. Identifies peak beats exceeding dynamically calculated standard thresholds.
  3. Computes average peak intervals in seconds and converts them to Beats-Per-Minute (BPM) values.
* **Chroma Tonal Key Detection**: Extracts a 12-dimensional chroma intensity vector representing energy distribution over the twelve semitones of the musical octave. Matches the index of the highest vector value to standard musical keys (C, D#, A, etc.).
* **Vibe Mood Estimation**: Intersects Zero-Crossing Rates (ZCR) representing high-frequency transients with overall RMS energy levels to categorize tracks into:
  * *Energetic 🔥* (High RMS, High ZCR)
  * *Intense ⚡* (High RMS, Low ZCR)
  * *Calm & Bright 🍃* (Low RMS, High ZCR)
  * *Melancholic / Deep 🌧️* (Low RMS, Low ZCR)

### 3. Local Caching & Progression System
* **IndexedDB Store ("MwijayMusicDB")**: Built with local-first databases to cache songs, playlists, reels, and profiles locally.
* **Timezone-Safe Streak Checkers (`utils/gamification.ts`)**:
  * Tracks consecutive listening days by storing string date markers (`YYYY-MM-DD`) in UTC+3 (East African Time).
  * Automatically applies up to 2 weekly "streak freezes" if a day is missed.
  * Extends streak records when playback exceeds 5 continuous minutes (300 seconds) in a single calendar day.
* **TTS Speech Level Boundary crossed celebrations**: Plays dynamic vocal congratulations using the native Web Speech API:
  > *"Congratulations! You leveled up to level [Level]. You are now a [Rank Title]! Keep the music playing!"*

---

## 📂 Codebase Directory Layout

```
├── app/                      # PYTHON BACKEND (Lightweight FastAPI microservice)
│   ├── ai/                   # Mood DJ Gemini pipelines
│   ├── analytics/            # Listening breakdown stats & wrapped Slide compilations
│   ├── audio/                # Local audio engine (X-ray analysis, rhythmic coordinates)
│   ├── sources/              # YouTube Music Search & metadata parsers
│   └── server.py             # FastAPI Server Entry point (Gamification deleted)
│
├── src/ / components/ / services/ / utils/ / hooks/   # FRONTEND (React TS + Web Audio)
│   ├── components/
│   │   ├── db.ts             # IndexedDB Initializer & Deep Merging schemas
│   │   ├── LevelUpToast.tsx  # Framer-motion leveling boundary celebrator
│   │   ├── ProfileView.tsx   # Glassmorphic stats dashboards & weekly streak calendar bubble grids
│   │   ├── EqualizerModal.tsx # EQ slider interface
│   │   └── AudioFxModal.tsx  # DSP vocal effects grids
│   │
│   ├── services/
│   │   ├── audioEngine.ts    # Tone.js 3-Band Parametric EQ & presets router
│   │   └── audioAnalyzer.ts  # Meyda.js offline BPM, Key, and Mood classifiers
│   │
│   ├── utils/
│   │   ├── gamification.ts   # Progression calculations, streak buffers, and XP mappings
│   │   └── helpers.ts        # Dynamic colors, dominant color picker, and audio fading utilities
│   │
│   ├── hooks/
│   │   ├── useBackgroundScanner.ts # Local file background scanner
│   │   └── useBackgroundMedia.ts   # HTML5 Lock-screen controls (MediaSession)
│   │
│   └── App.tsx               # Central React application router & reactive Audio engine synchronizer
│
├── capacitor.config.ts       # Capacitor native bridge configuration
├── package.json              # Client dependencies (Tone, Meyda, Capacitor)
└── README.md                 # Technical Architecture Documentation
```

---

## 🚀 Running, Bundling & Deploying

### 1. Initial Setup
Install the dependencies:
```bash
npm install
```

### 2. Local Development (Web View)
Launch the local Vite server:
```bash
npm run dev
```

### 3. Verify TypeScript Type-Safety
To run the typechecker across all typescript and tsx files:
```bash
npx tsc --noEmit
```

### 4. Build Production Bundle
To bundle, optimize, and minify all static web assets:
```bash
npm run build
```

### 5. Synchronize Capacitor Assets with Mobile Shells
To copy the compiled static assets into the Android native mobile project directories:
```bash
npm run cap:sync
```

### 6. Run Native Android App via Android Studio
To open your Android Studio workspace pre-configured with Capacitor native hooks:
```bash
npm run cap:open:android
```
Once opened, click **Run** inside Android Studio to install the high-fidelity Bongo Flava player natively on your target Android device (compatible with Android 15!).
