import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Check, Loader2, Globe, User2, AlignLeft } from 'lucide-react';
import type { ProfileData } from '../../types.ts';

interface EditProfileProps {
  profile: ProfileData;
  onSave: (fields: { name: string; aboutMe: string; country: string }) => Promise<void>;
  onClose: () => void;
  showNotification: (message: string, type?: 'success' | 'info' | 'error') => void;
}

const COUNTRIES = [
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'UG', name: 'Uganda', flag: '🇺🇬' },
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
];

export const EditProfile: React.FC<EditProfileProps> = ({
  profile,
  onSave,
  onClose,
  showNotification,
}) => {
  const [name, setName] = useState(profile.name || '');
  const [aboutMe, setAboutMe] = useState(profile.aboutMe || '');
  const [country, setCountry] = useState(profile.country || 'Tanzania');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showNotification('Name cannot be empty.', 'error');
      return;
    }

    setSaving(true);
    try {
      await onSave({ name, aboutMe, country });
      showNotification('Profile updated successfully! ✨', 'success');
      onClose();
    } catch (err: any) {
      showNotification(err.message || 'Failed to update profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        className="relative w-full max-w-md bg-[#161616] border border-white/10 p-6 rounded-[2.5rem] shadow-2xl flex flex-col"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-neutral-400 hover:text-white bg-white/5 w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-colors"
        >
          <X size={18} />
        </button>

        <h3 className="text-xl font-black text-white mb-6 bg-gradient-to-r from-white to-[var(--primary-accent)] bg-clip-text text-transparent">
          Edit Profile
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Display Name</label>
            <div className="relative">
              <User2 className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
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

          {/* Bio Field */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">About Me (Bio)</label>
              <span className="text-[10px] text-neutral-500">{aboutMe.length}/150</span>
            </div>
            <div className="relative">
              <AlignLeft className="absolute left-4 top-4 text-neutral-500" size={18} />
              <textarea
                value={aboutMe}
                onChange={(e) => setAboutMe(e.target.value.slice(0, 150))}
                placeholder="Music lover from Dar..."
                className="w-full pl-12 pr-4 py-3.5 bg-black/40 border border-white/10 rounded-2xl text-white placeholder-neutral-500 focus:outline-none focus:border-[var(--primary-accent)] transition-colors text-sm h-24 resize-none"
              />
            </div>
          </div>

          {/* Country Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Country / Flag</label>
            <div className="relative">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-black/40 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-[var(--primary-accent)] transition-colors text-sm appearance-none cursor-pointer"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.name} className="bg-[#161616] text-white">
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold rounded-2xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3.5 bg-[var(--primary-accent)] hover:bg-white text-black font-black rounded-2xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <>
                  <Check size={18} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
export default EditProfile;
