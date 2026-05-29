import React, { useState } from 'react';
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.ts';

interface ForgotPasswordProps {
  onSwitchToSignIn: () => void;
  showNotification: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({
  onSwitchToSignIn,
  showNotification,
}) => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      showNotification('Please enter your email.', 'error');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
      showNotification('Password recovery email sent! Check your inbox. 📧', 'success');
    } catch (err: any) {
      showNotification(err.message || 'Failed to send recovery link.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col p-2 text-white">
      <button
        onClick={onSwitchToSignIn}
        className="flex items-center gap-1.5 text-neutral-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider mb-6 cursor-pointer"
      >
        <ArrowLeft size={16} />
        <span>Back to sign in</span>
      </button>

      <div className="text-center mb-6">
        <h2 className="text-2xl font-black bg-gradient-to-r from-white to-[var(--primary-accent)] bg-clip-text text-transparent">
          Recover Password
        </h2>
        <p className="text-sm text-neutral-400 mt-1">
          {sent ? 'Check your mailbox' : "We'll send you a password reset link"}
        </p>
      </div>

      {sent ? (
        <div className="text-center p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4">
          <p className="text-sm text-neutral-300">
            A password recovery link was sent to <strong className="text-white">{email}</strong>.
          </p>
          <p className="text-xs text-neutral-500">
            Didn't receive it? Check your spam folder or wait a few minutes.
          </p>
          <button
            onClick={() => setSent(false)}
            className="text-xs font-bold text-[var(--primary-accent)] hover:underline cursor-pointer"
          >
            Try another email address
          </button>
        </div>
      ) : (
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-[var(--primary-accent)] to-purple-500 text-black font-black rounded-2xl shadow-lg shadow-purple-500/20 active:scale-[0.98] transition-transform cursor-pointer flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <span>Send Recovery Link</span>}
          </button>
        </form>
      )}
    </div>
  );
};
