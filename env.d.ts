/// <reference types="vite/client" />

declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY?: string;
    GEMINI_KEYS?: string;
    GEMINI_API_KEY?: string;
    R2_ACCESS_KEY_ID?: string;
    R2_SECRET_ACCESS_KEY?: string;
    R2_ENDPOINT?: string;
    R2_BUCKET_NAME?: string;
    R2_PUBLIC_URL?: string;
    GROQ_API_KEY?: string;
    GROQ_KEYS?: string;
    OPENROUTER_API_KEY?: string;
    OPENROUTER_KEYS?: string;
    CEREBRAS_API_KEY?: string;
    CEREBRAS_KEYS?: string;
    AUDIODB_API_KEY?: string;
    JAMENDO_CLIENT_ID_1?: string;
    JAMENDO_CLIENT_ID_2?: string;
    LASTFM_API_KEY?: string;
    GENIUS_ACCESS_TOKEN?: string;
    FIREBASE_PROJECT_ID?: string;
    FIREBASE_APP_ID?: string;
    FIREBASE_API_KEY?: string;
    FIREBASE_AUTH_DOMAIN?: string;
    FIREBASE_FIRESTORE_DATABASE_ID?: string;
    FIREBASE_STORAGE_BUCKET?: string;
    FIREBASE_MESSAGING_SENDER_ID?: string;
    FIREBASE_MEASUREMENT_ID?: string;
  }
}
