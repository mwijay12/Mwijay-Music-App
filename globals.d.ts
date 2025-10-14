// This file provides a global type definition for the 'process' object,
// making process.env.API_KEY available to TypeScript during the build
// without causing errors in a browser-based environment like Vite.

// FIX: Changed from `declare var process` to augmenting NodeJS.ProcessEnv to avoid redeclaration errors.
declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY: string;
  }
}
