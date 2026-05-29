import React, { useState, useRef, useMemo } from 'react';
import { FileAudio } from 'lucide-react';
import SettingsToggle from './SettingsToggle.tsx';
import type { ProfileData, Notification as NotificationType, Song, Playlist } from '../types.ts';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import CollapsibleSection from './CollapsibleSection.tsx';
import BubbleButton from './BubbleButton.tsx';
import { getRandomCoverArt, navItems, fonts } from './constants.ts';
import { shareTextOrUrl } from '../utils/helpers.ts';

const PermissionCard: React.FC<{ title: string; description: string; onGrant: () => void; grantText?: string }> = ({ title, description, onGrant, grantText = "Grant" }) => (
    <div className="liquid-glass-pane glare-effect flex items-center justify-between p-3 rounded-lg">
        <div>
            <p className="font-bold text-[var(--text-primary)]">{title}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">{description}</p>
        </div>
        <BubbleButton onClick={onGrant} className="small">
            {grantText}
        </BubbleButton>
    </div>
);

const SettingsButton: React.FC<{ title: string; description: string; buttonText: string; onClick: () => void; }> = ({ title, description, buttonText, onClick }) => (
     <div className="liquid-glass-pane glare-effect flex flex-col items-center justify-center p-4 rounded-lg text-center gap-4 w-full">
        <div>
            <p className="font-bold text-[var(--text-primary)]">{title}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">{description}</p>
        </div>
        <BubbleButton onClick={onClick} className="small w-full max-w-[200px]">
            {buttonText}
        </BubbleButton>
    </div>
);

const SettingsGroup: React.FC<{ title: string; children: React.ReactNode; }> = ({ title, children }) => (
    <section>
        <h2 className="text-lg font-bold text-[var(--text-secondary)] mb-4">{title}</h2>
        <div className="space-y-4">{children}</div>
    </section>
);

