import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Sparkles, Trophy, Zap, Database, RefreshCw, ChevronLeft,
  Award, Activity, Bug, Settings, ToggleLeft, ToggleRight, AlertTriangle,
  Users, Music, Clock, Flame, Eye, Trash2, Upload, Bell, Image, Megaphone, CheckCircle, X, Film, Star
} from 'lucide-react';
import type { ProfileData, Song, Playlist } from '../types.ts';
import { remoteConfig, type AppConfig } from '../services/remoteConfigService.ts';
import { crashReporter, type CrashReport } from '../services/crashReportService.ts';
import { useRemoteConfig } from '../hooks/useRemoteConfig.ts';
import { db, auth } from '../services/firebase.ts';
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, orderBy, query, updateDoc } from 'firebase/firestore';
import { uploadToR2 } from '../services/r2Service.ts';
import { adminSongsService } from '../services/adminSongsService.ts';
import R2UploadModal from './admin/R2UploadModal';

interface AdminViewProps {
  onBack: () => void;
  profile: ProfileData;
  librarySongs: Song[];
  playlists: Playlist[];
  showNotification: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

type AdminTab = 'overview' | 'content' | 'remote-config' | 'crashes' | 'analytics';

const TAB_ITEMS: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <Shield size={14} /> },
  { id: 'content', label: 'Content', icon: <Upload size={14} /> },
  { id: 'remote-config', label: 'Config', icon: <Settings size={14} /> },
  { id: 'crashes', label: 'Crashes', icon: <Bug size={14} /> },
  { id: 'analytics', label: 'Analytics', icon: <Activity size={14} /> },
];

