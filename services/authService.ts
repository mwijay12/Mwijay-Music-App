import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail, 
  signOut,
  UserCredential
} from 'firebase/auth';
import { auth } from './firebase.ts';

/**
 * Maps Firebase authentication error codes to friendly user-facing messages.
 */
export const parseAuthError = (error: any): string => {
  const code = error?.code || '';
  switch (code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try signing in.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Contact support.';
    case 'auth/too-many-requests':
      return 'Too many login attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.';
    default:
      return error?.message || 'An unexpected error occurred. Please try again.';
  }
};

export const authService = {
  /**
   * Registers a new user with email and password.
   */
  signUpWithEmail: async (email: string, password: string): Promise<UserCredential> => {
    try {
      return await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Sign up error:', error);
      throw new Error(parseAuthError(error));
    }
  },

  /**
   * Signs in an existing user with email and password.
   */
  signInWithEmail: async (email: string, password: string): Promise<UserCredential> => {
    try {
      return await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Sign in error:', error);
      throw new Error(parseAuthError(error));
    }
  },

  /**
   * Sends a password reset recovery link to the specified email.
   */
  sendPasswordReset: async (email: string): Promise<void> => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Password reset error:', error);
      throw new Error(parseAuthError(error));
    }
  },

  /**
   * Logs out the current user session.
   */
  signOutUser: async (): Promise<void> => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
      throw new Error(parseAuthError(error));
    }
  }
};
