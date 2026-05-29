import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Edit3, Camera, LogOut, Loader2, 
  ChevronRight, Volume2, ShieldCheck, HelpCircle, 
  VolumeX, Moon, Sliders, Smartphone, Trash2 
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.ts';
import { useProfile } from '../../hooks/useProfile.ts';
import { ProfileStats } from './ProfileStats.tsx';
import { EditProfile } from './EditProfile.tsx';

interface ProfilePageProps {
  onBack: () => void;
  showNotification: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onBack, showNotification }) => {
  const { signOut, updatePreferences } = useAuth();
  const { profile, editProfileFields, uploadPhoto, removePhoto, updating, isGuest } = useProfile();
  
  const [isEditing, setIsEditing] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showNotification('Image size must be smaller than 5MB.', 'error');
      return;
    }

    setAvatarLoading(true);
    try {
      await uploadPhoto(file);
      showNotification('Avatar updated successfully! 📷', 'success');
    } catch (err: any) {
      showNotification(err.message || 'Avatar upload failed.', 'error');
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (window.confirm('Are you sure you want to remove your profile photo?')) {
      setAvatarLoading(true);
      try {
        await removePhoto();
        showNotification('Avatar reset to default.', 'info');
      } catch (err: any) {
        showNotification(err.message || 'Failed to remove avatar.', 'error');
      } finally {
        setAvatarLoading(false);
      }
    }
  };

  const handleSignOut = async () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      try {
        await signOut();
        showNotification('Signed out successfully.', 'info');
        onBack();
      } catch (err: any) {
        showNotification(err.message || 'Sign out failed.', 'error');
      }
    }
  };

  if (!profile) return null;

  return (
    <div className="w-full h-full bg-black text-white flex flex-col overflow-y-auto pb-24">
      {/* Top Header Row */}
      <div 
        className="w-full px-6 py-4 flex items-center justify-between sticky top-0 bg-black/60 backdrop-blur-xl border-b border-white/5 z-30"
        style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}
      >
        <button 
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white cursor-pointer transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-lg font-black tracking-tight text-white">Your Profile</h2>
        {!isGuest ? (
          <button 
            onClick={() => setIsEditing(true)}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[var(--primary-accent)] cursor-pointer transition-colors"
          >
            <Edit3 size={18} />
          </button>
        ) : (
          <div className="w-10"></div>
        )}
      </div>

      {/* Hero Display Card */}
      <div className="px-6 py-8 flex flex-col items-center text-center relative overflow-hidden">
        {/* Profile Avatar Spot */}
        <div className="relative group mb-4">
          <div className="w-28 h-28 rounded-[2.5rem] overflow-hidden border-2 border-white/10 shadow-2xl relative bg-[#1a1a1a]">
            {avatarLoading ? (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                <Loader2 className="animate-spin text-[var(--primary-accent)]" size={24} />
              </div>
            ) : null}
            <img 
              src={profile.avatarUrl || 'https://via.placeholder.com/150'} 
              alt={profile.name} 
              className="w-full h-full object-cover"
            />
          </div>
          
          {!isGuest && (
            <div className="absolute -bottom-2 -right-2 flex gap-1">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-9 h-9 rounded-full bg-[var(--primary-accent)] text-black flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                title="Change Avatar"
              >
                <Camera size={16} />
              </button>
              {profile.avatarUrl && !profile.avatarUrl.includes('ui-avatars.com') && (
                <button 
                  onClick={handleRemoveAvatar}
                  className="w-9 h-9 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                  title="Remove Avatar"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          )}
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleAvatarChange} 
            accept="image/*" 
            className="hidden" 
          />
        </div>

        <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-1.5 justify-center">
          <span>{profile.name}</span>
          <span className="text-base" title={profile.country}>
            {profile.country === 'Kenya' ? '🇰🇪' : profile.country === 'Uganda' ? '🇺🇬' : profile.country === 'South Africa' ? '🇿🇦' : '🇹🇿'}
          </span>
        </h2>
        <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest mt-1">
          Level {profile.level || 1} • {profile.xp || 0} XP
        </p>

        {profile.aboutMe ? (
          <p className="text-sm text-neutral-300 max-w-sm mt-3 px-4 italic leading-relaxed">
            "{profile.aboutMe}"
          </p>
        ) : (
          <p className="text-xs text-neutral-500 max-w-sm mt-3 px-4">
            No bio defined yet. Tap Edit to express your vibe!
          </p>
        )}
      </div>

      {/* Stats Deck */}
      <div className="px-6 py-2">
        <ProfileStats profile={profile} />
      </div>

      {/* Preferences Section */}
      <div className="px-6 mt-8 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">Settings & Sync</h3>
        
        <div className="bg-[#111] border border-white/5 rounded-3xl overflow-hidden divide-y divide-white/5">
          {/* Autoplay setting */}
          <div className="flex items-center justify-between p-4.5">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-white/5 border border-white/5 rounded-xl text-neutral-400">
                <Moon size={18} />
              </span>
              <div className="text-left">
                <p className="text-sm font-bold">Autoplay Next</p>
                <p className="text-xs text-neutral-400">Start a new song when track ends</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={profile.settings?.autoplay ?? true}
                onChange={(e) => updatePreferences({ autoplay: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary-accent)] peer-checked:after:bg-black"></div>
            </label>
          </div>

          {/* Volume Normalization setting */}
          <div className="flex items-center justify-between p-4.5">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-white/5 border border-white/5 rounded-xl text-neutral-400">
                <Volume2 size={18} />
              </span>
              <div className="text-left">
                <p className="text-sm font-bold">Volume Normalization</p>
                <p className="text-xs text-neutral-400">Keep playback volumes consistent</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={profile.settings?.volumeNormalization ?? false}
                onChange={(e) => updatePreferences({ volumeNormalization: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary-accent)] peer-checked:after:bg-black"></div>
            </label>
          </div>

          {/* Gapless Playback setting */}
          <div className="flex items-center justify-between p-4.5">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-white/5 border border-white/5 rounded-xl text-neutral-400">
                <Sliders size={18} />
              </span>
              <div className="text-left">
                <p className="text-sm font-bold">Gapless Playback</p>
                <p className="text-xs text-neutral-400">Remove audio gaps between tracks</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={profile.settings?.gapless ?? true}
                onChange={(e) => updatePreferences({ gapless: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary-accent)] peer-checked:after:bg-black"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Details Row Info */}
      <div className="px-6 mt-8 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">Legal & App Info</h3>
        
        <div className="bg-[#111] border border-white/5 rounded-3xl overflow-hidden divide-y divide-white/5 text-left">
          <div className="flex items-center justify-between p-4.5 cursor-pointer hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-white/5 border border-white/5 rounded-xl text-neutral-400">
                <ShieldCheck size={18} />
              </span>
              <span>Privacy Policy</span>
            </div>
            <ChevronRight size={16} className="text-neutral-500" />
          </div>

          <div className="flex items-center justify-between p-4.5 cursor-pointer hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-white/5 border border-white/5 rounded-xl text-neutral-400">
                <HelpCircle size={18} />
              </span>
              <span>Help & Support</span>
            </div>
            <ChevronRight size={16} className="text-neutral-500" />
          </div>

          <div className="flex items-center justify-between p-4.5 text-neutral-400">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-white/5 border border-white/5 rounded-xl text-neutral-400">
                <Smartphone size={18} />
              </span>
              <span>App Version</span>
            </div>
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-neutral-500">v1.3.0</span>
          </div>
        </div>
      </div>

      {/* Account Operations Trigger */}
      <div className="px-6 mt-12 w-full flex flex-col gap-4">
        {!isGuest ? (
          <button 
            onClick={handleSignOut}
            className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-red-950/20 hover:border-red-900/30 hover:text-red-400 transition-colors font-bold flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        ) : (
          <button 
            onClick={onBack}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[var(--primary-accent)] to-purple-500 text-black font-black transition-transform active:scale-[0.98] flex items-center justify-center cursor-pointer shadow-lg shadow-purple-500/20"
          >
            <span>Join Mwijay Now</span>
          </button>
        )}
      </div>

      {/* Floating Edit Overlay */}
      <AnimatePresence>
        {isEditing && (
          <EditProfile
            profile={profile}
            onSave={editProfileFields}
            onClose={() => setIsEditing(false)}
            showNotification={showNotification}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
export default ProfilePage;
