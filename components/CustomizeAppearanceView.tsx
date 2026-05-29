
import React, { useState, useRef } from 'react';
import { ArrowLeft, Ban, Image, Clock, Smile, Wand2, Loader2 } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import type { ProfileData, ThemePair } from '../types.ts';
import { themePairs, fonts, nameplateAnimations } from './constants.ts';
import SettingsToggle from './SettingsToggle.tsx';
import CollapsibleSection from './CollapsibleSection.tsx';
import { useInterruptibleScroll } from '../hooks/useInterruptibleScroll.ts';

interface CustomizeAppearanceViewProps {
    profile: ProfileData;
    onClose: () => void;
    onUpdateProfile: (updater: (prev: ProfileData) => ProfileData) => void;
    showNotification: (message: string, type?: 'success' | 'info' | 'error') => void;
}

const ThemeSwatch: React.FC<{ themePair: ThemePair, mode: 'light' | 'dark' }> = ({ themePair, mode }) => {
    const theme = themePair[mode];
    const colors = [theme['--primary-accent'], theme['--secondary-accent-start'], theme['--secondary-accent-end']];
    const bgClass = theme['--bg-color'].startsWith('#F') || theme['--bg-color'].startsWith('rgb(24') ? 'bg-white' : 'bg-black/80';
    
    return (
        <div className={`w-full aspect-[4/3] rounded-lg p-2.5 flex items-center justify-center gap-1.5 ${bgClass}`} style={{ backgroundColor: theme['--bg-color']}}>
            {colors.map((color, i) => (
                <div key={i} className="w-1/3 h-full rounded" style={{ backgroundColor: color }} />
            ))}
        </div>
    );
};

const ThemeCard: React.FC<{ themePair: ThemePair, isActive: boolean, onClick: () => void, currentMode: 'light' | 'dark' }> = ({ themePair, isActive, onClick, currentMode }) => {
    return (
        <div className="flex flex-col items-center gap-1.5 cursor-pointer group" onClick={onClick}>
             <div className={`relative w-full rounded-xl transition-all duration-200 ring-2 ${isActive ? 'ring-offset-2 ring-offset-[var(--surface-color)] ring-[var(--primary-accent)]' : 'ring-transparent group-hover:ring-[var(--text-secondary)]/50'}`}>
                <ThemeSwatch themePair={themePair} mode={currentMode} />
            </div>
            <span className="font-semibold text-xs text-center text-[var(--text-secondary)] leading-tight">{themePair.name}</span>
        </div>
    );
};


