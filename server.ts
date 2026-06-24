import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import multer from "multer";
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

  // Cloudflare R2 Config - Lazy init
  let r2Client: S3Client | null = null;
  const getR2Client = () => {
    if (r2Client) return r2Client;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const endpoint = process.env.R2_ENDPOINT;

    if (!accessKeyId || !secretAccessKey || !endpoint) {
      console.warn("R2 environment variables missing. Uploads will fail.");
      return null;
    }

    r2Client = new S3Client({
      region: "auto",
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
    return r2Client;
  };

  const isR2Configured = !!getR2Client();

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

  // Cloudflare R2 Upload — accepts multipart file, uploads to R2 bucket, returns public URL
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024, fieldSize: 100 * 1024 * 1024 },
  });
  app.post("/api/r2/upload", upload.single("file"), async (req, res) => {
    const startTime = Date.now();
    console.log('[R2] Upload request received');

    const client = getR2Client();
    if (!client) return res.status(500).json({ error: "R2 not configured" });
    if (!req.file) return res.status(400).json({ error: "No file provided" });

    const bucketName = process.env.R2_BUCKET_NAME || "mwijay-music";
    const publicUrl = process.env.R2_PUBLIC_URL;
    const folder = (req.body.folder as string) || "uploads";

    try {
      const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_").substring(0, 100);
      const key = `${folder}/${Date.now()}-${safeName}`;
      console.log(`[R2] Uploading to: ${key}, size=${req.file.size}`);

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype || "application/octet-stream",
      });

      const uploadStart = Date.now();
      await client.send(command);
      const uploadDuration = Date.now() - uploadStart;
      console.log(`[R2] Upload completed in ${uploadDuration}ms`);

      const secureUrl = publicUrl
        ? `${publicUrl}/${key}`
        : `${process.env.R2_ENDPOINT}/${bucketName}/${key}`;

      const response = { secure_url: secureUrl, public_id: key, bucket: bucketName };
      console.log(`[R2] Sending response after ${Date.now() - startTime}ms`);
      return res.json(response);
    } catch (e: any) {
      console.error("[R2] Upload failed:", e.message);
      console.error("[R2] Stack:", e.stack);
      return res.status(502).json({ error: e.message });
    }
  });

  // ═══════════════════════════════════════════════════
  // R2 PRESIGNED URL ENDPOINTS
  // ═══════════════════════════════════════════════════

  /**
   * Generate presigned URL for direct browser upload
   * POST /api/r2/upload-url
   * Body: { fileName, contentType, folder? }
   */
  app.post("/api/r2/upload-url", async (req, res) => {
    try {
      const { fileName, contentType, folder = "songs" } = req.body;

      if (!fileName || !contentType) {
        return res.status(400).json({ error: "fileName and contentType required" });
      }

      if (!["songs", "reels", "covers"].includes(folder)) {
        return res.status(400).json({ error: "Invalid folder" });
      }

      const allowedTypes = [
        "audio/mpeg", "audio/mp3", "audio/wav", "audio/flac",
        "audio/ogg", "audio/aac", "audio/x-m4a", "audio/mp4",
        "video/mp4", "video/webm", "video/quicktime",
        "image/jpeg", "image/png", "image/webp",
      ];
      if (!allowedTypes.includes(contentType)) {
        return res.status(400).json({ error: `Content type ${contentType} not allowed` });
      }

      const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").substring(0, 100);
      const timestamp = Date.now();
      const key = `${folder}/${timestamp}_${safeName}`;
      const bucketName = process.env.R2_BUCKET_NAME || "mwijay-music";
      const publicUrl = process.env.R2_PUBLIC_URL;

      const client = getR2Client();
      if (!client) return res.status(500).json({ error: "R2 not configured" });

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        ContentType: contentType,
      });

      const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 });
      const resultPublicUrl = `${publicUrl}/${key}`;

      res.json({ uploadUrl, publicUrl: resultPublicUrl, key });
    } catch (e: any) {
      console.error("[R2] Upload URL error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * Delete a file from R2
   * DELETE /api/r2/file?key=songs/123_test.mp3
   */
  app.delete("/api/r2/file", async (req, res) => {
    try {
      const key = req.query.key as string;
      if (!key) return res.status(400).json({ error: "Key query param required" });

      const client = getR2Client();
      if (!client) return res.status(500).json({ error: "R2 not configured" });

      const bucketName = process.env.R2_BUCKET_NAME || "mwijay-music";
      const deleteCommand = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      });
      await client.send(deleteCommand);
      res.json({ success: true });
    } catch (e: any) {
      console.error("[R2] Delete error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * List all R2 files (for admin)
   * GET /api/r2/files?prefix=songs/
   */
  app.get("/api/r2/files", async (req, res) => {
    try {
      const prefix = req.query.prefix as string | undefined;
      const client = getR2Client();
      if (!client) return res.status(500).json({ error: "R2 not configured" });

      const bucketName = process.env.R2_BUCKET_NAME || "mwijay-music";
      const publicUrl = process.env.R2_PUBLIC_URL;

      const listCommand = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix,
        MaxKeys: 1000,
      });

      const response = await client.send(listCommand);
      const files = (response.Contents || []).map((obj) => ({
        key: obj.Key || "",
        size: obj.Size || 0,
        lastModified: obj.LastModified || new Date(),
        publicUrl: `${publicUrl}/${obj.Key}`,
      }));

      res.json({ files });
    } catch (e: any) {
      console.error("[R2] List error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // Gemini AI Proxy — routes browser requests through the server
  // to avoid CORS issues with the Gemini API
  app.post("/api/ai/generate", async (req, res) => {
    const { prompt, model = 'gemini-2.0-flash' } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

    const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.GEMINI_KEYS?.split(',')[0];
    if (!apiKey) return res.status(500).json({ error: 'No Gemini API key configured' });

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          }),
          signal: AbortSignal.timeout(20000),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error('[AI Proxy] Gemini error:', error);
        return res.status(response.status).json({ error });
      }

      const data = await response.json();
      res.json(data);
    } catch (e: any) {
      console.error('[AI Proxy] Fetch failed:', e.message);
      res.status(502).json({ error: e.message });
    }
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
