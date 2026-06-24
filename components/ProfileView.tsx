
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ArrowLeft, Smile, Camera, Pencil, Headphones, Play, Music, Settings, LogOut, Loader2, Award, Flame, Snowflake, ChevronDown, ChevronUp, Sparkles, Film, AlertTriangle, CheckCircle, X, Upload } from 'lucide-react';
import type { ProfileData } from '../types.ts';
import { fonts, achievements, nameplateAnimations } from './constants.ts';
import { useInterruptibleScroll } from '../hooks/useInterruptibleScroll.ts';
import { emojiToDataUrl } from '../utils/helpers.ts';
import BubbleButton from './BubbleButton.tsx';
import { uploadToR2 } from '../services/r2Service.ts';
import { auth, logout, signInWithGoogle, db } from '../services/firebase.ts';
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { getXpForLevel, getTitleForLevel, getLevelRewards } from '../utils/gamification.ts';

const SectionCard: React.FC<{ title: string; subtitle?: string; children: React.ReactNode; className?: string }> = ({ title, subtitle, children, className = '' }) => (
    <div className={`liquid-glass-pane glare-effect p-6 rounded-2xl ${className}`}>
        <h2 className="text-xl font-bold text-[var(--text-primary)]">{title}</h2>
        {subtitle && <p className="text-xs text-[var(--text-secondary)] -mt-1 mb-4">{subtitle}</p>}
        {children}
    </div>
);

const StatItem: React.FC<{ value: string, label: string, icon: React.ReactNode }> = ({ value, label, icon }) => (
    <div className="text-center">
        <div className="flex justify-center mb-1 text-[var(--primary-accent)]">
            {icon}
        </div>
        <p className="text-xl font-bold text-[var(--text-primary)]">{value}</p>
        <p className="text-xs text-[var(--text-secondary)]">{label}</p>
    </div>
);

const formatListenTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
};

