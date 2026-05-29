import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    define: {
      'process.env.GEMINI_KEYS': JSON.stringify(env.GEMINI_KEYS),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.CLOUDINARY_CLOUD_NAME': JSON.stringify(env.CLOUDINARY_CLOUD_NAME),
      'process.env.CLOUDINARY_API_KEY': JSON.stringify(env.CLOUDINARY_API_KEY),
      'process.env.CLOUDINARY_API_SECRET': JSON.stringify(env.CLOUDINARY_API_SECRET),
      'process.env.VITE_CLOUDINARY_UPLOAD_PRESET': JSON.stringify(env.VITE_CLOUDINARY_UPLOAD_PRESET),
      'process.env.GROQ_API_KEY': JSON.stringify(env.GROQ_API_KEY),
      'process.env.OPENROUTER_API_KEY': JSON.stringify(env.OPENROUTER_API_KEY),
      'process.env.CEREBRAS_API_KEY': JSON.stringify(env.CEREBRAS_API_KEY),
      'process.env.AUDIODB_API_KEY': JSON.stringify(env.AUDIODB_API_KEY),
      'process.env.JAMENDO_CLIENT_ID_1': JSON.stringify(env.JAMENDO_CLIENT_ID_1),
      'process.env.JAMENDO_CLIENT_ID_2': JSON.stringify(env.JAMENDO_CLIENT_ID_2),
      'process.env.LASTFM_API_KEY': JSON.stringify(env.LASTFM_API_KEY),
      'process.env.GENIUS_ACCESS_TOKEN': JSON.stringify(env.GENIUS_ACCESS_TOKEN),
      'process.env.FIREBASE_PROJECT_ID': JSON.stringify(env.FIREBASE_PROJECT_ID),
      'process.env.FIREBASE_APP_ID': JSON.stringify(env.FIREBASE_APP_ID),
      'process.env.FIREBASE_API_KEY': JSON.stringify(env.FIREBASE_API_KEY),
      'process.env.FIREBASE_AUTH_DOMAIN': JSON.stringify(env.FIREBASE_AUTH_DOMAIN),
      'process.env.FIREBASE_FIRESTORE_DATABASE_ID': JSON.stringify(env.FIREBASE_FIRESTORE_DATABASE_ID),
      'process.env.FIREBASE_STORAGE_BUCKET': JSON.stringify(env.FIREBASE_STORAGE_BUCKET),
      'process.env.FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(env.FIREBASE_MESSAGING_SENDER_ID),
      'process.env.FIREBASE_MEASUREMENT_ID': JSON.stringify(env.FIREBASE_MEASUREMENT_ID),
    },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // Disable auto injection so we can register manually for web only
      devOptions: {
        enabled: true
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
      },
      manifest: {
        name: 'Mwijay Music Player',
        short_name: 'Mwijay',
        description: 'A fully offline music player for students.',
        theme_color: '#000000',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      // Forward all /api/* requests to the Python FastAPI backend
      // This also avoids CORS preflight errors in the browser
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        // Don't throw if backend is offline — let the app's fallback logic handle it
        configure: (proxy) => {
          proxy.on('error', () => { /* backend offline — ignored */ });
        }
      }
    }
  }
  };
})
