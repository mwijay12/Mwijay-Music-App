import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { v2 as cloudinary } from 'cloudinary';
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file before anything else
const loadEnv = () => {
  if (typeof process.loadEnvFile === 'function') {
    try {
      process.loadEnvFile();
      return;
    } catch (e) {
      // fallback to manual parsing if loadEnvFile fails
    }
  }

  try {
    const envPath = path.join(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const envConfig = fs.readFileSync(envPath, "utf-8");
      for (const line of envConfig.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const index = trimmed.indexOf("=");
        if (index > 0) {
          const key = trimmed.substring(0, index).trim();
          let val = trimmed.substring(index + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.substring(1, val.length - 1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  } catch (e) {
    console.warn("Could not load .env file manually:", e);
  }
};

loadEnv();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Cloudinary Config - Lazy check
  const configureCloudinary = () => {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      console.warn("Cloudinary environment variables missing. Image uploads may fail.");
      return false;
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true
    });
    return true;
  };

  const isCloudinaryConfigured = configureCloudinary();

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // ──────────────────────────────────────────────────────────────────────────────
  // REAL CHART ENDPOINTS — No Python needed, served directly by this Express server
  // ──────────────────────────────────────────────────────────────────────────────

  // Smart chart endpoint — uses iTunes for US, Deezer for African countries
  app.get("/api/charts/itunes", async (req, res) => {
    const country = String(req.query.country || 'us').toLowerCase();
    const limit = Math.min(Number(req.query.limit) || 20, 50);

    // Deezer regional chart IDs for African countries iTunes doesn't support
    // Use Deezer: 0=global, specific IDs for regional African charts
    const deezerAfricaCharts: Record<string, { chartId: string; label: string }> = {
      tz: { chartId: '0', label: 'Tanzania / East Africa Top Charts' },    // Use global as best proxy
      ke: { chartId: '0', label: 'Kenya / East Africa Top Charts' },
      ng: { chartId: '0', label: 'Nigeria Afrobeats Charts' },
      za: { chartId: '0', label: 'South Africa Charts' },
    };

    // If it's an African country, use Deezer instead of iTunes
    if (deezerAfricaCharts[country]) {
      const { label } = deezerAfricaCharts[country];
      try {
        const searchQueries: Record<string, string[]> = {
          tz: ['Diamond Platnumz', 'Harmonize', 'Mbosso', 'Zuchu', 'Alikiba'],
          ke: ['Sauti Sol', 'Otile Brown', 'Willy Paul', 'Bien'],
          ng: ['Burna Boy', 'Wizkid', 'Davido', 'Rema', 'Asake'],
          za: ['Amapiano', 'Kabza De Small', 'DJ Maphorisa', 'Tyler ICU']
        };

        const queries = searchQueries[country] || ['Diamond Platnumz'];

        // Fetch in parallel for all regional queries
        const allPromises = queries.map(async (query) => {
          try {
            const searchUrl = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=8`;
            const response = await fetch(searchUrl, {
              headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MwijayMusicApp/1.0)' },
              signal: AbortSignal.timeout(8000),
            });
            if (response.ok) {
              const data: any = await response.json();
              return (data.data || []).map((t: any) => ({
                id: `deezer-${t.id}`,
                title: t.title || 'Unknown Title',
                artist: t.artist?.name || 'Unknown Artist',
                album: t.album?.title || '',
                albumArtUrl: t.album?.cover_xl || t.album?.cover_medium || t.album?.cover || '',
                url: t.preview || '',
                previewUrl: t.preview || '',
                duration: t.duration || 30,
                source: `${label} (${query})`,
              }));
            }
          } catch (e: any) {
            console.warn(`[charts] Regional query fail for ${query}:`, e.message);
          }
          return [];
        });

        const results = await Promise.all(allPromises);
        const merged = results.flat();

        // Deduplicate
        const seen = new Set();
        const uniqueSongs = merged.filter((s: any) => {
          if (seen.has(s.id)) return false;
          seen.add(s.id);
          return true;
        });

        const finalSongs = uniqueSongs.slice(0, 20).map((s: any, idx: number) => ({
          ...s,
          rank: idx + 1
        }));

        res.setHeader('Cache-Control', 'public, max-age=900');
        return res.json(finalSongs);
      } catch (err: any) {
        console.warn(`[charts] Deezer regional merge for ${country} failed:`, err.message);
        return res.status(502).json({ error: 'Chart fetch failed', details: err.message });
      }
    }

    // For supported iTunes countries (US, UK, etc.)
    const cc = country;

    try {
      // Use the iTunes Store RSS Feed Generator — pure JSON, no auth needed
      const rssUrl = `https://itunes.apple.com/${cc}/rss/topsongs/limit=${limit}/json`;
      const response = await fetch(rssUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MwijayMusicApp/1.0)' },
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) throw new Error(`iTunes RSS returned ${response.status}`);

      const data: any = await response.json();
      const entries: any[] = data?.feed?.entry || [];

      if (entries.length === 0) throw new Error('No entries in iTunes RSS feed');

      const songs = entries.map((e: any, i: number) => {
        // Extract the best available image (100x100 → try index 2 for biggest)
        const images: any[] = Array.isArray(e['im:image']) ? e['im:image'] : [];
        const albumArt = images[images.length - 1]?.label || images[0]?.label || '';

        // Preview URL is in the 'link' array as rel=enclosure
        const links: any[] = Array.isArray(e.link) ? e.link : [e.link].filter(Boolean);
        const enclosure = links.find((l: any) => l?.attributes?.rel === 'enclosure');
        const previewUrl = enclosure?.attributes?.href || '';

        // iTunes Store link for the song
        const itunesLink = links.find((l: any) => l?.attributes?.rel === 'alternate');
        const itunesUrl = itunesLink?.attributes?.href || '';

        return {
          id: `itunes-${e.id?.attributes?.['im:id'] || i}`,
          rank: i + 1,
          title: e['im:name']?.label || 'Unknown Title',
          artist: e['im:artist']?.label || 'Unknown Artist',
          album: e['im:collection']?.['im:name']?.label || '',
          albumArtUrl: albumArt,
          // preview URL is a 30s AAC clip — use it for playback
          url: previewUrl,
          previewUrl: previewUrl,
          itunesUrl: itunesUrl,
          duration: 30,
          source: `iTunes ${country.toUpperCase()} Charts`,
        };
      });

      res.setHeader('Cache-Control', 'public, max-age=900'); // 15-min cache
      res.json(songs);
    } catch (err: any) {
      console.warn(`[charts/itunes] Failed for country=${cc}:`, err.message);
      res.status(502).json({ error: 'iTunes chart fetch failed', details: err.message });
    }
  });

  // Deezer Global Chart — top tracks worldwide with 30s preview URLs
  app.get("/api/charts/deezer", async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const chartId = String(req.query.chart || '0'); // 0 = global top tracks

    try {
      const deezerUrl = `https://api.deezer.com/chart/${chartId}/tracks?limit=${limit}`;
      const response = await fetch(deezerUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MwijayMusicApp/1.0)' },
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) throw new Error(`Deezer API returned ${response.status}`);

      const data: any = await response.json();
      if (data.error) throw new Error(data.error.message || 'Deezer API error');

      const tracks: any[] = data.data || [];
      if (tracks.length === 0) throw new Error('No tracks in Deezer chart');

      const songs = tracks.map((t: any, i: number) => ({
        id: `deezer-${t.id}`,
        rank: i + 1,
        title: t.title || 'Unknown Title',
        artist: t.artist?.name || 'Unknown Artist',
        album: t.album?.title || '',
        albumArtUrl: t.album?.cover_xl || t.album?.cover_medium || t.album?.cover || '',
        // preview is a real 30s MP3 clip from Deezer CDN
        url: t.preview || '',
        previewUrl: t.preview || '',
        itunesUrl: t.link || '',
        duration: t.duration || 30,
        source: 'Deezer Global Charts',
      }));

      res.setHeader('Cache-Control', 'public, max-age=900'); // 15-min cache
      res.json(songs);
    } catch (err: any) {
      console.warn('[charts/deezer] Failed:', err.message);
      res.status(502).json({ error: 'Deezer chart fetch failed', details: err.message });
    }
  });

  // Cloudinary Signature for Secure Uploads
  app.get("/api/cloudinary-signature", (req, res) => {
    if (!isCloudinaryConfigured) {
      return res.status(500).json({ error: "Cloudinary not configured" });
    }
    const preset = process.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'ml_default';
    const timestamp = Math.round(new Date().getTime() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, upload_preset: preset },
      process.env.CLOUDINARY_API_SECRET!
    );
    res.json({
      signature,
      timestamp,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