// --- Achievements View Component ---
const AchievementsView: React.FC<{ profile: ProfileData; onBack: () => void }> = ({ profile, onBack }) => {
    const [filter, setFilter] = useState<'All' | 'Unlocked' | 'Locked'>('All');

    const formatDate = (timestamp: number) => new Date(timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const filteredAchievements = useMemo(() => {
        const unlockedIds = new Set((profile.unlockedAchievements || []).map(a => a.id));
        if (filter === 'Unlocked') {
            return achievements.filter(ach => unlockedIds.has(ach.id));
        }
        if (filter === 'Locked') {
            return achievements.filter(ach => !unlockedIds.has(ach.id));
        }
        return achievements;
    }, [filter, profile.unlockedAchievements]);
    
    const unlockedMap = useMemo(() => 
        new Map((profile.unlockedAchievements || []).map(a => [a.id, a.date])), 
    [profile.unlockedAchievements]);

    return (
        <main className="h-full w-full home-gradient-bg flex flex-col p-6 pb-24">
            <header className="flex items-center gap-4 mb-6">
                <button onClick={onBack} className="text-2xl text-[var(--text-primary)]" aria-label="Back" title="Back"><ArrowLeft size={24} /></button>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Achievements</h1>
            </header>

            <div className="flex gap-2 mb-6 bg-[var(--surface-color)] p-1 rounded-full">
                {(['All', 'Unlocked', 'Locked'] as const).map(f => (
                    <button key={f} onClick={() => setFilter(f)} className={`flex-1 py-2 text-sm font-bold rounded-full transition-colors ${filter === f ? 'bg-[var(--primary-accent)] text-black' : 'text-[var(--text-secondary)]'}`} title={`Filter by ${f}`}>
                        {f}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto scroll-container -mx-6 px-6">
                <div className="grid grid-cols-2 gap-4">
                    {filteredAchievements.map(ach => {
                        const unlockDate = unlockedMap.get(ach.id);
                        const isUnlocked = !!unlockDate;
                        return (
                            <div key={ach.id} className={`p-4 rounded-2xl flex flex-col items-center text-center transition-all ${isUnlocked ? 'bg-[var(--surface-color)] border border-[var(--surface-border-color)] shadow-lg' : 'bg-white/5 opacity-70'}`}>
                                <div className={`text-5xl mb-3 transition-transform ${isUnlocked ? 'scale-100' : 'scale-90 opacity-50'}`}>
                                    {isUnlocked ? ach.emoji : '🔒'}
                                </div>
                                <h3 className="font-bold text-sm leading-tight text-[var(--text-primary)]">{ach.name}</h3>
                                <p className="text-xs text-[var(--text-secondary)] mt-1 flex-1">{ach.description}</p>
                                {isUnlocked && (
                                    <p className="text-xs text-[var(--text-secondary)] font-mono mt-3 pt-2 border-t border-[var(--surface-border-color)] w-full">{formatDate(unlockDate)}</p>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </main>
    );
};


interface ProfileViewProps {
    profile: ProfileData;
    onUpdateProfile: (updater: (prev: ProfileData) => ProfileData) => void;
    onOpenAppearance: () => void;
    onBack: () => void;
    onNavigate: (view: string) => void;
    onOpenCameraModal: () => void;
    onOpenEmojiPicker: () => void;
    showNotification: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ profile, onUpdateProfile, onOpenAppearance, onBack, onNavigate, onOpenCameraModal, onOpenEmojiPicker, showNotification }) => {
    const [isAchievementsVisible, setAchievementsVisible] = useState(false);
    const [isRewardsExpanded, setRewardsExpanded] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Reel upload requests state
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [reelRequests, setReelRequests] = useState<any[]>([]);
    const [loadingRequests, setLoadingRequests] = useState(false);
    const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
    const [requestForm, setRequestForm] = useState({ title: '', uploader: '', description: '' });
    const [requestVideoFile, setRequestVideoFile] = useState<File | null>(null);
    const [requestCoverFile, setRequestCoverFile] = useState<File | null>(null);
    const [requestCoverPreview, setRequestCoverPreview] = useState<string | null>(null);
    const requestVideoInputRef = useRef<HTMLInputElement>(null);
    const requestCoverInputRef = useRef<HTMLInputElement>(null);

    const loadUserRequests = async () => {
        if (!auth.currentUser?.email) return;
        setLoadingRequests(true);
        try {
            const q = query(
                collection(db, 'reel_requests'),
                where('requestedBy', '==', auth.currentUser.email),
                orderBy('createdAt', 'desc')
            );
            const snap = await getDocs(q);
            setReelRequests(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (e) {
            console.warn('[ProfileView] Failed to fetch reel requests:', e);
        } finally {
            setLoadingRequests(false);
        }
    };

    useEffect(() => {
        loadUserRequests();
    }, [profile.name]);

    const handleAddReelRequest = async () => {
        if (!requestForm.title || !requestForm.uploader || !requestVideoFile) {
            showNotification('Reel Title, Creator/Uploader and Video File are required!', 'error');
            return;
        }
        setIsSubmittingRequest(true);
        try {
            showNotification('Uploading video to Cloudinary...', 'info');
            const videoResult = await uploadToR2(requestVideoFile);
            let coverUrl = '';
            if (requestCoverFile) {
                showNotification('Uploading thumbnail...', 'info');
                const coverResult = await uploadToR2(requestCoverFile);
                coverUrl = coverResult.secure_url;
            }

            const requestDoc = {
                title: requestForm.title,
                uploader: requestForm.uploader,
                description: requestForm.description,
                url: videoResult.secure_url,
                thumbnailUrl: coverUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(requestForm.title)}&background=f43f5e&color=fff&size=400`,
                status: 'pending',
                requestedBy: auth.currentUser?.email || 'anonymous',
                createdAt: serverTimestamp(),
            };

            await addDoc(collection(db, 'reel_requests'), requestDoc);
            showNotification('Reel upload request submitted successfully! 🎬', 'success');
            
            // Reset form
            setRequestForm({ title: '', uploader: '', description: '' });
            setRequestVideoFile(null);
            setRequestCoverFile(null);
            setRequestCoverPreview(null);
            setIsRequestModalOpen(false);
            loadUserRequests();
        } catch (err) {
            console.error('Reel request submission failed:', err);
            showNotification('Failed to submit request. Check connection.', 'error');
        } finally {
            setIsSubmittingRequest(false);
        }
    };

    const handleGoogleSignIn = async () => {
        try {
            setIsAuthenticating(true);
            const user = await signInWithGoogle();
            if (user) {
                onUpdateProfile(p => ({
                    ...p,
                    id: user.uid,
                    name: user.displayName || p.name,
                    avatarUrl: user.photoURL || p.avatarUrl,
                    onboarded: true
                }));
            }
        } catch (error) {
            console.error("Auth failed from ProfileView", error);
        } finally {
            setIsAuthenticating(false);
        }
    };

    const level = profile.level || 1;
    const currentXp = profile.xp || 0;
    const title = getTitleForLevel(level);
    const prevLevelXp = getXpForLevel(level);
    const nextLevelXp = getXpForLevel(level + 1);
    const xpPercent = Math.min(100, Math.floor(((currentXp - prevLevelXp) / (nextLevelXp - prevLevelXp || 1)) * 100));
    const xpToNext = Math.max(0, nextLevelXp - currentXp);

    const streakCount = profile.streak?.currentStreak || 0;
    const freezeCount = profile.streak?.freezeCount || 0;
    const calendar = profile.streak?.calendar || [];
    const lastListenDate = profile.streak?.lastListenDate || '';
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const weekStatuses = useMemo(() => {
        const statuses: ('completed' | 'frozen' | 'pending' | 'missed')[] = [];
        const d = new Date();
        const currentDayOfWeek = d.getDay(); // 0 to 6
        const startOfWeek = new Date();
        startOfWeek.setDate(d.getDate() - currentDayOfWeek); // Sunday of this week

        for (let i = 0; i < 7; i++) {
            const targetDate = new Date(startOfWeek);
            targetDate.setDate(startOfWeek.getDate() + i);
            const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;

            if (calendar.includes(dateStr)) {
                statuses.push('completed');
            } else if (i < currentDayOfWeek) {
                statuses.push(lastListenDate >= dateStr ? 'frozen' : 'missed');
            } else if (i === currentDayOfWeek) {
                statuses.push('pending');
            } else {
                statuses.push('pending');
            }
        }
        return statuses;
    }, [calendar, lastListenDate]);

    const streakTip = useMemo(() => {
        if (streakCount === 0) return "Listen to any song for 5 minutes today to start your daily streak! Keep the music playing! 🎧🔥";
        if (streakCount < 3) return "You are doing great! Listen for 5 minutes daily to grow your streak and earn extra XP! 👊📈";
        if (streakCount < 7) return "You are so close to a 7-day streak (Week Warrior)! Don't forget to listen today to protect your streak! ⚔️🔥";
        return "Excellent! Your streak is on fire! Keep it going to stay on top and become the absolute GOAT! 👑🐐";
    }, [streakCount]);

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsUploading(true);
            const result = await uploadToR2(file);
            onUpdateProfile(p => ({ ...p, avatarUrl: result.secure_url }));
        } catch (error) {
            console.error("Cloudinary upload failed", error);
        } finally {
            setIsUploading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
            onNavigate('Home');
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onUpdateProfile(p => ({ ...p, name: e.target.value }));
    };

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setIsScrolled(e.currentTarget.scrollTop > 50);
    };

    const nameplateFontFamily = fonts.find(f => f.name === profile.nameplateFont)?.family || "'Satoshi', sans-serif";
    const nameplateAnimationClass = `name-anim-${profile.settings.nameplateAnimation || 'none'}`;
    const nameplateStyle = {
        fontFamily: nameplateFontFamily,
        '--char-count': profile.name.length,
    } as React.CSSProperties;


    if (isAchievementsVisible) {
        return <AchievementsView profile={profile} onBack={() => setAchievementsVisible(false)} />;
    }

    return (
        <main onScroll={handleScroll} className="h-full w-full overflow-y-auto scroll-container home-gradient-bg gpu-accelerated-scroll text-[var(--text-primary)]">
            <div className={`collapsible-header-container ${isScrolled ? 'collapsed' : ''}`}>
                <h1 className="header-big-title">My Profile</h1>
                <h2 className="header-small-title">Profile</h2>
                <div className="header-actions-right">
                    <button onClick={onBack} className="w-10 h-10 rounded-full bg-[var(--surface-color)] flex items-center justify-center text-[var(--text-primary)]" aria-label="Back"><ArrowLeft size={20} /></button>
                </div>
            </div>
            
            <div className="space-y-8 px-6 pb-40 scroll-content-with-header">
                <SectionCard title="Identity">
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative">
                            <div className="relative">
                                {profile.avatarUrl && !profile.avatarUrl.startsWith('http') && !profile.avatarUrl.startsWith('data:') && !profile.avatarUrl.startsWith('/') ? (
                                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[var(--primary-accent)]/20 to-[var(--secondary-accent-start)]/20 border-4 border-[var(--surface-border-color)] flex items-center justify-center text-4xl select-none">
                                        {profile.avatarUrl}
                                    </div>
                                ) : (
                                    <img src={profile.avatarUrl} referrerPolicy="no-referrer" alt="User Avatar" className="w-24 h-24 rounded-full object-cover border-4 border-[var(--surface-border-color)]" />
                                )}
                                {isUploading && (
                                    <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                                        <Loader2 className="animate-spin text-[var(--primary-accent)]" size={24} />
                                    </div>
                                )}
                            </div>
                            <div className="absolute -bottom-1 -right-1 flex gap-1">
                                <button onClick={onOpenEmojiPicker} className="w-8 h-8 bg-yellow-400 text-black rounded-full flex items-center justify-center transition-transform hover:scale-110 border-2 border-[var(--surface-color)]" title="Set Emoji">
                                    <Smile size={14} />
                                </button>
                                <button onClick={onOpenCameraModal} className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center transition-transform hover:scale-110 border-2 border-[var(--surface-color)]" title="Use Camera">
                                    <Camera size={14} />
                                </button>
                                <button onClick={() => fileInputRef.current?.click()} className="w-8 h-8 bg-[var(--primary-accent)] text-black rounded-full flex items-center justify-center transition-transform hover:scale-110 border-2 border-[var(--surface-color)]" title="Upload Photo">
                                    <Pencil size={14} />
                                </button>
                            </div>
                            <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" className="hidden" />
                        </div>
                        <div className="text-center w-full max-w-xs">
                            <input type="text" value={profile.name} onChange={handleNameChange} className="bg-transparent border-0 border-b-2 border-transparent focus:border-[var(--text-primary)] focus:ring-0 text-3xl font-bold text-center w-full p-0 text-[var(--text-primary)]" />
                        </div>
                        
                        {auth.currentUser ? (
                            <BubbleButton onClick={handleLogout} className="small !bg-red-500 text-white hover:bg-red-600 mt-2">
                                <LogOut size={14} className="mr-2" /> Sign Out
                            </BubbleButton>
                        ) : (
                            <div className="flex flex-col items-center gap-2 mt-2 w-full max-w-xs">
                                <button
                                    onClick={handleGoogleSignIn}
                                    disabled={isAuthenticating}
                                    className="w-full h-11 bg-white hover:bg-neutral-100 active:scale-[0.98] text-black font-semibold rounded-full transition-all shadow-md flex items-center justify-center gap-3 text-sm cursor-pointer disabled:opacity-50"
                                >
                                    {isAuthenticating ? (
                                        <Loader2 className="animate-spin text-black" size={18} />
                                    ) : (
                                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-4 h-4" />
                                    )}
                                    <span>Sign in with Google</span>
                                </button>
                                <p className="text-[10px] text-neutral-400 text-center">Sign in to sync your library, stats, and playlists to the cloud!</p>
                            </div>
                        )}
                    </div>
                </SectionCard>

                {/* LEVEL & PROGRESS CARD */}
                <SectionCard title="Level & Rank" subtitle="Your active standing in the Mwijay Music universe.">
                    <div className="flex flex-col gap-4 text-center">
                        <div className="flex items-center justify-between">
                            <div className="text-left">
                                <p className="text-3xl font-black text-white">Level {level}</p>
                                <p className="text-sm font-bold text-[var(--primary-accent)]">{title}</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[var(--primary-accent)] to-[var(--secondary-accent-start)] flex items-center justify-center text-black shadow-lg shadow-[var(--primary-accent)]/20">
                                <Award size={20} />
                            </div>
                        </div>

                        {/* XP Progress Bar */}
                        <div className="w-full text-left">
                            <div className="flex justify-between text-xs text-[var(--text-secondary)] font-bold mb-1">
                                <span>{currentXp - prevLevelXp} / {nextLevelXp - prevLevelXp} XP</span>
                                <span>{xpPercent}%</span>
                            </div>
                            <div className="w-full h-3 rounded-full bg-white/5 border border-white/10 overflow-hidden relative shadow-inner">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${xpPercent}%` }}
                                    transition={{ duration: 1, ease: 'easeOut' }}
                                    className="h-full bg-gradient-to-r from-[var(--primary-accent)] to-[var(--secondary-accent-start)] shadow-[0_0_8px_rgba(200,240,82,0.6)]" 
                                />
                            </div>
                            <p className="text-[10px] text-neutral-400 mt-1.5 font-mono">
                                {xpToNext} XP left to achieve Level {level + 1}
                            </p>
                        </div>

                        {/* Rewards collapse drawer */}
                        <div className="border-t border-[var(--surface-border-color)] pt-3 text-left">
                            <button 
                                onClick={() => setRewardsExpanded(!isRewardsExpanded)}
                                className="w-full flex items-center justify-between text-xs font-bold text-[var(--text-secondary)] hover:text-white transition-colors"
                            >
                                <span className="flex items-center gap-1.5"><Sparkles size={12} className="text-[var(--primary-accent)]" /> Unlocked Perks & Milestone Rewards</span>
                                {isRewardsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                            
                            {isRewardsExpanded && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    className="mt-3 grid grid-cols-2 gap-2 text-[10px]"
                                >
                                    {[5, 10, 20, 30, 50, 100].map(lvl => {
                                        const isUnlocked = level >= lvl;
                                        const rList = getLevelRewards(lvl);
                                        return rList.map((r, i) => (
                                            <div key={`${lvl}-${i}`} className={`p-2 rounded-xl border flex items-center gap-1.5 transition-all ${isUnlocked ? 'bg-white/5 border-[var(--primary-accent)]/30 text-white font-bold' : 'bg-black/20 border-white/5 text-neutral-500 opacity-60'}`}>
                                                <span className="text-[14px]">{isUnlocked ? '⚡' : '🔒'}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-black text-[9px] uppercase tracking-wide text-neutral-400">Level {lvl}</p>
                                                    <p className="truncate font-bold text-[10px]">{r.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '')}</p>
                                                </div>
                                            </div>
                                        ));
                                    })}
                                </motion.div>
                            )}
                        </div>
                    </div>
                </SectionCard>
                
                <SectionCard title="Listening Stats" subtitle="A summary of your listening habits.">
                    <div className="grid grid-cols-3 gap-4">
                        <StatItem value={formatListenTime((profile.analytics?.listenTime || 0) + (profile.analytics?.radioListenTime || 0))} label="Total Time" icon={<Headphones size={20} />} />
                        <StatItem value={(profile.analytics?.songsPlayed || 0).toString()} label="Songs Played" icon={<Play size={20} />} />
                        <StatItem value={(profile.analytics?.songsUploaded || 0).toString()} label="Songs in Library" icon={<Music size={20} />} />
                    </div>
                     <div className="flex justify-center mt-6">
                        <BubbleButton onClick={() => onNavigate('Analytics')} className="small">
                            View Analytics
                        </BubbleButton>
                    </div>
                </SectionCard>

                {/* STREAK & CALENDAR CARD */}
                <SectionCard title="Daily Listening Streak" subtitle="Listen to music 5 minutes daily to extend your streak.">
                    <div className="flex flex-col gap-5">
                        <div className="flex items-center justify-between bg-black/20 p-4 rounded-2xl border border-white/5">
                            <div className="flex items-center gap-3">
                                <motion.div 
                                    animate={{ scale: [1, 1.12, 1] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                    className="text-4xl text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]"
                                >
                                    🔥
                                </motion.div>
                                <div className="text-left">
                                    <p className="text-2xl font-black text-white">{streakCount} Days</p>
                                    <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Active Streak</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-1.5 bg-sky-500/10 border border-sky-500/20 px-3 py-1.5 rounded-full text-xs font-bold text-sky-400">
                                <Snowflake size={14} className="animate-spin-slow" />
                                <span>{freezeCount} Freezes</span>
                            </div>
                        </div>

                        {/* Calendar visual bubbles */}
                        <div>
                            <p className="text-xs font-bold text-[var(--text-secondary)] mb-2.5 uppercase tracking-wider text-left">
                                Weekly Progress
                            </p>
                            <div className="flex justify-between gap-1.5">
                                {weekDays.map((dayName, idx) => {
                                    const dayStatus = weekStatuses[idx]; // 'completed' | 'frozen' | 'pending' | 'missed'
                                    return (
                                        <div key={idx} className="flex flex-col items-center flex-1">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] border transition-all ${
                                                dayStatus === 'completed' ? 'bg-green-500/20 border-green-500 text-green-400 shadow-[0_0_8px_rgba(34,197,94,0.3)]' :
                                                dayStatus === 'frozen' ? 'bg-sky-500/20 border-sky-500 text-sky-400' :
                                                dayStatus === 'missed' ? 'bg-red-500/20 border-red-500/40 text-red-400' :
                                                'bg-white/5 border-white/10 text-neutral-500'
                                            }`}>
                                                {dayStatus === 'completed' ? '🔥' : dayStatus === 'frozen' ? '❄️' : dayName[0]}
                                            </div>
                                            <span className="text-[9px] font-bold text-neutral-400 mt-1.5 uppercase">{dayName}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Personalized tip */}
                        <div className="bg-white/5 p-3.5 rounded-xl border border-white/5 text-left relative overflow-hidden">
                            <div className="absolute right-2 top-2 opacity-5 text-4xl font-serif">“</div>
                            <p className="text-xs font-black text-[var(--primary-accent)] mb-0.5">Mwijay's Tip:</p>
                            <p className="text-xs text-[var(--text-secondary)] italic leading-relaxed">
                                {streakTip}
                            </p>
                        </div>
                    </div>
                </SectionCard>

                <SectionCard title="Recent Achievements" subtitle="Milestones you've reached on your journey.">
                    <div className="flex items-start justify-center gap-4 text-center">
                        {(profile.unlockedAchievements || []).slice(-3).reverse().map(achId => {
                            const ach = achievements.find(a => a.id === achId.id);
                            return ach ? (
                                <div key={ach.id} className="flex flex-col items-center w-1/3" title={ach.name}>
                                    <span className="text-5xl">{ach.emoji}</span>
                                    <p className="text-xs font-bold mt-1 leading-tight text-[var(--text-primary)]">{ach.name}</p>
                                </div>
                            ) : null;
                        })}
                         {(profile.unlockedAchievements || []).length === 0 && (
                            <p className="text-sm text-[var(--text-secondary)] py-4">Your first achievement is just a tap away!</p>
                        )}
                    </div>
                    <div className="flex justify-center mt-6">
                        <BubbleButton onClick={() => setAchievementsVisible(true)} className="small">
                            View All Achievements
                        </BubbleButton>
                    </div>
                </SectionCard>

                <SectionCard title="Customization">
                    <div className="text-center mb-6 bg-[var(--surface-color)] border border-[var(--surface-border-color)] p-4 rounded-xl">
                        <p className="text-xs text-[var(--text-secondary)] mb-2">Live Nameplate Preview</p>
                        <div 
                            className={`text-3xl font-bold text-[var(--primary-accent)] ${nameplateAnimationClass} whitespace-nowrap inline-block`}
                            style={nameplateStyle}
                            data-text={profile.name}
                        >
                            {['wavy', 'text-rotate', 'matrix'].includes(profile.settings.nameplateAnimation)
                                ? profile.name.split('').map((char, i) => <span key={i} style={{'--char-index': i} as React.CSSProperties}>{char === ' ' ? '\u00A0' : char}</span>)
                                : profile.name
                            }
                        </div>
                    </div>
                            <div className="flex justify-center">
                        <BubbleButton onClick={onOpenAppearance} className="small">
                            Customize Appearance
                        </BubbleButton>
                    </div>
                </SectionCard>

                <SectionCard title="My Reel Requests" subtitle="Submit or track requested reel uploads. Admin will verify before going live.">
                    <div className="space-y-4">
                        {auth.currentUser ? (
                            <>
                                <div className="flex justify-center">
                                    <BubbleButton onClick={() => setIsRequestModalOpen(true)} className="small !bg-[var(--primary-accent)] !text-black">
                                        <Film size={14} className="mr-2 inline" /> Request Reel Upload
                                    </BubbleButton>
                                </div>
                                {loadingRequests ? (
                                    <div className="flex justify-center py-4"><Loader2 className="animate-spin text-neutral-400" size={20} /></div>
                                ) : reelRequests.length > 0 ? (
                                    <div className="space-y-3 max-h-64 overflow-y-auto pr-1 scroll-container">
                                        {reelRequests.map((req) => (
                                            <div key={req.id} className="p-3 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-2">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <h4 className="font-bold text-sm text-white truncate">{req.title}</h4>
                                                        <p className="text-xs text-neutral-400 truncate">by {req.uploader}</p>
                                                    </div>
                                                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider ${
                                                        req.status === 'approved' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                                        req.status === 'rejected' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                                        'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                                    }`}>
                                                        {req.status}
                                                    </span>
                                                </div>
                                                {req.description && (
                                                    <p className="text-xs text-neutral-500 italic line-clamp-1">{req.description}</p>
                                                )}
                                                {req.status === 'rejected' && req.adminComment && (
                                                    <div className="mt-1 p-2 bg-red-950/20 border border-red-500/20 rounded-xl flex gap-2 items-start text-xs text-red-300">
                                                        <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                                                        <div>
                                                            <strong className="block font-extrabold text-[10px] uppercase text-red-400">Admin Feedback:</strong>
                                                            <span>{req.adminComment}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-neutral-500 text-center py-4">You have not submitted any reel requests yet.</p>
                                )}
                            </>
                        ) : (
                            <p className="text-xs text-neutral-500 text-center py-4">Sign in with Google to request reel uploads and track status.</p>
                        )}
                    </div>
                </SectionCard>
                
                <SectionCard title="About Mwijay Music">
                    <div className="text-sm text-[var(--text-secondary)] space-y-3">
                        <p>Mwijay Music is built by Mwijay — blending code, design, and sound.</p>
                        <p>📍 Based in Tanzania, loved worldwide.</p>
                        <div className="border-t border-[var(--surface-border-color)] my-3"></div>
                        <a href="tel:0790942616" className="block hover:text-[var(--text-primary)] transition-colors font-bold text-[var(--primary-accent)]">0790942616</a>
                        <a href="mailto:mwijaydavie@gmail.com" className="block hover:text-[var(--text-primary)] transition-colors">mwijaydavie@gmail.com</a>
                        <p className="text-neutral-400 pt-2">Reach me out for comment or say hi 🙂‍↕️</p>
                    </div>
                </SectionCard>
            </div>

            <AnimatePresence>
                {isRequestModalOpen && (
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[80] flex items-center justify-center p-4" onClick={() => setIsRequestModalOpen(false)}>
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-[var(--surface-color)] border border-white/10 rounded-3xl flex flex-col w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl relative"
                            onClick={e => e.stopPropagation()}
                        >
                            <header className="flex items-center justify-between p-5 border-b border-white/5 flex-shrink-0">
                                <h2 className="font-extrabold text-lg text-white flex items-center gap-2">
                                    <Film className="text-[var(--primary-accent)]" size={20} />
                                    Request Reel Upload
                                </h2>
                                <button onClick={() => setIsRequestModalOpen(false)} className="text-neutral-400 hover:text-white p-1 rounded-full hover:bg-white/5" aria-label="Close modal">
                                    <X size={20} />
                                </button>
                            </header>
                            <div className="p-6 overflow-y-auto space-y-4 scroll-container">
                                <div className="space-y-3">
                                    <input
                                        type="text"
                                        placeholder="Reel Title"
                                        value={requestForm.title}
                                        onChange={e => setRequestForm(p => ({ ...p, title: e.target.value }))}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-[var(--primary-accent)]/50 text-sm"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Creator / Artist Name"
                                        value={requestForm.uploader}
                                        onChange={e => setRequestForm(p => ({ ...p, uploader: e.target.value }))}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-[var(--primary-accent)]/50 text-sm"
                                    />
                                    <textarea
                                        placeholder="Brief Description (e.g. Bongo Flava vibe dance cover)"
                                        value={requestForm.description}
                                        onChange={e => setRequestForm(p => ({ ...p, description: e.target.value }))}
                                        rows={2}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-[var(--primary-accent)]/50 text-sm resize-none"
                                    />
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <button
                                            onClick={() => requestVideoInputRef.current?.click()}
                                            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-colors cursor-pointer ${
                                                requestVideoFile ? 'border-green-500/50 bg-green-950/20 text-green-300' : 'border-white/10 bg-white/5 text-neutral-400 hover:bg-white/10'
                                            }`}
                                        >
                                            <Film size={16} />
                                            {requestVideoFile ? requestVideoFile.name.slice(0, 15) + '...' : 'Choose Video File'}
                                        </button>
                                        <button
                                            onClick={() => requestCoverInputRef.current?.click()}
                                            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-colors cursor-pointer ${
                                                requestCoverFile ? 'border-green-500/50 bg-green-950/20 text-green-300' : 'border-white/10 bg-white/5 text-neutral-400 hover:bg-white/10'
                                            }`}
                                        >
                                            <Smile size={16} />
                                            {requestCoverFile ? 'Thumbnail Selected' : 'Choose Cover (Optional)'}
                                        </button>
                                    </div>
                                    {requestCoverPreview && (
                                        <div className="relative w-24 h-24 rounded-xl overflow-hidden mx-auto border border-white/10">
                                            <img src={requestCoverPreview} alt="Thumbnail preview" className="w-full h-full object-cover" />
                                            <button onClick={() => { setRequestCoverFile(null); setRequestCoverPreview(null); }} className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white">
                                                <X size={10} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                
                                <input ref={requestVideoInputRef} type="file" accept="video/*" className="hidden" onChange={e => { if (e.target.files?.[0]) setRequestVideoFile(e.target.files[0]); }} />
                                <input ref={requestCoverInputRef} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) { setRequestCoverFile(e.target.files[0]); const url = URL.createObjectURL(e.target.files[0]); setRequestCoverPreview(url); }}} />
                                
                                <button
                                    onClick={handleAddReelRequest}
                                    disabled={isSubmittingRequest}
                                    className="w-full flex items-center justify-center gap-2 bg-[var(--primary-accent)] text-black font-black py-3.5 rounded-xl transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 cursor-pointer text-sm uppercase tracking-wider"
                                >
                                    {isSubmittingRequest ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                    {isSubmittingRequest ? 'Uploading...' : 'Submit Reel Request'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </main>
    );
};

export default ProfileView;
