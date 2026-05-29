import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, Chrome, Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.ts';

interface SignUpProps {
  onSwitchToSignIn: () => void;
  onClose?: () => void;
  showNotification: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const SignUp: React.FC<SignUpProps> = ({
  onSwitchToSignIn,
  onClose,
  showNotification,
}) => {
  const { signUp, signInWithGoogle } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      showNotification('Please fill in all fields.', 'error');
      return;
    }
    if (password.length < 6) {
      showNotification('Password must be at least 6 characters.', 'error');
      return;
    }
    if (!agree) {
      showNotification('You must agree to the Terms of Service.', 'error');
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password, name);
      showNotification('Account created successfully! Welcome to Mwijay 🎵', 'success');
      if (onClose) onClose();
    } catch (err: any) {
      showNotification(err.message || 'Signup failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      showNotification('Signed up with Google successfully! ⚡', 'success');
      if (onClose) onClose();
    } catch (err: any) {
      showNotification(err.message || 'Google sign-up failed.', 'error');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col p-2 text-white">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-black bg-gradient-to-r from-white to-[var(--primary-accent)] bg-clip-text text-transparent">
          Join Mwijay
        </h2>
        <p className="text-sm text-neutral-400 mt-1">Create your vibe coordinates</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Your Name</label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className="w-full pl-12 pr-4 py-3.5 bg-black/40 border border-white/10 rounded-2xl text-white placeholder-neutral-500 focus:outline-none focus:border-[var(--primary-accent)] transition-colors text-sm"
              required
            />
          </div>
        </div>

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
          <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Password</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="•••••••• (min 6 chars)"
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

        <div className="flex items-start gap-3 mt-2 px-1">
          <input
            type="checkbox"
            id="agree"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="w-4 h-4 rounded border-white/10 bg-black text-[var(--primary-accent)] focus:ring-0 mt-0.5 cursor-pointer"
          />
          <label htmlFor="agree" className="text-xs text-neutral-400 leading-normal select-none cursor-pointer">
            I agree to the <span className="text-white hover:underline">Terms of Service</span> and{' '}
            <span className="text-white hover:underline">Privacy Policy</span>.
          </label>
        </div>

        <button
          type="submit"
          disabled={loading || googleLoading}
          className="w-full py-4 bg-gradient-to-r from-[var(--primary-accent)] to-purple-500 text-black font-black rounded-2xl shadow-lg shadow-purple-500/20 active:scale-[0.98] transition-transform cursor-pointer flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : <span>Create Account</span>}
        </button>
      </form>

      <div className="mt-8 text-center">
        <p className="text-sm text-neutral-400">
          Have an account?{' '}
          <button
            onClick={onSwitchToSignIn}
            className="text-[var(--primary-accent)] font-bold hover:underline cursor-pointer"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
};