interface SettingsViewProps {
    profile: ProfileData;
    onUpdateProfile: (updater: (prev: ProfileData) => ProfileData) => void;
    onNavigate: (view: string) => void;
    showNotification: (message: string, type?: NotificationType['type']) => void;
    handleManualFileUploads: (files: FileList) => void;
    onRequestPermission: (type: 'media' | 'mic' | 'camera') => void;
    librarySongs: Song[];
    playlists: Playlist[];
    onOpenSongDetails: (song: Song) => void;
    onOpenClearDataModal: () => void;
    onFullRestore: (data: any) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ profile, onUpdateProfile, onNavigate, showNotification, handleManualFileUploads, onRequestPermission, librarySongs, playlists, onOpenSongDetails, onOpenClearDataModal, onFullRestore }) => {
    const [apiKey, setApiKey] = useState(profile.apiKey || '');
    const manualImportRef = useRef<HTMLInputElement>(null);
    const [isScrolled, setIsScrolled] = useState(false);
    const scannerSettings = profile.settings.scannerSettings;

    const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
    const [isCharging, setIsCharging] = useState<boolean>(false);
    const [isOnlineState, setIsOnlineState] = useState<boolean>(navigator.onLine);
    const [storageUsage, setStorageUsage] = useState<number | null>(null);
    const [storageQuota, setStorageQuota] = useState<number | null>(null);
    const [hardwareConcurrency, setHardwareConcurrency] = useState<number | null>(null);
    const [deviceMemory, setDeviceMemory] = useState<number | null>(null);

    React.useEffect(() => {
        const handleOnline = () => setIsOnlineState(true);
        const handleOffline = () => setIsOnlineState(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        if ('getBattery' in navigator) {
            (navigator as any).getBattery().then((battery: any) => {
                setBatteryLevel(Math.round(battery.level * 100));
                setIsCharging(battery.charging);
                
                const onLevelChange = () => setBatteryLevel(Math.round(battery.level * 100));
                const onChargingChange = () => setIsCharging(battery.charging);
                
                battery.addEventListener('levelchange', onLevelChange);
                battery.addEventListener('chargingchange', onChargingChange);
                
                return () => {
                    battery.removeEventListener('levelchange', onLevelChange);
                    battery.removeEventListener('chargingchange', onChargingChange);
                };
            });
        }

        if (navigator.storage && navigator.storage.estimate) {
            navigator.storage.estimate().then((estimate) => {
                if (estimate.usage !== undefined) setStorageUsage(Math.round(estimate.usage / (1024 * 1024)));
                if (estimate.quota !== undefined) setStorageQuota(Math.round(estimate.quota / (1024 * 1024 * 1024)));
            });
        }
        if (navigator.hardwareConcurrency) {
            setHardwareConcurrency(navigator.hardwareConcurrency);
        }
        if ((navigator as any).deviceMemory) {
            setDeviceMemory((navigator as any).deviceMemory);
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const songsWithContent = useMemo(() => {
        return librarySongs.filter(song => song.lyrics || song.notes).sort((a,b) => (b.dateAdded || 0) - (a.dateAdded || 0));
    }, [librarySongs]);
    
    const handleUpdate = <K extends keyof ProfileData['settings']>(key: K, value: ProfileData['settings'][K]) => {
         onUpdateProfile(p => ({
            ...p,
            settings: { ...p.settings, [key]: value }
        }));
    };

    const handleScannerSettingUpdate = <K extends keyof typeof scannerSettings>(key: K, value: (typeof scannerSettings)[K]) => {
        onUpdateProfile(p => ({ ...p, settings: { ...p.settings, scannerSettings: { ...p.settings.scannerSettings, [key]: value } } }));
    };

    const handleNotificationToggle = async () => {
        if (profile.settings.notificationsEnabled) {
            onUpdateProfile(p => ({ ...p, settings: { ...p.settings, notificationsEnabled: false } }));
        } else {
            if (Capacitor.isNativePlatform()) {
                let permissions = await LocalNotifications.checkPermissions();
                if (permissions.display !== 'granted') {
                    permissions = await LocalNotifications.requestPermissions();
                }

                if (permissions.display === 'granted') {
                    onUpdateProfile(p => ({ ...p, settings: { ...p.settings, notificationsEnabled: true } }));
                    showNotification("Notifications enabled!", 'success');
                    await LocalNotifications.schedule({
                        notifications: [{ title: "Mwijay Music Notifications", body: "You'll now be notified of song changes.", id: 1, silent: true }]
                    });
                } else {
                     showNotification("Notification permission was denied. You can enable it in your phone's settings.", 'error');
                }
            } else {
                if ('Notification' in window) {
                    let permission = Notification.permission;
                    if (permission !== 'granted' && permission !== 'denied') {
                        permission = await Notification.requestPermission();
                    }
                    if (permission === 'granted') {
                        onUpdateProfile(p => ({ ...p, settings: { ...p.settings, notificationsEnabled: true } }));
                        showNotification("Browser notifications enabled!", 'success');
                        new Notification("Mwijay Music 🎵", { body: "You'll now be notified of song changes.", silent: true });
                    } else {
                        showNotification("Browser notification permission denied.", 'error');
                    }
                } else {
                    showNotification("Notifications not supported in this browser.", 'error');
                }
            }
        }
    };
    
    const handleSaveApiKey = () => {
        onUpdateProfile(p => ({...p, apiKey }));
        showNotification("API Key saved!", 'success');
    };

    const handleToggleCollapse = (section: string) => {
        onUpdateProfile(p => ({
            ...p,
            settings: {
                ...p.settings,
                collapsedSections: {
                    ...p.settings.collapsedSections,
                    [section]: !p.settings.collapsedSections[section],
                }
            }
        }));
    };

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setIsScrolled(e.currentTarget.scrollTop > 50);
    };

    return (
        <main onScroll={handleScroll} className="h-full w-full overflow-y-auto scroll-container text-[var(--text-primary)] home-gradient-bg gpu-accelerated-scroll">
            <div className={`collapsible-header-container ${isScrolled ? 'collapsed' : ''}`}>
                <h1 className="header-big-title">Settings</h1>
                <h2 className="header-small-title">Settings</h2>
            </div>

            <div className="max-w-2xl mx-auto space-y-8 px-6 pb-40 scroll-content-with-header">
                <SettingsGroup title="General">
                    <SettingsToggle 
                        label="Enable Simple Mode" 
                        description="A simplified, large-card interface for easy access." 
                        isChecked={profile.settings.simpleMode.enabled} 
                        onToggle={() => handleUpdate('simpleMode', { ...profile.settings.simpleMode, enabled: !profile.settings.simpleMode.enabled })} 
                    />
                    <SettingsToggle 
                        label="Show Navigation Bar"
                        description="Toggle the visibility of the bottom navigation bar."
                        isChecked={profile.settings.showNavigationBar}
                        onToggle={() => handleUpdate('showNavigationBar', !profile.settings.showNavigationBar)}
                    />
                    <SettingsToggle 
                        label="Show Extra Controls"
                        description="Show extra icons in the player for a more feature-rich view."
                        isChecked={profile.settings.showExtraControls}
                        onToggle={() => handleUpdate('showExtraControls', !profile.settings.showExtraControls)}
                    />
                    <SettingsButton 
                        title="Simple Mode Settings" 
                        description="Customize topics and card style." 
                        buttonText="Customize"
                        onClick={() => onNavigate('SimpleModeSettings')}
                    />
                    <SettingsButton 
                        title="Help & Guide" 
                        description="Useful tips and tricks for mastering the app." 
                        buttonText="Tips"
                        onClick={() => onNavigate('Help')}
                    />
                    <SettingsToggle 
                        label="Haptic Feedback"
                        description="Enable subtle vibrations on UI interactions."
                        isChecked={profile.settings.hapticsEnabled}
                        onToggle={() => handleUpdate('hapticsEnabled', !profile.settings.hapticsEnabled)}
                    />
                    <SettingsButton 
                        title="Share Mwijay Music" 
                        description="Share this beautiful music experience with friends!" 
                        buttonText="Share App"
                        onClick={() => {
                            shareTextOrUrl(
                                'Mwijay Music',
                                'Listen to Bongo Flava, Traditional Taarab and global radio stations on Mwijay Music App!',
                                window.location.href,
                                showNotification
                            );
                        }}
                    />
                </SettingsGroup>

                <SettingsGroup title="Device & System Status">
                    <div className="liquid-glass-pane glare-effect p-4 rounded-xl flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-[var(--text-primary)]">Network Status</span>
                            <span className={`text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${isOnlineState ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                {isOnlineState ? 'Online' : 'Offline'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-[var(--text-primary)]">Battery Level</span>
                            <span className="text-xs font-bold text-[var(--text-secondary)]">
                                {batteryLevel !== null ? `${batteryLevel}% ${isCharging ? '🔌 (Charging)' : ''}` : 'Detecting...'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-[var(--text-primary)]">Platform Environment</span>
                            <span className="text-xs font-bold text-[var(--primary-accent)]">
                                {Capacitor.isNativePlatform() ? `${Capacitor.getPlatform().toUpperCase()} (Native)` : 'Web Browser'}
                            </span>
                        </div>
                        {storageUsage !== null && storageQuota !== null && (
                            <div className="flex flex-col gap-1.5 pt-2 border-t border-white/5">
                                <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] font-bold">
                                    <span>Virtual Disk Storage</span>
                                    <span>{storageUsage} MB used / ~{storageQuota} GB quota</span>
                                </div>
                                <div className="w-full bg-[var(--chip-bg)] rounded-full h-1.5 overflow-hidden">
                                    <div 
                                        className="bg-[var(--primary-accent)] h-full rounded-full transition-all duration-300"
                                        style={{ width: `${Math.min(100, (storageUsage / (storageQuota * 1024)) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        )}
                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                            <span className="text-sm font-bold text-[var(--text-primary)]">Device Performance profile</span>
                            <span className="text-xs font-bold text-[var(--text-secondary)]">
                                {[
                                    hardwareConcurrency ? `${hardwareConcurrency}-Core CPU` : null,
                                    deviceMemory ? `${deviceMemory} GB RAM` : null
                                ].filter(Boolean).join(' | ') || 'Detecting...'}
                            </span>
                        </div>
                    </div>
                </SettingsGroup>

                <CollapsibleSection 
                    title="Navigation Icons"
                    isOpen={!profile.settings.collapsedSections?.navIcons}
                    onToggle={() => handleToggleCollapse('navIcons')}
                >
                    <div className="space-y-4">
                        <p className="text-xs text-[var(--text-secondary)] px-1">Select which icons appear in your navigation bar. At least one must be selected.</p>
                        <div className="grid grid-cols-2 gap-2">
                            {navItems.map(item => (
                                <button
                                    key={item.name}
                                    onClick={() => {
                                        const current = profile.settings.visibleNavItems || ['Home', 'Explore', 'Create', 'Library', 'Reels'];
                                        const next = current.includes(item.name) 
                                            ? current.filter(n => n !== item.name) 
                                            : [...current, item.name];
                                        if (next.length > 0) handleUpdate('visibleNavItems', next);
                                    }}
                                    className={`p-3 rounded-xl border transition-all text-left ${
                                        (profile.settings.visibleNavItems || ['Home', 'Explore', 'Create', 'Library', 'Reels']).includes(item.name) 
                                            ? 'bg-[var(--primary-accent)]/20 border-[var(--primary-accent)] text-[var(--primary-accent)]' 
                                            : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                                    }`}
                                >
                                    <p className="text-sm font-bold">{item.name}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                </CollapsibleSection>

                <CollapsibleSection 
                    title="Typography"
                    isOpen={!profile.settings.collapsedSections?.fonts}
                    onToggle={() => handleToggleCollapse('fonts')}
                >
                    <div className="space-y-6">
                        {['Sans-Serif', 'Serif', 'Monospace', 'Display', 'Handwriting'].map(category => {
                            const categoryFonts = fonts.filter(f => f.category === category);
                            if (categoryFonts.length === 0) return null;
                            
                            return (
                                <div key={category} className="space-y-3">
                                    <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider px-1">{category}</h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        {categoryFonts.map(font => (
                                            <button
                                                key={font.family}
                                                onClick={() => onUpdateProfile(prev => ({ ...prev, activeFont: font.name, usedFeatures: { ...prev.usedFeatures, fonts: new Set(prev.usedFeatures.fonts || []).add(font.name) } }))}
                                                className={`p-3 rounded-xl border transition-all text-left ${
                                                    profile.activeFont === font.name 
                                                        ? 'bg-[var(--primary-accent)]/20 border-[var(--primary-accent)] text-[var(--primary-accent)]' 
                                                        : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                                                }`}
                                                style={{ fontFamily: font.family }}
                                            >
                                                <p className="text-sm truncate font-bold">{font.name}</p>
                                                <p className="text-[10px] opacity-50 mt-1">The quick brown fox</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CollapsibleSection>

                <SettingsGroup title="Data & Network">
                    <SettingsButton
                        title="Data Management"
                        description="Clear local songs, lyrics, or notes. This cannot be undone."
                        buttonText="Manage"
                        onClick={onOpenClearDataModal}
                    />
                </SettingsGroup>
                
                <SettingsButton
                    title="My Content"
                    description="View your saved lyrics and notes"
                    buttonText="Open"
                    onClick={() => onNavigate('MyContent')}
                />

                <SettingsGroup title="Playback & Audio">
                     <SettingsToggle 
                        label="AI DJ Mode" 
                        description="Let an AI DJ introduce songs and create a personalized radio experience." 
                        isChecked={profile.settings.aiDjMode} 
                        onToggle={() => handleUpdate('aiDjMode', !profile.settings.aiDjMode)} 
                    />
                    <div className="liquid-glass-pane p-3 rounded-lg">
                        <div className="flex justify-between items-center mb-1">
                            <p className="font-bold text-[var(--text-primary)]">Crossfade Duration</p>
                             <span className="font-bold text-sm text-[var(--primary-accent)]">{profile.settings.transitionDuration.toFixed(1)}s</span>
                        </div>
                        <input type="range" min="0.5" max="5" step="0.5" value={profile.settings.transitionDuration} onChange={e => handleUpdate('transitionDuration', parseFloat(e.target.value))} className="w-full themed-slider" style={{ backgroundSize: `${((profile.settings.transitionDuration - 0.5) / 4.5) * 100}% 100%` }} />
                    </div>
                     <div className="liquid-glass-pane glare-effect p-3 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                            <p className="font-bold text-[var(--text-primary)]">Reels Auto-Scroll</p>
                             <span className="font-bold text-sm text-[var(--primary-accent)]">{profile.settings.reelsAutoScrollLoops === 0 ? 'Off' : `${profile.settings.reelsAutoScrollLoops} Loop${profile.settings.reelsAutoScrollLoops > 1 ? 's' : ''}`}</span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] mb-2">How many times a reel loops before scrolling to the next. Select 0 to disable auto-scroll.</p>
                        <input type="range" min="0" max="4" step="1" value={profile.settings.reelsAutoScrollLoops} onChange={e => handleUpdate('reelsAutoScrollLoops', parseInt(e.target.value))} className="w-full themed-slider" style={{ backgroundSize: `${(profile.settings.reelsAutoScrollLoops / 4) * 100}% 100%` }} />
                    </div>
                    <SettingsToggle 
                        label="Player Idle UI"
                        description="Automatically hide player controls when idle."
                        isChecked={profile.settings.playerIdleUiEnabled}
                        onToggle={() => handleUpdate('playerIdleUiEnabled', !profile.settings.playerIdleUiEnabled)}
                    />
                     <SettingsToggle 
                        label="Volume Normalizer" 
                        description="Balances loudness across all songs." 
                        isChecked={profile.settings.volumeNormalization} 
                        onToggle={() => handleUpdate('volumeNormalization', !profile.settings.volumeNormalization)}
                    />
                </SettingsGroup>
                
                 <CollapsibleSection
                    title="Scanner / Upload"
                    isOpen={!profile.settings.collapsedSections?.library}
                    onToggle={() => handleToggleCollapse('library')}
                 >
                    <div className="flex justify-center">
                        <button onClick={() => manualImportRef.current?.click()} className="liquid-glass-pane glare-effect p-4 rounded-lg flex flex-col items-center justify-center gap-2 w-40">
                            <FileAudio size={24} className="text-[var(--primary-accent)]" /><span className="font-bold text-sm text-[var(--text-primary)]">Manual Import</span>
                        </button>
                    </div>
                    <SettingsToggle 
                        label="Background Music Scanning"
                        description="Automatically scan for new music files in the background."
                        isChecked={scannerSettings.backgroundScanningEnabled}
                        onToggle={() => handleScannerSettingUpdate('backgroundScanningEnabled', !scannerSettings.backgroundScanningEnabled)}
                    />
                     <div className="liquid-glass-pane glare-effect p-3 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                            <p className="font-bold text-[var(--text-primary)]">Min. File Size (MB)</p>
                            <span className="font-bold text-sm text-[var(--primary-accent)]">{scannerSettings.minFileSizeMB} MB</span>
                        </div>
                        <input type="range" min="0.1" max="5" step="0.1" value={scannerSettings.minFileSizeMB} onChange={(e) => handleScannerSettingUpdate('minFileSizeMB', parseFloat(e.target.value))} className="w-full themed-slider" style={{ backgroundSize: `${((scannerSettings.minFileSizeMB - 0.1) / 4.9) * 100}% 100%` }} />
                    </div>
                     <div className="liquid-glass-pane glare-effect p-3 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                            <p className="font-bold text-[var(--text-primary)]">Min. Song Duration (s)</p>
                            <span className="font-bold text-sm text-[var(--primary-accent)]">{scannerSettings.minSongDurationSeconds} s</span>
                        </div>
                        <input type="range" min="5" max="60" step="5" value={scannerSettings.minSongDurationSeconds} onChange={(e) => handleScannerSettingUpdate('minSongDurationSeconds', parseInt(e.target.value))} className="w-full themed-slider" style={{ backgroundSize: `${((scannerSettings.minSongDurationSeconds - 5) / 55) * 100}% 100%` }} />
                    </div>
                </CollapsibleSection>
                
                <CollapsibleSection 
                    title="Mwijay Assistant"
                    isOpen={!profile.settings.collapsedSections?.assistant}
                    onToggle={() => handleToggleCollapse('assistant')}
                >
                    <SettingsToggle
                        label="Enable AI Cover Art Generation"
                        description="Adds a button to generate new cover art when editing a song."
                        isChecked={profile.settings.aiCoverArtEnabled}
                        onToggle={() => handleUpdate('aiCoverArtEnabled', !profile.settings.aiCoverArtEnabled)}
                    />
                    <SettingsButton 
                        title="Assistant Settings" 
                        description="Customize voice and commands." 
                        buttonText="Open" 
                        onClick={() => onNavigate('AssistantSettings')} 
                    />
                     <div className="liquid-glass-pane p-4 rounded-lg space-y-3">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-[var(--text-primary)]">Gemini API Key</h3>
                            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-[var(--primary-accent)] hover:underline">Get API Key</a>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)]">Provide your own key to unlock online AI features. For instructions, see the <button onClick={() => onNavigate('Help')} className="underline">Help Guide</button>.</p>
                        <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Paste your API key here" className="w-full bg-black/10 border border-[var(--surface-border-color)] p-2 rounded-md text-[var(--text-primary)]" />
                         <div className="flex justify-center pt-2">
                            <BubbleButton onClick={handleSaveApiKey}>
                                Save Key
                            </BubbleButton>
                        </div>
                    </div>
                </CollapsibleSection>

                <CollapsibleSection 
                    title="Permissions & Security"
                    isOpen={!profile.settings.collapsedSections?.permissions}
                    onToggle={() => handleToggleCollapse('permissions')}
                >
                    <PermissionCard
                        title="Music & Audio"
                        description="Allows scanning your device for local music files."
                        onGrant={() => onRequestPermission('media')}
                    />
                     <PermissionCard
                        title="Photos & Videos"
                        description="Allows scanning for local photos & videos for Reels."
                        onGrant={() => onRequestPermission('media')}
                    />
                    <PermissionCard
                        title="Camera"
                        description="Use the camera for profile photos."
                        onGrant={() => onRequestPermission('camera')}
                    />
                    <PermissionCard
                        title="Microphone"
                        description="For voice commands and live audio transcription."
                        onGrant={() => onRequestPermission('mic')}
                    />
                    <SettingsToggle 
                        label="Song Change Notifications"
                        description="Show a system notification when the song changes."
                        isChecked={profile.settings.notificationsEnabled}
                        onToggle={handleNotificationToggle}
                    />
                </CollapsibleSection>

                 <SettingsGroup title="Actions">
                    <div className="flex flex-col items-center gap-4">
                        <BubbleButton onClick={() => onNavigate('Profile')} className="w-72">
                            Profile & Stats
                        </BubbleButton>
                        <BubbleButton onClick={() => onNavigate('PartyMode')} className="w-72">
                            Start Guest Mode
                        </BubbleButton>
                    </div>
                </SettingsGroup>
            </div>
            <input type="file" multiple ref={manualImportRef} onChange={(e) => e.target.files && handleManualFileUploads(e.target.files)} accept="audio/*,video/*" className="hidden" />
        </main>
    );
};

export default SettingsView;