// ── FEATURE FLAG TOGGLE ───────────────────────────────────────────────
const FeatureToggle: React.FC<{
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  danger?: boolean;
}> = ({ label, description, value, onChange, danger }) => (
  <div className={`flex items-center justify-between p-4 rounded-2xl border transition-colors ${
    danger
      ? 'bg-red-950/20 border-red-500/20 hover:bg-red-950/30'
      : 'bg-white/5 border-white/5 hover:bg-white/8'
  }`}>
    <div>
      <p className={`font-semibold text-sm ${danger ? 'text-red-300' : 'text-white'}`}>{label}</p>
      {description && <p className="text-xs text-neutral-500 mt-0.5">{description}</p>}
    </div>
    <button
      onClick={() => onChange(!value)}
      className={`relative flex-shrink-0 cursor-pointer transition-all ${value ? 'text-[var(--primary-accent)]' : 'text-neutral-600'}`}
    >
      {value ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
    </button>
  </div>
);

// ── STAT CARD ─────────────────────────────────────────────────────────
const StatCard: React.FC<{ label: string; value: string | number; icon: React.ReactNode; color: string }> = ({
  label, value, icon, color
}) => (
  <div className={`relative overflow-hidden p-5 rounded-3xl border bg-gradient-to-br ${color} flex flex-col gap-1`}>
    <div className="p-2 bg-white/10 rounded-xl w-fit mb-1">{icon}</div>
    <p className="text-2xl font-black text-white">{value}</p>
    <p className="text-xs text-white/60 uppercase tracking-wider">{label}</p>
  </div>
);

// ── CRASH REPORT ITEM ─────────────────────────────────────────────────
const CrashItem: React.FC<{ report: CrashReport; onClick: () => void }> = ({ report, onClick }) => (
  <motion.button
    onClick={onClick}
    whileHover={{ x: 4 }}
    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/8 transition-colors text-left cursor-pointer"
  >
    <div className="w-10 h-10 bg-red-500/20 border border-red-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
      <Bug size={16} className="text-red-400" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-sm font-bold text-white truncate">{report.error.name}</p>
      <p className="text-xs text-neutral-500 truncate">{report.error.message}</p>
    </div>
    <div className="text-right flex-shrink-0">
      <p className="text-xs text-neutral-500">{report.context.component}</p>
    </div>
  </motion.button>
);

// ─────────────────────────────────────────────────────────────────────
const AdminView: React.FC<AdminViewProps> = ({ onBack, profile, librarySongs, playlists, showNotification }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [crashReports, setCrashReports] = useState<CrashReport[]>([]);
  const [selectedCrash, setSelectedCrash] = useState<CrashReport | null>(null);
  const [loadingCrashes, setLoadingCrashes] = useState(false);
  const [featureEdits, setFeatureEdits] = useState<Partial<AppConfig>>({});
  const { config: rcConfig } = useRemoteConfig();

  // Content upload state
  const [uploadedSongs, setUploadedSongs] = useState<any[]>([]);
  const [uploadedReels, setUploadedReels] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [isUploadingSong, setIsUploadingSong] = useState(false);
  const [isUploadingReel, setIsUploadingReel] = useState(false);
  const [isPostingAnnouncement, setIsPostingAnnouncement] = useState(false);
  const [songForm, setSongForm] = useState({ title: '', artist: '', description: '' });
  const [reelForm, setReelForm] = useState({ title: '', uploader: '', description: '' });
  const [announcementForm, setAnnouncementForm] = useState({ title: '', message: '', type: 'info' });
  const [songAudioFile, setSongAudioFile] = useState<File | null>(null);
  const [songCoverFile, setSongCoverFile] = useState<File | null>(null);
  const [songCoverPreview, setSongCoverPreview] = useState<string | null>(null);
  const [reelVideoFile, setReelVideoFile] = useState<File | null>(null);
  const [reelCoverFile, setReelCoverFile] = useState<File | null>(null);
  const [reelCoverPreview, setReelCoverPreview] = useState<string | null>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const reelVideoInputRef = useRef<HTMLInputElement>(null);
  const reelCoverInputRef = useRef<HTMLInputElement>(null);

  // Moderation state variables
  const [reelRequests, setReelRequests] = useState<any[]>([]);
  const [moderatingRequestId, setModeratingRequestId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [previewVideoId, setPreviewVideoId] = useState<string | null>(null);

  // R2 upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadFolder, setUploadFolder] = useState<'songs' | 'reels' | 'covers'>('songs');
  const [pendingR2Meta, setPendingR2Meta] = useState<{ fileUrl: string; fileName: string } | null>(null);
  const [r2MetaForm, setR2MetaForm] = useState({ title: '', artist: '', description: '' });
  const [savingMeta, setSavingMeta] = useState(false);
  const [saveMetaError, setSaveMetaError] = useState<string | null>(null);
  const [coverArtFile, setCoverArtFile] = useState<File | null>(null);
  const [coverArtPreview, setCoverArtPreview] = useState<string | null>(null);
  const [coverArtUrl, setCoverArtUrl] = useState<string>('');
  const [uploadingCover, setUploadingCover] = useState(false);

  const mockUsers = [
    { name: 'David Mwijage (Owner)', email: 'davidbyanmwijage@gmail.com', role: 'Owner / Admin', status: 'Active', tier: 'Pro' },
    { name: 'John Doe', email: 'johndoe@gmail.com', role: 'User', status: 'Active', tier: 'Free' },
    { name: 'Jane Smith', email: 'janesmith@gmail.com', role: 'User', status: 'Active', tier: 'Pro' },
  ];

  useEffect(() => {
    if (activeTab === 'crashes' && crashReports.length === 0) {
      loadCrashReports();
    }
    if (activeTab === 'content') {
      loadUploadedContent();
    }
  }, [activeTab]);

  const loadCrashReports = async () => {
    setLoadingCrashes(true);
    try {
      const reports = await crashReporter.fetchRecentReports(50);
      setCrashReports(reports);
    } catch {
      showNotification('Failed to load crash reports', 'error');
    } finally {
      setLoadingCrashes(false);
    }
  };

  const loadUploadedContent = async () => {
    try {
      const songsSnap = await getDocs(query(collection(db, 'admin_songs'), orderBy('createdAt', 'desc')));
      setUploadedSongs(songsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      const reelsSnap = await getDocs(query(collection(db, 'admin_reels'), orderBy('createdAt', 'desc')));
      setUploadedReels(reelsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      const annSnap = await getDocs(query(collection(db, 'announcements'), orderBy('createdAt', 'desc')));
      setAnnouncements(annSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      
      const requestsSnap = await getDocs(query(collection(db, 'reel_requests'), orderBy('createdAt', 'desc')));
      setReelRequests(requestsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.warn('Failed to load admin content:', err);
    }
  };

  const handleApproveReelRequest = async (request: any) => {
    try {
      showNotification('Approving and publishing reel...', 'info');
      
      const reelDoc = {
        title: request.title,
        uploader: request.uploader,
        description: request.description || '',
        url: request.url,
        thumbnailUrl: request.thumbnailUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(request.title)}&background=ff006e&color=fff&size=400`,
        source: `User Upload (${request.requestedBy})`,
        uploadedBy: request.requestedBy,
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'admin_reels'), reelDoc);
      
      await updateDoc(doc(db, 'reel_requests', request.id), {
        status: 'approved',
      });
      
      showNotification(`"${request.title}" reel approved & published live! 🎬`, 'success');
      loadUploadedContent();
    } catch (err) {
      console.error('Failed to approve request:', err);
      showNotification('Failed to approve reel.', 'error');
    }
  };

  const handleRejectReelRequest = async () => {
    if (!moderatingRequestId) return;
    if (!rejectReason.trim()) {
      showNotification('Please enter a rejection comment/reason!', 'error');
      return;
    }
    try {
      await updateDoc(doc(db, 'reel_requests', moderatingRequestId), {
        status: 'rejected',
        adminComment: rejectReason,
      });
      showNotification('Reel request rejected & comment saved.', 'success');
      setModeratingRequestId(null);
      setRejectReason('');
      loadUploadedContent();
    } catch (err) {
      console.error('Failed to reject request:', err);
      showNotification('Failed to reject reel.', 'error');
    }
  };

  const handleUploadSong = async () => {
    if (!songForm.title || !songForm.artist || !songAudioFile) {
      showNotification('Title, Artist and audio file are required!', 'error');
      return;
    }
    setIsUploadingSong(true);
    try {
      showNotification('Uploading audio to R2...', 'info');
      const audioResult = await uploadToR2(songAudioFile);
      let coverUrl = '';
      if (songCoverFile) {
        showNotification('Uploading cover art...', 'info');
        const coverResult = await uploadToR2(songCoverFile);
        coverUrl = coverResult.secure_url;
      }
      await adminSongsService.create({
        title: songForm.title,
        artist: songForm.artist,
        description: songForm.description,
        url: audioResult.secure_url,
        duration: audioResult.duration || 0,
        albumArtUrl: coverUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(songForm.title)}&background=9333ea&color=fff&size=400`,
      });
      showNotification(`"${songForm.title}" uploaded successfully! 🎵`, 'success');
      setSongForm({ title: '', artist: '', description: '' });
      setSongAudioFile(null);
      setSongCoverFile(null);
      setSongCoverPreview(null);
      loadUploadedContent();
    } catch (err) {
      console.error('Song upload failed:', err);
      showNotification('Upload failed. Check R2 config.', 'error');
    } finally {
      setIsUploadingSong(false);
    }
  };

  const handlePostAnnouncement = async () => {
    if (!announcementForm.title || !announcementForm.message) {
      showNotification('Title and message are required!', 'error');
      return;
    }
    setIsPostingAnnouncement(true);
    try {
      await addDoc(collection(db, 'announcements'), {
        title: announcementForm.title,
        message: announcementForm.message,
        type: announcementForm.type,
        postedBy: auth.currentUser?.email || 'admin',
        createdAt: serverTimestamp(),
      });
      showNotification('Announcement posted! 📣', 'success');
      setAnnouncementForm({ title: '', message: '', type: 'info' });
      loadUploadedContent();
    } catch (err) {
      showNotification('Failed to post announcement', 'error');
    } finally {
      setIsPostingAnnouncement(false);
    }
  };

  const handleDeleteAdminSong = async (id: string) => {
    try {
      await adminSongsService.delete(id);
      showNotification('Song deleted.', 'success');
      loadUploadedContent();
    } catch { showNotification('Delete failed', 'error'); }
  };

  const handleUploadReel = async () => {
    if (!reelForm.title || !reelForm.uploader || !reelVideoFile) {
      showNotification('Reel Title, Uploader and video file are required!', 'error');
      return;
    }
    setIsUploadingReel(true);
    try {
      showNotification('Uploading video to R2...', 'info');
      const videoResult = await uploadToR2(reelVideoFile);
      let coverUrl = '';
      if (reelCoverFile) {
        showNotification('Uploading thumbnail cover...', 'info');
        const coverResult = await uploadToR2(reelCoverFile);
        coverUrl = coverResult.secure_url;
      }
      const reelDoc = {
        title: reelForm.title,
        uploader: reelForm.uploader,
        description: reelForm.description,
        url: videoResult.secure_url,
        thumbnailUrl: coverUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(reelForm.title)}&background=ff006e&color=fff&size=400`,
        source: 'Admin Upload',
        uploadedBy: auth.currentUser?.email || 'admin',
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'admin_reels'), reelDoc);
      showNotification(`"${reelForm.title}" reel uploaded successfully! 🎬`, 'success');
      setReelForm({ title: '', uploader: '', description: '' });
      setReelVideoFile(null);
      setReelCoverFile(null);
      setReelCoverPreview(null);
      loadUploadedContent();
    } catch (err) {
      console.error('Reel upload failed:', err);
      showNotification('Upload failed. Check R2 connection.', 'error');
    } finally {
      setIsUploadingReel(false);
    }
  };

  const handleDeleteAdminReel = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'admin_reels', id));
      showNotification('Reel deleted.', 'success');
      loadUploadedContent();
    } catch { showNotification('Delete failed', 'error'); }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'announcements', id));
      showNotification('Announcement deleted.', 'success');
      loadUploadedContent();
    } catch { showNotification('Delete failed', 'error'); }
  };

  const handleUnlockAchievements = () => {
    if ((window as any).mwijayControls?.updateProfile) {
      (window as any).mwijayControls.updateProfile((p: ProfileData) => ({
        ...p,
        unlockedAchievements: [
          { id: 'onboarding1', date: Date.now() },
          { id: 'listen1', date: Date.now() },
          { id: 'listen100', date: Date.now() },
          { id: 'favorite1', date: Date.now() },
          { id: 'theme1', date: Date.now() },
          { id: 'quiz1', date: Date.now() },
        ],
        xp: p.xp + 2000,
        level: Math.max(p.level, 10),
      }));
      showNotification('All Achievements Unlocked + 2000 XP!', 'success');
    } else {
      showNotification('Admin controls not yet initialized.', 'info');
    }
  };

  const handleGrantXp = () => {
    if ((window as any).mwijayControls?.updateProfile) {
      (window as any).mwijayControls.updateProfile((p: ProfileData) => ({
        ...p,
        xp: p.xp + 10000,
        level: Math.floor((p.xp + 10000) / 1000) + 1,
      }));
      showNotification('Granted 10,000 XP!', 'success');
    }
  };

  const handleRefreshConfig = async () => {
    setIsRefreshing(true);
    try {
      await remoteConfig.refresh();
      showNotification('Remote Config refreshed!', 'success');
    } catch {
      showNotification('Refresh failed', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  const getCurrentFeatureValue = (key: keyof AppConfig): boolean => {
    if (key in featureEdits) return featureEdits[key] as boolean;
    return rcConfig?.[key] as boolean ?? true;
  };

  const featureFlags: { key: keyof AppConfig; label: string; desc?: string; danger?: boolean }[] = [
    { key: 'enableVisualizer', label: 'Visualizer', desc: 'Music visualizer effects' },
    { key: 'enableKaraokeMode', label: 'Karaoke Mode', desc: 'Lyrics karaoke feature' },
    { key: 'enableAiDj', label: 'AI DJ Mode', desc: 'AI-powered DJ sessions' },
    { key: 'enableSocialFeatures', label: 'Social Features', desc: 'Likes, plays, comments' },
    { key: 'enableLyrics', label: 'Lyrics', desc: 'Song lyrics view' },
    { key: 'enableEffectsStudio', label: 'Effects Studio', desc: 'Audio FX panel' },
    { key: 'enableBeatGame', label: 'Beat Game', desc: 'Music quiz / beat game' },
    { key: 'enableDownloads', label: 'Downloads', desc: 'Allow song downloads' },
    { key: 'enableSharing', label: 'Sharing', desc: 'Share cards & song links' },
    { key: 'enableBetaFeatures', label: 'Beta Features', desc: 'Experimental features' },
    { key: 'maintenanceMode', label: '⚠️ Maintenance Mode', desc: 'Locks all users out!', danger: true },
  ];

  return (
    <div className="h-full w-full overflow-y-auto scroll-container home-gradient-bg text-[var(--text-primary)]">
      <div className="max-w-5xl mx-auto px-6 pb-40 pt-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                <Shield className="text-[var(--primary-accent)]" size={22} />
                Admin Panel
              </h1>
              <p className="text-xs text-neutral-500">davidbyanmwijage@gmail.com</p>
            </div>
          </div>
          <button
            onClick={handleRefreshConfig}
            disabled={isRefreshing}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1 p-1 bg-white/5 rounded-2xl mb-6 overflow-x-auto">
          {TAB_ITEMS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[var(--primary-accent)] text-black shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* ── CONTENT UPLOAD TAB ── */}
          {activeTab === 'content' && (
            <motion.div key="content" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">

              {/* PRIMARY: Upload to R2 Storage */}
              <div className="liquid-glass-pane p-6 rounded-3xl border border-[var(--primary-accent)]/30">
                <h3 className="font-bold text-base mb-4 flex items-center gap-2">
                  <Upload size={16} className="text-[var(--primary-accent)]" />
                  Upload to R2 Storage <span className="text-[10px] bg-[var(--primary-accent)]/20 text-[var(--primary-accent)] px-2 py-0.5 rounded-full font-bold">RECOMMENDED</span>
                </h3>
                <p className="text-xs text-neutral-400 mb-4">
                  Upload directly to Cloudflare R2. Files uploaded here have full CORS support — all Web Audio effects (EQ, Maximizer, Reverb, Voice mods) will work.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => { setUploadFolder('songs'); setUploadModalOpen(true); }}
                          className="p-3 bg-neutral-800 hover:bg-neutral-700 rounded-xl text-white text-sm font-medium flex items-center gap-2 justify-center cursor-pointer">
                    <Upload size={16} />
                    Songs
                  </button>
                  <button onClick={() => { setUploadFolder('reels'); setUploadModalOpen(true); }}
                          className="p-3 bg-neutral-800 hover:bg-neutral-700 rounded-xl text-white text-sm font-medium flex items-center gap-2 justify-center cursor-pointer">
                    <Upload size={16} />
                    Reels
                  </button>
                  <button onClick={() => { setUploadFolder('covers'); setUploadModalOpen(true); }}
                          className="p-3 bg-neutral-800 hover:bg-neutral-700 rounded-xl text-white text-sm font-medium flex items-center gap-2 justify-center cursor-pointer">
                    <Upload size={16} />
                    Covers
                  </button>
                </div>
                <p className="text-[10px] text-neutral-500 mt-3 italic">
                  After uploading, add metadata (title, artist) via the "Uploaded Songs" list or use the Legacy form below.
                </p>
              </div>

              {/* LEGACY: Cloudinary uploads (collapsed) */}
              <details className="group liquid-glass-pane p-6 rounded-3xl border border-white/5">
                <summary className="cursor-pointer list-none flex items-center justify-between">
                  <h3 className="font-bold text-base flex items-center gap-2 text-neutral-400">
                    <Music size={16} />
                    Legacy Upload (Cloudinary) <span className="text-[10px] bg-neutral-700/50 text-neutral-400 px-2 py-0.5 rounded-full font-bold">OLD</span>
                  </h3>
                  <ChevronLeft size={16} className="text-neutral-500 rotate-90 group-open:-rotate-90 transition-transform" />
                </summary>
                <div className="space-y-6 mt-4">

                  {/* Upload AI Song (Legacy) */}
                  <div className="p-4 rounded-2xl border border-white/5 bg-white/5">
                    <h4 className="font-semibold text-sm mb-4 flex items-center gap-2">
                      <Music size={14} className="text-neutral-400" />
                      Upload AI Song (stores to R2, but old flow)
                    </h4>
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="Song Title"
                          value={songForm.title}
                          onChange={e => setSongForm(p => ({ ...p, title: e.target.value }))}
                          className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-[var(--primary-accent)]/50 text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Artist Name"
                          value={songForm.artist}
                          onChange={e => setSongForm(p => ({ ...p, artist: e.target.value }))}
                          className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-[var(--primary-accent)]/50 text-sm"
                        />
                      </div>
                      <textarea
                        placeholder="Description (optional)"
                        value={songForm.description}
                        onChange={e => setSongForm(p => ({ ...p, description: e.target.value }))}
                        rows={2}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-[var(--primary-accent)]/50 text-sm resize-none"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          onClick={() => audioInputRef.current?.click()}
                          className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-colors cursor-pointer ${
                            songAudioFile ? 'border-green-500/50 bg-green-950/20 text-green-300' : 'border-white/10 bg-white/5 text-neutral-400 hover:bg-white/10'
                          }`}
                        >
                          <Music size={16} />
                          {songAudioFile ? songAudioFile.name.slice(0, 20) + '...' : 'Choose Audio File'}
                        </button>
                        <button
                          onClick={() => coverInputRef.current?.click()}
                          className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-colors cursor-pointer ${
                            songCoverFile ? 'border-green-500/50 bg-green-950/20 text-green-300' : 'border-white/10 bg-white/5 text-neutral-400 hover:bg-white/10'
                          }`}
                        >
                          <Image size={16} />
                          {songCoverFile ? 'Cover Selected ✓' : 'Choose Cover Art'}
                        </button>
                      </div>
                      {songCoverPreview && (
                        <div className="relative w-24 h-24 rounded-xl overflow-hidden">
                          <img src={songCoverPreview} alt="Cover preview" className="w-full h-full object-cover" />
                          <button onClick={() => { setSongCoverFile(null); setSongCoverPreview(null); }} className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center">
                            <X size={10} />
                          </button>
                        </div>
                      )}
                      <button
                        onClick={handleUploadSong}
                        disabled={isUploadingSong}
                        className="w-full flex items-center justify-center gap-2 bg-[var(--primary-accent)] text-black font-black py-3 rounded-xl transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 cursor-pointer text-sm"
                      >
                        {isUploadingSong ? <RefreshCw size={16} className="animate-spin" /> : <Upload size={16} />}
                        {isUploadingSong ? 'Uploading...' : 'Upload Song to R2 & Firebase'}
                      </button>
                    </div>
                    <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={e => { if (e.target.files?.[0]) setSongAudioFile(e.target.files[0]); }} />
                    <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) { setSongCoverFile(e.target.files[0]); const url = URL.createObjectURL(e.target.files[0]); setSongCoverPreview(url); }}} />
                  </div>

                  {/* Upload Admin Reel (Legacy) */}
                  <div className="p-4 rounded-2xl border border-white/5 bg-white/5">
                    <h4 className="font-semibold text-sm mb-4 flex items-center gap-2">
                      <Film size={14} className="text-neutral-400" />
                      Upload Admin Reel (stores to R2, but old flow)
                    </h4>
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="Reel Title"
                          value={reelForm.title}
                          onChange={e => setReelForm(p => ({ ...p, title: e.target.value }))}
                          className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-[var(--primary-accent)]/50 text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Uploader / Artist Name"
                          value={reelForm.uploader}
                          onChange={e => setReelForm(p => ({ ...p, uploader: e.target.value }))}
                          className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-[var(--primary-accent)]/50 text-sm"
                        />
                      </div>
                      <textarea
                        placeholder="Description (optional)"
                        value={reelForm.description}
                        onChange={e => setReelForm(p => ({ ...p, description: e.target.value }))}
                        rows={2}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-[var(--primary-accent)]/50 text-sm resize-none"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          onClick={() => reelVideoInputRef.current?.click()}
                          className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-colors cursor-pointer ${
                            reelVideoFile ? 'border-green-500/50 bg-green-950/20 text-green-300' : 'border-white/10 bg-white/5 text-neutral-400 hover:bg-white/10'
                          }`}
                        >
                          <Film size={16} />
                          {reelVideoFile ? reelVideoFile.name.slice(0, 20) + '...' : 'Choose Video File'}
                        </button>
                        <button
                          onClick={() => reelCoverInputRef.current?.click()}
                          className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-colors cursor-pointer ${
                            reelCoverFile ? 'border-green-500/50 bg-green-950/20 text-green-300' : 'border-white/10 bg-white/5 text-neutral-400 hover:bg-white/10'
                          }`}
                        >
                          <Image size={16} />
                          {reelCoverFile ? 'Cover Selected ✓' : 'Choose Cover Art (Optional)'}
                        </button>
                      </div>
                      {reelCoverPreview && (
                        <div className="relative w-24 h-24 rounded-xl overflow-hidden">
                          <img src={reelCoverPreview} alt="Reel cover preview" className="w-full h-full object-cover" />
                          <button onClick={() => { setReelCoverFile(null); setReelCoverPreview(null); }} className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center">
                            <X size={10} />
                          </button>
                        </div>
                      )}
                      <button
                        onClick={handleUploadReel}
                        disabled={isUploadingReel}
                        className="w-full flex items-center justify-center gap-2 bg-[var(--primary-accent)] text-black font-black py-3 rounded-xl transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 cursor-pointer text-sm"
                      >
                        {isUploadingReel ? <RefreshCw size={16} className="animate-spin" /> : <Upload size={16} />}
                        {isUploadingReel ? 'Uploading Video...' : 'Upload Reel to R2 & Firebase'}
                      </button>
                    </div>
                    <input ref={reelVideoInputRef} type="file" accept="video/*" className="hidden" onChange={e => { if (e.target.files?.[0]) setReelVideoFile(e.target.files[0]); }} />
                    <input ref={reelCoverInputRef} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) { setReelCoverFile(e.target.files[0]); const url = URL.createObjectURL(e.target.files[0]); setReelCoverPreview(url); }}} />
                  </div>

                </div>
              </details>

              {/* User Reel Requests Moderation */}
              <div className="liquid-glass-pane p-6 rounded-3xl border border-white/5 space-y-4">
                <h3 className="font-bold text-base mb-4 flex items-center gap-2">
                  <Film size={16} className="text-[var(--primary-accent)]" />
                  User Reel Upload Requests ({reelRequests.filter(r => r.status === 'pending').length} Pending)
                </h3>

                {reelRequests.filter(r => r.status === 'pending').length > 0 ? (
                  <div className="space-y-4">
                    {reelRequests.filter(r => r.status === 'pending').map((req) => (
                      <div key={req.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-sm text-white truncate">{req.title}</h4>
                            <p className="text-xs text-neutral-400">by {req.uploader} • Requested by: <span className="font-mono text-[var(--primary-accent)]">{req.requestedBy}</span></p>
                            {req.description && <p className="text-xs text-neutral-500 mt-1 italic">{req.description}</p>}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => setPreviewVideoId(previewVideoId === req.id ? null : req.id)}
                              className="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                            >
                              <Eye size={12} />
                              {previewVideoId === req.id ? 'Close Preview' : 'Preview Video'}
                            </button>
                            <button
                              onClick={() => handleApproveReelRequest(req)}
                              className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                            >
                              <CheckCircle size={12} />
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setModeratingRequestId(req.id);
                                setRejectReason('');
                              }}
                              className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                            >
                              <AlertTriangle size={12} />
                              Reject / Flag
                            </button>
                          </div>
                        </div>

                        {/* Inline Video Player Preview */}
                        {previewVideoId === req.id && (
                          <div className="relative rounded-2xl overflow-hidden bg-black aspect-video max-w-sm mx-auto border border-white/10">
                            <video
                              src={req.url}
                              controls
                              playsInline
                              className="w-full h-full object-contain"
                            />
                          </div>
                        )}

                        {/* Rejection comment text area */}
                        {moderatingRequestId === req.id && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="p-3 bg-red-950/20 border border-red-500/20 rounded-xl space-y-2 mt-2"
                          >
                            <label className="block text-[10px] font-black uppercase text-red-400">Rejection Reason / Flag Comments:</label>
                            <textarea
                              placeholder="Explain why the video is stopped (e.g. copyright issues, low audio quality, resolution incorrect)..."
                              value={rejectReason}
                              onChange={e => setRejectReason(e.target.value)}
                              rows={2}
                              className="w-full bg-black/40 border border-red-500/30 rounded-lg p-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-500"
                            />
                            <div className="flex justify-end gap-2 text-xs">
                              <button
                                onClick={() => setModeratingRequestId(null)}
                                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-neutral-400 rounded-lg font-bold"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleRejectReelRequest}
                                className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold"
                              >
                                Confirm Rejection
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-500 text-center py-4">No pending reel requests at the moment.</p>
                )}

                {/* Historial Processed requests */}
                {reelRequests.filter(r => r.status !== 'pending').length > 0 && (
                  <div className="border-t border-white/5 pt-4 space-y-2">
                    <h4 className="font-bold text-xs text-neutral-400 uppercase tracking-wider">Processed Reel Requests History</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                      {reelRequests.filter(r => r.status !== 'pending').map((req) => (
                        <div key={req.id} className="flex items-center justify-between gap-3 p-3 bg-white/5 rounded-xl border border-white/5 text-xs">
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-white truncate">{req.title}</p>
                            <p className="text-[10px] text-neutral-500 truncate">Requested by: {req.requestedBy}</p>
                            {req.status === 'rejected' && req.adminComment && (
                              <p className="text-[10px] text-red-400 italic truncate mt-0.5 font-semibold">Comment: "{req.adminComment}"</p>
                            )}
                          </div>
                          <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase ${
                            req.status === 'approved' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}>
                            {req.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Post Announcement */}
              <div className="liquid-glass-pane p-6 rounded-3xl border border-white/5">
                <h3 className="font-bold text-base mb-4 flex items-center gap-2">
                  <Megaphone size={16} className="text-amber-400" />
                  Post Announcement
                </h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Announcement Title"
                    value={announcementForm.title}
                    onChange={e => setAnnouncementForm(p => ({ ...p, title: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400/50 text-sm"
                  />
                  <textarea
                    placeholder="Announcement message..."
                    value={announcementForm.message}
                    onChange={e => setAnnouncementForm(p => ({ ...p, message: e.target.value }))}
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400/50 text-sm resize-none"
                  />
                  <div className="flex gap-2">
                    {['info', 'success', 'warning'].map(t => (
                      <button
                        key={t}
                        onClick={() => setAnnouncementForm(p => ({ ...p, type: t }))}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-all ${
                          announcementForm.type === t
                            ? t === 'info' ? 'bg-blue-500 text-white' : t === 'success' ? 'bg-green-500 text-white' : 'bg-amber-500 text-black'
                            : 'bg-white/5 text-neutral-400 hover:bg-white/10'
                        }`}
                      >
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handlePostAnnouncement}
                    disabled={isPostingAnnouncement}
                    className="w-full flex items-center justify-center gap-2 bg-amber-500 text-black font-black py-3 rounded-xl transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 cursor-pointer text-sm"
                  >
                    {isPostingAnnouncement ? <RefreshCw size={16} className="animate-spin" /> : <Bell size={16} />}
                    {isPostingAnnouncement ? 'Posting...' : 'Post Announcement'}
                  </button>
                </div>
              </div>

              {/* Manage Mwijay Songs */}
              {uploadedSongs.length > 0 && (
                <div className="liquid-glass-pane p-5 rounded-3xl border border-white/5">
                  <h3 className="font-bold text-sm text-neutral-400 uppercase tracking-wider mb-3">Mwijay Originals ({uploadedSongs.length})</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                    {uploadedSongs.map((s: any) => (
                      <div key={s.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                        {s.albumArtUrl && <img src={s.albumArtUrl} alt={s.title} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-white truncate">{s.title}</p>
                          <p className="text-xs text-neutral-400 truncate">{s.artist}</p>
                          <p className="text-[10px] text-neutral-500">{s.playCount || 0} plays</p>
                        </div>
                        <button onClick={async () => { await adminSongsService.toggleFeature(s.id, !s.featured); loadUploadedContent(); showNotification(s.featured ? 'Unfeatured' : 'Featured!', 'success'); }}
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${s.featured ? 'bg-[var(--primary-accent)] text-black' : 'bg-white/5 text-neutral-500 hover:bg-white/10'}`}
                                title={s.featured ? 'Unfeature' : 'Feature on Home'}>
                          <Star size={12} />
                        </button>
                        <button onClick={() => handleDeleteAdminSong(s.id)} className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center hover:bg-red-500/40 transition-colors cursor-pointer">
                          <Trash2 size={12} className="text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Uploaded Reels List */}
              {uploadedReels.length > 0 && (
                <div className="liquid-glass-pane p-5 rounded-3xl border border-white/5">
                  <h3 className="font-bold text-sm text-neutral-400 uppercase tracking-wider mb-3">Uploaded Reels ({uploadedReels.length})</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                    {uploadedReels.map((r: any) => (
                      <div key={r.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                        {r.thumbnailUrl && <img src={r.thumbnailUrl} alt={r.title} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-white truncate">{r.title}</p>
                          <p className="text-xs text-neutral-400 truncate">{r.uploader}</p>
                        </div>
                        <button onClick={() => handleDeleteAdminReel(r.id)} className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center hover:bg-red-500/40 transition-colors cursor-pointer">
                          <Trash2 size={12} className="text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Announcements List */}
              {announcements.length > 0 && (
                <div className="liquid-glass-pane p-5 rounded-3xl border border-white/5">
                  <h3 className="font-bold text-sm text-neutral-400 uppercase tracking-wider mb-3">Active Announcements ({announcements.length})</h3>
                  <div className="space-y-2">
                    {announcements.map((a: any) => (
                      <div key={a.id} className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                        <Bell size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-white">{a.title}</p>
                          <p className="text-xs text-neutral-400 line-clamp-2">{a.message}</p>
                        </div>
                        <button onClick={() => handleDeleteAnnouncement(a.id)} className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center hover:bg-red-500/40 transition-colors cursor-pointer">
                          <Trash2 size={12} className="text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ── OVERVIEW TAB ── */}
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">

              {/* Owner badge */}
              <div className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-r from-purple-900/40 via-indigo-900/20 to-transparent border border-purple-500/30">
                <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
                  <Award size={150} className="text-white" />
                </div>
                <span className="bg-[var(--primary-accent)] text-black font-black text-xs px-3 py-1 rounded-full uppercase tracking-wider inline-block mb-3">
                  PRO OWNER ACTIVE
                </span>
                <h2 className="text-lg font-bold text-white mb-1">Super privileges enabled</h2>
                <p className="text-sm text-neutral-400">
                  Verified as <span className="text-[var(--primary-accent)] font-bold">davidbyanmwijage@gmail.com</span>
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
                  <span className="text-xs text-neutral-500 font-mono">Firebase Auth Hook Enabled</span>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Tracks" value={librarySongs.length} icon={<Music size={16} />} color="from-purple-500/25 to-purple-500/5 border-purple-500/20 text-purple-400" />
                <StatCard label="Playlists" value={playlists.length} icon={<Database size={16} />} color="from-blue-500/25 to-blue-500/5 border-blue-500/20 text-blue-400" />
                <StatCard label="Level" value={`Lvl ${profile.level}`} icon={<Trophy size={16} />} color="from-amber-500/25 to-amber-500/5 border-amber-500/20 text-amber-400" />
                <StatCard label="XP" value={`${profile.xp.toLocaleString()}`} icon={<Zap size={16} />} color="from-green-500/25 to-green-500/5 border-green-500/20 text-green-400" />
              </div>

              {/* Quick actions */}
              <div className="liquid-glass-pane p-6 rounded-3xl border border-white/5">
                <h3 className="font-bold text-base mb-4 flex items-center gap-2">
                  <Sparkles size={16} className="text-[var(--primary-accent)]" />
                  Quick Developer Tools
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button onClick={handleUnlockAchievements} className="bg-white/5 hover:bg-[var(--primary-accent)] hover:text-black border border-white/10 py-3 px-4 rounded-2xl font-bold text-sm transition-all flex items-center gap-2 text-white active:scale-95 cursor-pointer">
                    <Trophy size={16} /> Unlock All Achievements
                  </button>
                  <button onClick={handleGrantXp} className="bg-white/5 hover:bg-[var(--primary-accent)] hover:text-black border border-white/10 py-3 px-4 rounded-2xl font-bold text-sm transition-all flex items-center gap-2 text-white active:scale-95 cursor-pointer">
                    <Zap size={16} /> Grant +10,000 XP
                  </button>
                </div>
              </div>

              {/* Users table */}
              <div className="liquid-glass-pane p-6 rounded-3xl border border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <Users size={16} className="text-[var(--primary-accent)]" /> User Registry
                  </h3>
                  <span className="text-xs text-neutral-500 bg-white/5 px-3 py-1 rounded-full">{mockUsers.length} users</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-neutral-500 text-xs uppercase tracking-wider">
                        <th className="pb-3 pr-4">User</th>
                        <th className="pb-3 pr-4 hidden md:table-cell">Email</th>
                        <th className="pb-3 pr-4">Role</th>
                        <th className="pb-3 text-right">Tier</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockUsers.map((u, i) => (
                        <tr key={i} className="border-b border-white/5 last:border-0">
                          <td className="py-3 pr-4 font-bold text-white text-sm">{u.name}</td>
                          <td className="py-3 pr-4 text-xs font-mono text-neutral-400 hidden md:table-cell">{u.email}</td>
                          <td className="py-3 pr-4 text-xs text-neutral-400">{u.role}</td>
                          <td className="py-3 text-right">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${u.tier === 'Pro' ? 'bg-amber-400/20 text-amber-300' : 'bg-neutral-600/30 text-neutral-400'}`}>
                              {u.tier}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── REMOTE CONFIG TAB ── */}
          {activeTab === 'remote-config' && (
            <motion.div key="config" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black">Remote Configuration</h2>
                  <p className="text-xs text-neutral-500">Changes apply to all users after sync (read-only here — edit in Firebase Console)</p>
                </div>
              </div>

              {/* Current config values */}
              <div className="liquid-glass-pane p-5 rounded-3xl border border-white/5 space-y-2">
                <h3 className="font-bold text-sm text-neutral-400 uppercase tracking-wider mb-3">Current Feature Flags</h3>
                {featureFlags.map(({ key, label, desc, danger }) => (
                  <FeatureToggle
                    key={key}
                    label={label}
                    description={`Remote value: ${rcConfig?.[key] !== undefined ? String(rcConfig[key]) : 'loading...'}`}
                    value={getCurrentFeatureValue(key)}
                    onChange={(v) => {
                      setFeatureEdits(prev => ({ ...prev, [key]: v }));
                      showNotification(`${label}: ${v ? 'ON' : 'OFF'} (local preview only)`, 'info');
                    }}
                    danger={danger}
                  />
                ))}
              </div>

              {/* Announcement preview */}
              {rcConfig?.showAnnouncement && (
                <div className="p-5 rounded-3xl border border-purple-500/30 bg-purple-900/20 space-y-2">
                  <h3 className="font-bold text-sm text-purple-300 flex items-center gap-2">
                    <Eye size={14} /> Active Announcement
                  </h3>
                  <p className="text-sm text-white">{rcConfig.announcementText || 'No text set'}</p>
                  <p className="text-xs text-neutral-500">Color: {rcConfig.announcementColor} • Icon: {rcConfig.announcementIcon}</p>
                </div>
              )}

              <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                <p className="text-xs text-neutral-500 leading-relaxed">
                  💡 To apply changes globally, update values in{' '}
                  <strong className="text-white">Firebase Console → Remote Config</strong>.
                  This panel shows current live values. Toggle changes here are local preview only.
                </p>
              </div>
            </motion.div>
          )}

          {/* ── CRASH REPORTS TAB ── */}
          {activeTab === 'crashes' && (
            <motion.div key="crashes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black">Crash Reports</h2>
                  <p className="text-xs text-neutral-500">{crashReports.length} reports in Firestore</p>
                </div>
                <button
                  onClick={loadCrashReports}
                  disabled={loadingCrashes}
                  className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer"
                >
                  <RefreshCw size={12} className={loadingCrashes ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>

              {loadingCrashes ? (
                <div className="flex items-center justify-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <RefreshCw size={24} className="animate-spin text-purple-400" />
                    <p className="text-xs text-neutral-500">Loading crash reports…</p>
                  </div>
                </div>
              ) : crashReports.length === 0 ? (
                <div className="flex flex-col items-center py-16 gap-3">
                  <div className="text-4xl">✅</div>
                  <p className="text-white font-bold">No crashes reported</p>
                  <p className="text-neutral-500 text-sm">The app is running smoothly!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {crashReports.map((r, i) => (
                    <CrashItem key={r.id || i} report={r} onClick={() => setSelectedCrash(r)} />
                  ))}
                </div>
              )}

              {/* Crash Detail Modal */}
              <AnimatePresence>
                {selectedCrash && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
                    onClick={() => setSelectedCrash(null)}
                  >
                    <motion.div
                      initial={{ y: 50, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 50, opacity: 0 }}
                      onClick={e => e.stopPropagation()}
                      className="bg-[#111] border border-white/10 rounded-3xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto space-y-4"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-black text-white">{selectedCrash.error.name}</h3>
                          <p className="text-xs text-red-400 mt-1">{selectedCrash.error.message}</p>
                        </div>
                        <button onClick={() => setSelectedCrash(null)} className="text-neutral-400 hover:text-white cursor-pointer">✕</button>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-white/5 p-3 rounded-xl">
                          <p className="text-neutral-500 mb-1">Component</p>
                          <p className="text-white font-mono">{selectedCrash.context.component}</p>
                        </div>
                        <div className="bg-white/5 p-3 rounded-xl">
                          <p className="text-neutral-500 mb-1">Platform</p>
                          <p className="text-white font-mono">{selectedCrash.context.platform}</p>
                        </div>
                        <div className="bg-white/5 p-3 rounded-xl">
                          <p className="text-neutral-500 mb-1">Action</p>
                          <p className="text-white font-mono">{selectedCrash.context.action}</p>
                        </div>
                        <div className="bg-white/5 p-3 rounded-xl">
                          <p className="text-neutral-500 mb-1">User</p>
                          <p className="text-white font-mono truncate">{selectedCrash.userEmail || 'anonymous'}</p>
                        </div>
                      </div>
                      {selectedCrash.error.stack && (
                        <div>
                          <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2">Stack Trace</p>
                          <pre className="bg-black/60 text-red-300 text-[10px] p-4 rounded-xl overflow-x-auto leading-relaxed whitespace-pre-wrap">
                            {selectedCrash.error.stack.substring(0, 1000)}
                          </pre>
                        </div>
                      )}
                      {selectedCrash.breadcrumbs.length > 0 && (
                        <div>
                          <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2">Breadcrumbs ({selectedCrash.breadcrumbs.length})</p>
                          <div className="space-y-1.5">
                            {selectedCrash.breadcrumbs.map((b, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs">
                                <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] ${
                                  b.category === 'error' ? 'bg-red-500/20 text-red-400' :
                                  b.category === 'navigation' ? 'bg-blue-500/20 text-blue-400' :
                                  'bg-white/10 text-neutral-400'
                                }`}>{b.category}</span>
                                <span className="text-neutral-300">{b.message}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ── ANALYTICS TAB ── */}
          {activeTab === 'analytics' && (
            <motion.div key="analytics" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <div>
                <h2 className="text-lg font-black">Analytics</h2>
                <p className="text-xs text-neutral-500">Real-time metrics from Firebase Analytics</p>
              </div>

              {/* Live stats */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard label="Songs Played" value={(profile.analytics?.songsPlayed || 0).toLocaleString()} icon={<Music size={16} />} color="from-purple-500/25 to-purple-500/5 border-purple-500/20 text-purple-400" />
                <StatCard label="Listen Time" value={`${Math.round((profile.analytics?.listenTime || 0) / 3600)}h`} icon={<Clock size={16} />} color="from-blue-500/25 to-blue-500/5 border-blue-500/20 text-blue-400" />
                <StatCard label="Day Streak" value={profile.streak?.currentStreak || 0} icon={<Flame size={16} />} color="from-orange-500/25 to-orange-500/5 border-orange-500/20 text-orange-400" />
              </div>

              <div className="liquid-glass-pane p-5 rounded-3xl border border-white/5">
                <h3 className="font-bold text-sm text-neutral-400 uppercase tracking-wider mb-4">Top Activity</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-neutral-300">Songs Edited</span>
                    <span className="text-sm font-bold text-white">{profile.analytics?.songsEdited || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-neutral-300">Library Songs</span>
                    <span className="text-sm font-bold text-white">{librarySongs.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-neutral-300">Playlists</span>
                    <span className="text-sm font-bold text-white">{playlists.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-neutral-300">Achievements</span>
                    <span className="text-sm font-bold text-white">{(profile.unlockedAchievements || []).length}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-blue-500/20 bg-blue-950/20">
                <p className="text-xs text-blue-300 leading-relaxed">
                  📊 For full Firebase Analytics dashboards, visit{' '}
                  <strong>Firebase Console → Analytics</strong>. Events like song plays, searches, feature usage, and user actions are tracked automatically.
                </p>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

        <R2UploadModal
          isOpen={uploadModalOpen}
          onClose={() => setUploadModalOpen(false)}
          folder={uploadFolder}
          onUploadComplete={(results) => {
            console.log('[Admin] Upload complete:', results);
            const succeeded = results.filter(r => r.success);
            const failed = results.filter(r => !r.success);
            if (succeeded.length > 0) {
              showNotification(`Uploaded ${succeeded.length} file(s) to R2`, 'success');
              if (uploadFolder === 'songs' && succeeded[0]) {
                setPendingR2Meta({ fileUrl: succeeded[0].publicUrl, fileName: succeeded[0].fileName });
                setR2MetaForm({ title: '', artist: '', description: '' });
              }
            }
            if (failed.length > 0) {
              showNotification(`${failed.length} upload(s) failed. Check console.`, 'error');
            }
          }}
        />

        {/* R2 Upload Metadata Form */}
        {pendingR2Meta && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
               onClick={() => { if (!savingMeta) setPendingR2Meta(null); }}>
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg p-6"
                 onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-base text-white mb-1">Add Song Metadata</h3>
              <p className="text-xs text-neutral-400 mb-4 truncate">
                File: {pendingR2Meta.fileName}
              </p>
              <div className="space-y-3">

                {/* Cover Art Upload */}
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Cover Art</label>
                  {coverArtPreview ? (
                    <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-white/10">
                      <img src={coverArtPreview} className="w-full h-full object-cover" alt="Cover preview" />
                      <button onClick={() => { setCoverArtFile(null); setCoverArtPreview(null); setCoverArtUrl(''); }}
                              className="absolute top-1 right-1 w-6 h-6 bg-black/70 text-white rounded-full flex items-center justify-center hover:bg-black/90 cursor-pointer">
                        ✕
                      </button>
                    </div>
                  ) : (
                    <label className="block w-32 h-32 border-2 border-dashed border-neutral-700 hover:border-[var(--primary-accent)] rounded-lg cursor-pointer flex items-center justify-center text-neutral-400 hover:text-white transition-colors text-sm">
                      <input type="file" accept="image/*" className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setCoverArtFile(file);
                          setCoverArtPreview(URL.createObjectURL(file));
                          setUploadingCover(true);
                          try {
                            const fd = new FormData();
                            fd.append('file', file);
                            fd.append('folder', 'covers');
                            const res = await fetch('/api/r2/upload', { method: 'POST', body: fd });
                            if (res.ok) {
                              const data = await res.json();
                              setCoverArtUrl(data.secure_url);
                            } else {
                              throw new Error('Upload failed');
                            }
                          } catch (e) {
                            console.error('[Cover] Upload error:', e);
                            showNotification('Cover art upload failed, will use auto-generated', 'error');
                          } finally {
                            setUploadingCover(false);
                          }
                        }}
                      />
                      {uploadingCover ? 'Uploading...' : '+ Add Cover'}
                    </label>
                  )}
                </div>

                <input
                  type="text"
                  placeholder="Song Title *"
                  value={r2MetaForm.title}
                  onChange={e => setR2MetaForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-[var(--primary-accent)]/50 text-sm"
                />
                <input
                  type="text"
                  placeholder="Artist Name *"
                  value={r2MetaForm.artist}
                  onChange={e => setR2MetaForm(p => ({ ...p, artist: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-[var(--primary-accent)]/50 text-sm"
                />
                <textarea
                  placeholder="Description (optional)"
                  value={r2MetaForm.description}
                  onChange={e => setR2MetaForm(p => ({ ...p, description: e.target.value }))}
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-[var(--primary-accent)]/50 text-sm resize-none"
                />

                {saveMetaError && (
                  <p className="text-red-400 text-xs">{saveMetaError}</p>
                )}

                <div className="flex gap-3">
                  <button onClick={() => { setPendingR2Meta(null); setSaveMetaError(null); setCoverArtFile(null); setCoverArtPreview(null); setCoverArtUrl(''); }}
                          disabled={savingMeta}
                          className="flex-1 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-medium cursor-pointer text-sm disabled:opacity-50">
                    Skip
                  </button>
                  <button onClick={async () => {
                    if (!r2MetaForm.title || !r2MetaForm.artist) {
                      setSaveMetaError('Title and Artist are required');
                      return;
                    }
                    setSavingMeta(true);
                    setSaveMetaError(null);
                    try {
                      const timeoutPromise = new Promise<never>((_, reject) =>
                        setTimeout(() => reject(new Error('Save timed out — check internet connection')), 30000)
                      );
                      const savePromise = adminSongsService.create({
                        title: r2MetaForm.title.trim(),
                        artist: r2MetaForm.artist.trim(),
                        description: r2MetaForm.description.trim(),
                        url: pendingR2Meta.fileUrl,
                        albumArtUrl: coverArtUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(r2MetaForm.title)}&background=9333ea&color=fff&size=400`,
                      });
                      await Promise.race([savePromise, timeoutPromise]);
                      showNotification(`"${r2MetaForm.title}" saved to Firestore! 🎵`, 'success');
                      setPendingR2Meta(null);
                      setCoverArtFile(null);
                      setCoverArtPreview(null);
                      setCoverArtUrl('');
                      setSaveMetaError(null);
                      loadUploadedContent();
                    } catch (err: any) {
                      console.error('Failed to save metadata:', err);
                      setSaveMetaError(err?.message || 'Failed to save to Firestore');
                    } finally {
                      setSavingMeta(false);
                    }
                  }}
                          disabled={savingMeta}
                          className="flex-1 py-3 rounded-xl bg-[var(--primary-accent)] text-black font-bold hover:brightness-110 cursor-pointer text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                    {savingMeta ? (
                      <><span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> Saving...</>
                    ) : 'Save Song'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminView;
