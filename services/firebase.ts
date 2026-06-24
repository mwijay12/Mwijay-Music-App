import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, signInWithCredential } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, collection, query, where, getDocs, setDoc, updateDoc, deleteDoc, onSnapshot, orderBy, limit, addDoc, enableNetwork, disableNetwork } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { Capacitor } from '@capacitor/core';

const resolvedConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  appId: process.env.FIREBASE_APP_ID || firebaseConfig.appId,
  apiKey: process.env.FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  firestoreDatabaseId: process.env.FIREBASE_FIRESTORE_DATABASE_ID || firebaseConfig.firestoreDatabaseId || '(default)',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || firebaseConfig.measurementId,
};

const app = initializeApp(resolvedConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, resolvedConfig.firestoreDatabaseId);

// ── ONLINE/OFFLINE NETWORK MANAGEMENT ──────────────────────────────
// Automatically enable/disable Firestore sync when connectivity changes.
// This prevents ERR_NAME_NOT_RESOLVED spam in the console.
if (typeof window !== 'undefined') {
  let isNetworkEnabled = navigator.onLine;

  // Immediately disable network operations on boot if starting offline to avoid blocking on timeouts
  if (!isNetworkEnabled) {
    disableNetwork(db).then(() => {
      console.log('[Firebase] Started offline — Firestore cache mode enabled.');
    }).catch(() => {});
  }

  window.addEventListener('online', () => {
    if (!isNetworkEnabled) {
      isNetworkEnabled = true;
      enableNetwork(db).then(() => {
        console.log('[Firebase] Network restored — Firestore syncing again.');
      }).catch(() => {});
    }
  });

  window.addEventListener('offline', () => {
    if (isNetworkEnabled) {
      isNetworkEnabled = false;
      disableNetwork(db).then(() => {
        console.log('[Firebase] Offline — Firestore switched to cache mode.');
      }).catch(() => {});
    }
  });
}

const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
    try {
        if (Capacitor.isNativePlatform()) {
            try {
                const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
                const result = await FirebaseAuthentication.signInWithGoogle();
                const idToken = result.credential?.idToken;
                if (idToken) {
                    const credential = GoogleAuthProvider.credential(idToken);
                    const userCredential = await signInWithCredential(auth, credential);
                    return userCredential.user;
                } else {
                    throw new Error("No native Google ID Token retrieved from FirebaseAuthentication plugin.");
                }
            } catch (nativeErr) {
                console.warn("Native Capacitor-Firebase Google login failed, trying browser fallback...", nativeErr);
            }
        }
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
    } catch (error) {
        console.error("Google sign in error:", error);
        throw error;
    }
};

export const logout = () => signOut(auth);

// Firestore Error Handler as per skill instructions
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

const OFFLINE_ERROR_CODES = new Set([
  'unavailable',
  'failed-precondition',
  'cancelled',
  'resource-exhausted',
  'deadline-exceeded',
]);

const OFFLINE_MSG_PATTERNS = [
  'offline',
  'ERR_NAME_NOT_RESOLVED',
  'ERR_INTERNET_DISCONNECTED',
  'network',
  'Failed to fetch',
  'fetch failed',
];

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const message = error instanceof Error ? error.message : String(error);
  const code = (error as any)?.code || '';

  // Graceful offline handling — don't throw, just log
  const isOffline =
    OFFLINE_ERROR_CODES.has(code) ||
    OFFLINE_MSG_PATTERNS.some(p => message.toLowerCase().includes(p.toLowerCase())) ||
    !navigator.onLine;

  if (isOffline) {
    console.info(`[Firestore] Device offline — ${operationType} on ${path} will retry when connected.`);
    return; // soft return, no throw
  }

  const errInfo: FirestoreErrorInfo = {
    error: message,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test as per skill instructions
export async function testConnection() {
  try {
    const testDocRef = doc(db, 'test', 'connection');
    await getDocFromServer(testDocRef);
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client appears to be offline.");
    }
  }
}
