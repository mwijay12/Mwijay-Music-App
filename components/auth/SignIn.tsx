import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Chrome, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.ts';

interface SignInProps {
  onSwitchToSignUp: () => void;
  onSwitchToForgotPassword: () => void;
  onClose?: () => void;
  showNotification: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const SignIn: React.FC<SignInProps> = ({
  onSwitchToSignUp,
  onSwitchToForgotPassword,
  onClose,
  showNotification,
}) => {
  const { signIn, signInWithGoogle, continueAsGuest } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      showNotification('Please fill in all fields.', 'error');
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
      showNotification('Welcome back to Mwijay! 🎵', 'success');
      if (onClose) onClose();
    } catch (err: any) {
      showNotification(err.message || 'Incorrect email or password.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      showNotification('Signed in with Google successfully! ⚡', 'success');
      if (onClose) onClose();
    } catch (err: any) {
      showNotification(err.message || 'Google sign-in failed.', 'error');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGuestLogin = () => {
    continueAsGuest();
    showNotification('Logged in as guest.', 'info');
    if (onClose) onClose();
  };

  return (
    <div className="w-full flex flex-col p-2 text-white">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-black bg-gradient-to-r from-white to-[var(--primary-accent)] bg-clip-text text-transparent">
          Welcome to Mwijay
        </h2>
        <p className="text-sm text-neutral-400 mt-1">Sign in to sync your vibes</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full pl-12 pr-4 py-3.5 bg-black/40 border border-white/10 rounded-2xl text-white placeholder-neutral-500 focus:outline-none focus:border-[var(--primary-accent)] transition-colors text-sm"
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Password</label>
            <button
              type="button"
              onClick={onSwitchToForgotPassword}
              className="text-xs text-[var(--primary-accent)] font-semibold hover:underline cursor-pointer"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-12 pr-12 py-3.5 bg-black/40 border border-white/10 rounded-2xl text-white placeholder-neutral-500 focus:outline-none focus:border-[var(--primary-accent)] transition-colors text-sm"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white cursor-pointer"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || googleLoading}
          className="w-full py-4 bg-gradient-to-r from-[var(--primary-accent)] to-purple-500 text-black font-black rounded-2xl shadow-lg shadow-purple-500/20 active:scale-[0.98] transition-transform cursor-pointer flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : <span>Sign In</span>}
        </button>
      </form>

      <div className="mt-8 text-center space-y-4">
        <p className="text-sm text-neutral-400">
          New here?{' '}
          <button
            onClick={onSwitchToSignUp}
            className="text-[var(--primary-accent)] font-bold hover:underline cursor-pointer"
          >
            Create account
          </button>
        </p>

        <button
          onClick={handleGuestLogin}
          className="text-xs text-neutral-500 hover:text-white transition-colors font-medium flex items-center gap-1.5 mx-auto cursor-pointer"
        >
          <span>Continue as guest</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};