const CustomizeAppearanceView: React.FC<CustomizeAppearanceViewProps> = ({ profile, onClose, onUpdateProfile, showNotification }) => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [themePrompt, setThemePrompt] = useState('');
    const [isGeneratingTheme, setIsGeneratingTheme] = useState(false);
    
    const nameplateFontScrollerRef = useRef<HTMLDivElement>(null);
    const nameplateFontContentRef = useRef<HTMLDivElement>(null);
    const nameplateAnimScrollerRef = useRef<HTMLDivElement>(null);
    const nameplateAnimContentRef = useRef<HTMLDivElement>(null);
    const appFontScrollerRef = useRef<HTMLDivElement>(null);
    const appFontContentRef = useRef<HTMLDivElement>(null);

    useInterruptibleScroll(nameplateFontScrollerRef, nameplateFontContentRef);
    useInterruptibleScroll(nameplateAnimScrollerRef, nameplateAnimContentRef);
    useInterruptibleScroll(appFontScrollerRef, appFontContentRef);
    
    const handleUpdateSetting = <K extends keyof ProfileData['settings']>(key: K, value: ProfileData['settings'][K]) => {
        onUpdateProfile(p => ({ ...p, settings: { ...p.settings, [key]: value } }));
    }
    
    const handleToggleCollapse = (section: string) => {
        onUpdateProfile(p => ({
            ...p,
            settings: {
                ...p.settings,
                collapsedSections: {
                    ...(p.settings.collapsedSections || {}),
                    [section]: !p.settings.collapsedSections?.[section],
                }
            }
        }));
    };

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setIsScrolled(e.currentTarget.scrollTop > 50);
    };

    const handleGenerateTheme = async () => {
        if (!themePrompt.trim()) return;
        const apiKey = profile.apiKey || process.env.API_KEY;
        if (!apiKey) {
            showNotification("Please set your Gemini API key in Settings.", "error");
            return;
        }

        setIsGeneratingTheme(true);
        try {
            const ai = new GoogleGenAI({ apiKey });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Generate a color theme based on this prompt: "${themePrompt}". 
                Return strictly a JSON object with keys: primary, secondary, accent, bgColor, surfaceColor. 
                All values must be hex color codes. Dark mode preferred.`,
                config: { responseMimeType: 'application/json' }
            });
            
            const colors = JSON.parse(response.text || '{}');
            if (colors.primary && colors.bgColor) {
                onUpdateProfile(p => ({
                    ...p,
                    customThemeColors: {
                        primary: colors.primary,
                        secondary: colors.secondary,
                        accent: colors.accent,
                        bgColor: colors.bgColor,
                        surfaceColor: colors.surfaceColor
                    },
                    activeThemePair: 'Custom',
                    settings: { ...p.settings, dynamicThemeMode: 'off' }
                }));
            }
        } catch (e) {
            console.error("Theme generation failed", e);
            showNotification("Failed to generate theme.", "error");
        } finally {
            setIsGeneratingTheme(false);
        }
    };

    const groupedThemes = themePairs.reduce((acc, theme) => {
        const category = theme.category;
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(theme);
        return acc;
    }, {} as Record<string, ThemePair[]>);
    
    const categoryOrder: (keyof typeof groupedThemes)[] = ['Holiday', 'Vibrant', 'Colorful', 'Dark', 'Light'];
    
    const dynamicThemeOptions: {id: ProfileData['settings']['dynamicThemeMode'], name: string, icon: React.ReactNode, desc: string}[] = [
        {id: 'off', name: 'Off', icon: <Ban size={24} />, desc: 'Manual theme selection.'},
        {id: 'cover', name: 'Cover Art', icon: <Image size={24} />, desc: 'Theme adapts to song artwork.'},
        {id: 'time', name: 'Time of Day', icon: <Clock size={24} />, desc: 'Changes from morning to night.'},
        {id: 'mood', name: 'Song Mood', icon: <Smile size={24} />, desc: 'Matches the song\'s emoji mood.'},
    ];

    const implementedAnimations = nameplateAnimations;

    const handleCustomColorChange = (key: keyof ProfileData['customThemeColors'], value: string) => {
        onUpdateProfile(p => ({
            ...p,
            customThemeColors: { ...p.customThemeColors, [key]: value },
            activeThemePair: 'Custom',
            settings: { ...p.settings, dynamicThemeMode: 'off' }
        }));
    };

    const handleThemeSelect = (theme: ThemePair) => {
        onUpdateProfile(p => {
            let newSettings = { ...p.settings, dynamicThemeMode: 'off' as const };
            
            // Intelligent Background Effect Switching
            if (theme.effect) {
                // If switching to a theme with a specific effect (like Holiday), enable it
                newSettings = {
                    ...newSettings,
                    backgroundEffects: { ...newSettings.backgroundEffects, enabled: true, style: theme.effect }
                };
            } else {
                // If switching to a standard theme, disable the effect if it was previously a holiday one
                const currentEffect = p.settings.backgroundEffects.style;
                const isHolidayEffect = ['hearts', 'christmas', 'spooky', 'diwali', 'fireworks', 'eggs', 'clovers', 'colors', 'crescents', 'petals', 'pride', 'leaves', 'earth', 'stars_david', 'fiesta', 'pretzels'].includes(currentEffect);
                
                if (p.settings.backgroundEffects.enabled && isHolidayEffect) {
                      newSettings = {
                        ...newSettings,
                        backgroundEffects: { ...newSettings.backgroundEffects, enabled: false }
                    };
                }
            }

            return {
                ...p,
                activeThemePair: theme.name,
                usedFeatures: {
                    ...p.usedFeatures,
                    themes: new Set(p.usedFeatures.themes || []).add(theme.name)
                },
                settings: newSettings
            };
        });
    };

    return (
        <main onScroll={handleScroll} className="h-full w-full overflow-y-auto scroll-container home-gradient-bg gpu-accelerated-scroll text-[var(--text-primary)]">
            <div className={`collapsible-header-container ${isScrolled ? 'collapsed' : ''}`}>
                <h1 className="header-big-title">Appearance</h1>
                <h2 className="header-small-title">Style</h2>
                <div className="header-actions-right">
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-[var(--surface-color)] border border-[var(--surface-border-color)] flex items-center justify-center" aria-label="Back"><ArrowLeft size={20} /></button>
                </div>
            </div>

            <div className="space-y-4 px-6 pb-40 scroll-content-with-header">
                <CollapsibleSection
                    title="Dynamic Theming"
                    isOpen={!profile.settings.collapsedSections?.dynamicTheme}
                    onToggle={() => handleToggleCollapse('dynamicTheme')}
                >
                    <div className="grid grid-cols-2 gap-2">
                        {dynamicThemeOptions.map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => handleUpdateSetting('dynamicThemeMode', opt.id)}
                                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg text-center transition-colors aspect-square ${profile.settings.dynamicThemeMode === opt.id ? 'bg-[var(--primary-accent)] text-black' : 'bg-[var(--surface-color)] hover:bg-[var(--surface-color)]/80 border border-[var(--surface-border-color)]'}`}
                            >
                                {opt.icon}
                                <span className="text-sm font-bold">{opt.name}</span>
                                <span className="text-[10px] leading-tight opacity-80">{opt.desc}</span>
                            </button>
                        ))}
                    </div>
                </CollapsibleSection>

                <CollapsibleSection
                    title="Custom Theme Editor"
                    isOpen={!profile.settings.collapsedSections?.customTheme}
                    onToggle={() => handleToggleCollapse('customTheme')}
                >
                    <div className="liquid-glass-pane p-4 rounded-lg space-y-3">
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={themePrompt} 
                                onChange={e => setThemePrompt(e.target.value)} 
                                placeholder="Describe a theme (e.g. 'Cyberpunk Rain')..." 
                                className="flex-1 bg-black/20 border border-[var(--surface-border-color)] rounded-lg px-3 py-2 text-sm"
                            />
                            <button onClick={handleGenerateTheme} disabled={isGeneratingTheme} className="bg-[var(--primary-accent)] text-black font-bold px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                                {isGeneratingTheme ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
                            </button>
                        </div>
                        <div className="h-px bg-[var(--surface-border-color)] my-2"></div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-[var(--text-primary)]">Primary</span>
                            <input type="color" value={profile.customThemeColors.primary} onChange={(e) => handleCustomColorChange('primary', e.target.value)} className="w-8 h-8 rounded-full overflow-hidden border-none p-0" />
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-[var(--text-primary)]">Secondary</span>
                            <input type="color" value={profile.customThemeColors.secondary} onChange={(e) => handleCustomColorChange('secondary', e.target.value)} className="w-8 h-8 rounded-full overflow-hidden border-none p-0" />
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-[var(--text-primary)]">Background</span>
                            <input type="color" value={profile.customThemeColors.bgColor} onChange={(e) => handleCustomColorChange('bgColor', e.target.value)} className="w-8 h-8 rounded-full overflow-hidden border-none p-0" />
                        </div>
                    </div>
                </CollapsibleSection>

                {categoryOrder.map((category) => (
                    groupedThemes[category] && (
                        <CollapsibleSection
                            key={String(category)}
                            title={`${String(category)} Themes`}
                            isOpen={!profile.settings.collapsedSections?.[`theme_${String(category)}`]}
                            onToggle={() => handleToggleCollapse(`theme_${String(category)}`)}
                        >
                            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-x-4 gap-y-6">
                                {groupedThemes[category].map((theme: ThemePair) => (
                                    <ThemeCard key={theme.name} themePair={theme} isActive={profile.activeThemePair === theme.name} onClick={() => handleThemeSelect(theme)} currentMode={profile.themeMode}/>
                                ))}
                            </div>
                        </CollapsibleSection>
                    )
                ))}
                 <CollapsibleSection
                    title="Nameplate & Header"
                    isOpen={!profile.settings.collapsedSections?.nameplate}
                    onToggle={() => handleToggleCollapse('nameplate')}
                >
                    <div className="liquid-glass-pane p-4 rounded-lg space-y-6">
                        <div>
                            <h4 className="font-bold text-sm text-[var(--text-primary)] mb-2">Greeting Style</h4>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => handleUpdateSetting('greetingStyle', 'time-based')} className={`py-2 text-sm rounded-md font-bold ${profile.settings.greetingStyle === 'time-based' ? 'bg-[var(--primary-accent)] text-black' : 'bg-[var(--surface-color)] border border-[var(--surface-border-color)]'}`}>
                                    Good Morning...
                                </button>
                                <button onClick={() => handleUpdateSetting('greetingStyle', 'welcome')} className={`py-2 text-sm rounded-md font-bold ${profile.settings.greetingStyle === 'welcome' ? 'bg-[var(--primary-accent)] text-black' : 'bg-[var(--surface-color)] border border-[var(--surface-border-color)]'}`}>
                                    Welcome back...
                                </button>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-bold text-sm text-[var(--text-primary)] mb-2">Nameplate Font</h4>
                            <div ref={nameplateFontScrollerRef} className="prompt-scroller pb-2">
                                <div ref={nameplateFontContentRef} className="slow-scroll-horizontal-content flex gap-2">
                                    {fonts.map(font => (
                                        <button key={`${font.name}-1`} onClick={() => onUpdateProfile(p => ({ ...p, nameplateFont: font.name }))} className={`font-picker-button ${profile.nameplateFont === font.name ? 'active' : ''}`} style={{ fontFamily: font.family }}>
                                            {font.name}
                                        </button>
                                    ))}
                                    {fonts.map(font => (
                                        <button key={`${font.name}-2`} onClick={() => onUpdateProfile(p => ({ ...p, nameplateFont: font.name }))} className={`font-picker-button ${profile.nameplateFont === font.name ? 'active' : ''}`} style={{ fontFamily: font.family }}>
                                            {font.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-bold text-sm text-[var(--text-primary)] mb-2">Nameplate Animation</h4>
                            <div ref={nameplateAnimScrollerRef} className="prompt-scroller pb-2">
                                <div ref={nameplateAnimContentRef} className="slow-scroll-horizontal-content flex gap-2">
                                    {implementedAnimations.map(anim => (
                                        <button key={`${anim.id}-1`} onClick={() => handleUpdateSetting('nameplateAnimation', anim.id)} className={`font-picker-button ${profile.settings.nameplateAnimation === anim.id ? 'active' : ''}`}>
                                            {anim.name}
                                        </button>
                                    ))}
                                    {implementedAnimations.map(anim => (
                                        <button key={`${anim.id}-2`} onClick={() => handleUpdateSetting('nameplateAnimation', anim.id)} className={`font-picker-button ${profile.settings.nameplateAnimation === anim.id ? 'active' : ''}`}>
                                            {anim.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        
                        <div>
                            <h4 className="font-bold text-sm text-[var(--text-primary)] mb-2">Global Font Size</h4>
                            <div className="flex items-center gap-2">
                                <input type="range" min="0.8" max="1.3" step="0.05" value={profile.settings.fontSizeMultiplier} onChange={e => handleUpdateSetting('fontSizeMultiplier', parseFloat(e.target.value))} className="w-full themed-slider" style={{ backgroundSize: `${((profile.settings.fontSizeMultiplier - 0.8) / 0.5) * 100}% 100%` }}/>
                                <span className="font-bold text-sm text-[var(--text-primary)]">{Math.round(profile.settings.fontSizeMultiplier * 100)}%</span>
                            </div>
                        </div>
                        
                        <div>
                            <h4 className="font-bold text-sm text-[var(--text-primary)] mb-2">Global App Font</h4>
                             <div ref={appFontScrollerRef} className="prompt-scroller pb-2">
                                <div ref={appFontContentRef} className="slow-scroll-horizontal-content flex gap-2">
                                    {fonts.map(font => (
                                        <button key={`${font.name}-1`} onClick={() => { onUpdateProfile(p => ({...p, activeFont: font.name, usedFeatures: { ...p.usedFeatures, fonts: new Set(p.usedFeatures.fonts).add(font.name) } }))}} className={`font-picker-button ${profile.activeFont === font.name ? 'active' : ''}`} style={{fontFamily: font.family}}>
                                            {font.name}
                                        </button>
                                    ))}
                                     {fonts.map(font => (
                                        <button key={`${font.name}-2`} onClick={() => { onUpdateProfile(p => ({...p, activeFont: font.name, usedFeatures: { ...p.usedFeatures, fonts: new Set(p.usedFeatures.fonts).add(font.name) } }))}} className={`font-picker-button ${profile.activeFont === font.name ? 'active' : ''}`} style={{fontFamily: font.family}}>
                                            {font.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </CollapsibleSection>

                <CollapsibleSection
                    title="Special Effects"
                    isOpen={!profile.settings.collapsedSections?.effects}
                    onToggle={() => handleToggleCollapse('effects')}
                >
                    <div className="liquid-glass-pane p-4 rounded-lg space-y-4">
                        <SettingsToggle
                            label="Enable Neon Glow"
                            description="Adds a colorful glow to footers and Simple Mode cards."
                            isChecked={profile.settings.neonGlow.enabled}
                            onToggle={() => onUpdateProfile(p => ({ ...p, settings: { ...p.settings, neonGlow: { ...p.settings.neonGlow, enabled: !p.settings.neonGlow.enabled }}}))}
                        />
                        {profile.settings.neonGlow.enabled && (
                            <div className="space-y-4 pt-4 border-t border-[var(--surface-border-color)]">
                                <div>
                                    <h4 className="font-bold text-sm mb-2 text-[var(--text-primary)]">Animation Style</h4>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(['rotate', 'wave', 'flame'] as const).map(style => (
                                            <button key={style} onClick={() => onUpdateProfile(p => ({...p, settings: {...p.settings, neonGlow: {...p.settings.neonGlow, style: style}}, usedFeatures: {...p.usedFeatures, neonStyles: new Set(p.usedFeatures.neonStyles).add(style)}}))} className={`py-2 text-sm rounded-md font-bold capitalize ${profile.settings.neonGlow.style === style ? 'bg-[var(--primary-accent)] text-black' : 'bg-[var(--surface-color)] border border-[var(--surface-border-color)]'}`}>
                                                {style}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <h4 className="font-bold text-sm text-[var(--text-primary)]">Animation Speed</h4>
                                        <span className="text-xs text-neutral-400">{profile.settings.neonGlow.speed.toFixed(1)}</span>
                                    </div>
                                    <input type="range" min="1" max="10" step="0.5" value={profile.settings.neonGlow.speed} onChange={e => onUpdateProfile(p => ({ ...p, settings: { ...p.settings, neonGlow: { ...p.settings.neonGlow, speed: parseFloat(e.target.value) }}}))} className="w-full mt-1 themed-slider" style={{ backgroundSize: `${((profile.settings.neonGlow.speed - 1) / 9) * 100}% 100%` }} />
                                </div>
                            </div>
                        )}
                    </div>
                </CollapsibleSection>

            </div>
        </main>
    );
};

export default CustomizeAppearanceView;
