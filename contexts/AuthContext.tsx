import React, { createContext, useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { auth, db, signInWithGoogle } from '../services/firebase.ts';
import { authService } from '../services/authService.ts';
import { defaultProfile } from '../components/db.ts';
import type { ProfileData } from '../types.ts';

export interface AuthContextType {
  user: User | null;
  profile: ProfileData | null;
  isAdmin: boolean;
  loading: boolean;
  isGuest: boolean;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
  resetPassword: (email: string) => Promise<void>;
  updatePreferences: (preferences: Partial<ProfileData['settings']>) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const isAdmin = React.useMemo(() => {
    if (!profile) return false;
    const adminEmailsEnv = import.meta.env.VITE_ADMIN_EMAILS || '';
    const adminEmails = adminEmailsEnv.split(',').map((e: string) => e.trim().toLowerCase());
    return adminEmails.includes(user?.email?.toLowerCase() || '') || !!profile.settings?.aiDjMode; 
  }, [user, profile]);

  // Handle Initials Avatar Generation
  const generateInitialsAvatar = (name: string): string => {
    const initials = name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials || 'U')}&background=9333ea&color=fff&size=128`;
  };

  // Synchronize and initialize user profile in Firestore
  const syncUserProfile = async (firebaseUser: User, customName?: string) => {
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    try {
      const docSnap = await getDoc(userDocRef);

      if (!docSnap.exists()) {
        const displayName = customName || firebaseUser.displayName || 'Mwijay Listener';
        const avatarUrl = firebaseUser.photoURL || generateInitialsAvatar(displayName);

        const newProfile: any = {
          ...defaultProfile,
          name: displayName,
          avatarUrl: avatarUrl,
          settings: {
            ...defaultProfile.settings,
            fontSizeMultiplier: 1,
            greetingStyle: 'time-based',
          },
          xp: 0,
          level: 1,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
        };

        // Strip sets to avoid Firestore serialization errors
        if (newProfile.usedFeatures) {
          const serializedFeatures: any = {};
          Object.keys(newProfile.usedFeatures).forEach(key => {
            const val = newProfile.usedFeatures[key];
            serializedFeatures[key] = val instanceof Set ? Array.from(val) : val;
          });
          newProfile.usedFeatures = serializedFeatures;
        }

        await setDoc(userDocRef, newProfile);
        setProfile(newProfile);
      } else {
        const existingData = docSnap.data() as ProfileData;
        // Always apply latest Google photo & display name from Firebase Auth
        const mergedProfile: ProfileData = {
          ...existingData,
          avatarUrl: firebaseUser.photoURL || existingData.avatarUrl,
          name: existingData.name || firebaseUser.displayName || 'Mwijay Listener',
        };
        setProfile(mergedProfile);
        // Update last login
        await setDoc(userDocRef, { lastLogin: serverTimestamp() }, { merge: true });
      }
    } catch (err) {
      console.error('Error syncing user profile:', err);
      // Fallback: if Firestore fails, at least set avatar from Firebase Auth
      setProfile(prev => prev ? {
        ...prev,
        avatarUrl: firebaseUser.photoURL || prev.avatarUrl,
        name: firebaseUser.displayName || prev.name,
      } : prev);
    }
  };

  // Auth changes listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setIsGuest(false);

        // Load local profile first to unblock UI instantly (<50ms)
        try {
          const { getProfile } = await import('../components/db.ts');
          const localProfile = await getProfile();
          if (localProfile) {
            setProfile(localProfile);
          } else {
            setProfile(defaultProfile);
          }
        } catch (e) {
          console.warn('Local profile read failed, falling back to default:', e);
          setProfile(defaultProfile);
        }

        // Unblock the main app loading screen immediately!
        setLoading(false);

        // Synchronize with Firestore asynchronously in the background
        syncUserProfile(firebaseUser).catch(err => {
          console.warn('Background profile sync warning:', err);
        });

        // Setup real-time listener for profile sync (with peaceful error warning)
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const unsubProfile = onSnapshot(
          userDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const cloudData = docSnap.data() as ProfileData;
              // Always merge latest photo from Firebase Auth
              setProfile({
                ...cloudData,
                avatarUrl: firebaseUser.photoURL || cloudData.avatarUrl,
                name: cloudData.name || firebaseUser.displayName || 'Mwijay Listener',
              });
            }
          },
          (err) => {
            console.warn('Profile subscription offline or failed:', err.message);
          }
        );

        return () => unsubProfile();
      } else {
        setUser(null);
        // Automatically default to guest mode so they are never forced to log in on launch!
        setIsGuest(true);
        setProfile(defaultProfile);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [isGuest]);

  const signUp = async (email: string, password: string, name: string) => {
    setLoading(true);
    try {
      const credential = await authService.signUpWithEmail(email, password);
      if (credential.user) {
        await syncUserProfile(credential.user, name);
      }
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      await authService.signInWithEmail(email, password);
    } finally {
      setLoading(false);
    }
  };

  const signInGoogle = async () => {
    setLoading(true);
    try {
      const googleUser = await signInWithGoogle();
      if (googleUser) {
        await syncUserProfile(googleUser);
      }
    } finally {
      setLoading(false);
    }
  };

  const signOutUser = async () => {
    setLoading(true);
    try {
      await authService.signOutUser();
      setUser(null);
      setProfile(null);
      setIsGuest(false);
    } finally {
      setLoading(false);
    }
  };

  const continueAsGuest = () => {
    setIsGuest(true);
    setUser(null);
    setProfile(defaultProfile);
  };

  const resetPassword = async (email: string) => {
    await authService.sendPasswordReset(email);
  };

  const updatePreferences = async (preferences: Partial<ProfileData['settings']>) => {
    if (isGuest || !user) {
      // Offline / Guest local-only save
      if (profile) {
        setProfile({
          ...profile,
          settings: {
            ...profile.settings,
            ...preferences
          } as any
        });
      }
      return;
    }

    try {
      const userDocRef = doc(db, 'users', user.uid);
      const updatedSettings = {
        ...profile?.settings,
        ...preferences
      };
      await setDoc(userDocRef, { settings: updatedSettings }, { merge: true });
    } catch (err) {
      console.error('Failed to sync settings preferences:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAdmin,
        loading,
        isGuest,
        signUp,
        signIn,
        signInWithGoogle: signInGoogle,
        signOut: signOutUser,
        continueAsGuest,
        resetPassword,
        updatePreferences,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
