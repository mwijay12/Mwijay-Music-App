import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { updateProfile as firebaseUpdateProfile } from 'firebase/auth';
import { db, auth } from './firebase.ts';
import { uploadToCloudinary } from './cloudinaryService.ts';
import type { ProfileData } from '../types.ts';

export const profileService = {
  /**
   * Updates core user profile fields in Firestore and Firebase Auth.
   */
  updateProfileFields: async (
    userId: string,
    fields: { name?: string; aboutMe?: string; country?: string; activeThemePair?: string }
  ): Promise<void> => {
    const userDocRef = doc(db, 'users', userId);
    
    // Update Firestore profile
    const updateData: any = {};
    if (fields.name !== undefined) updateData.name = fields.name;
    if (fields.aboutMe !== undefined) updateData.aboutMe = fields.aboutMe;
    if (fields.country !== undefined) updateData.country = fields.country;
    if (fields.activeThemePair !== undefined) updateData.activeThemePair = fields.activeThemePair;

    await updateDoc(userDocRef, updateData);

    // Update Firebase Auth Display Name if modified
    if (fields.name && auth.currentUser) {
      await firebaseUpdateProfile(auth.currentUser, {
        displayName: fields.name
      });
    }
  },

  /**
   * Compresses, uploads profile photo to Cloudinary, and saves the secure URL to Auth and Firestore.
   */
  uploadAvatar: async (userId: string, fileOrBlob: File | Blob): Promise<string> => {
    // 1. Upload directly to Cloudinary
    const cloudinaryResponse = await uploadToCloudinary(fileOrBlob);
    const secureUrl = cloudinaryResponse.secure_url;

    // 2. Save secure url to Firebase Auth
    if (auth.currentUser) {
      await firebaseUpdateProfile(auth.currentUser, {
        photoURL: secureUrl
      });
    }

    // 3. Save secure url to Firestore
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      avatarUrl: secureUrl
    });

    return secureUrl;
  },

  /**
   * Deletes custom avatar and falls back to initials image
   */
  removeAvatar: async (userId: string, displayName: string): Promise<string> => {
    const initials = displayName
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
    const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials || 'U')}&background=9333ea&color=fff&size=128`;

    if (auth.currentUser) {
      await firebaseUpdateProfile(auth.currentUser, {
        photoURL: fallbackUrl
      });
    }

    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      avatarUrl: fallbackUrl
    });

    return fallbackUrl;
  },

  /**
   * Tracks and computes active listening streaks on daily music plays.
   */
  updateStreakMetrics: async (userId: string): Promise<void> => {
    const userDocRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userDocRef);
    if (!docSnap.exists()) return;

    const data = docSnap.data() as ProfileData;
    const streak = data.streak || {
      currentStreak: 0,
      longestStreak: 0,
      lastListenDate: '',
      freezeCount: 2,
      calendar: [],
      dailySeconds: {}
    };

    const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format
    
    if (streak.lastListenDate === todayStr) {
      // Already played song today, streak already updated
      return;
    }

    let current = streak.currentStreak;
    let longest = streak.longestStreak;
    
    if (streak.lastListenDate) {
      const lastDate = new Date(streak.lastListenDate);
      const todayDate = new Date(todayStr);
      const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Consecutive play
        current += 1;
      } else if (diffDays > 1) {
        // Gap exists
        current = 1;
      }
    } else {
      // First play ever logged
      current = 1;
    }

    if (current > longest) {
      longest = current;
    }

    const calendar = Array.isArray(streak.calendar) ? [...streak.calendar] : [];
    if (!calendar.includes(todayStr)) {
      calendar.push(todayStr);
    }

    const updatedStreak = {
      ...streak,
      currentStreak: current,
      longestStreak: longest,
      lastListenDate: todayStr,
      calendar
    };

    await updateDoc(userDocRef, {
      streak: updatedStreak
    });
  }
};
