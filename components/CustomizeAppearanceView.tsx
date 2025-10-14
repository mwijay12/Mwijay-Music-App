

import React, { useState, useMemo } from 'react';
import type { ProfileData, ThemePair, Font } from '../types.ts';
import { themePairs, fonts } from '../constants.ts';

interface CustomizeAppearanceViewProps {
    profile: ProfileData;
    onClose: () => void;
    onThemePairChange: (themeName: string) => void;
    onFontChange: (fontName: string) => void;
    onApplyCustomTheme: (colors: ProfileData['customThemeColors']) => void;
}

const ThemeSwatch: React.FC<{ themePair: ThemePair, mode: 'light' | 'dark' }> = ({ themePair, mode }) => {
    const theme = themePair.category === 'Vibrant' ? themePair.dark : themePair[mode];
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
             <div className={`relative w-full rounded-xl transition-all duration-200 ring-2 ${isActive ? 'ring-offset-2 ring-offset-[var(--surface-color)] ring-[var(--primary-accent)]' : 'ring-transparent group-hover:ring-white/50'}`}>
                <ThemeSwatch themePair={themePair} mode={currentMode} />
            </div>
            <span className="font-semibold text-xs text-center text-neutral-300 leading-tight">{themePair.name}</span>
        </div>
    );
};


const CustomizeAppearanceView: React.FC<CustomizeAppearanceViewProps> = ({ profile, onClose, onThemePairChange, onFontChange, onApplyCustomTheme }) => {
    const [customColors, setCustomColors] = useState(profile.customThemeColors);
    
    const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>, key: keyof typeof customColors) => {
        setCustomColors(prev => ({ ...prev, [key]: e.target.value }));
    };

    const handleApplyClick = () => {
        onApplyCustomTheme(customColors);
    };

    const groupedThemes = themePairs.reduce((acc, theme) => {
        const category = theme.category;
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(theme);
        return acc;
    }, {} as Record<string, ThemePair[]>);
    
    const categoryOrder: (keyof typeof groupedThemes)[] = ['Vibrant', 'Colorful', 'Dark', 'Light'];

    const groupedFonts = useMemo(() => {
        return fonts.reduce((acc, font) => {
            const category = font.category;
            const existingCategory = acc.find(c => c.category === category);
            if (existingCategory) {
                existingCategory.fonts.push(font);
            } else {
                acc.push({ category, fonts: [font] });
            }
            return acc;
        }, [] as { category: string, fonts: Font[] }[]);
    }, []);

    return (
        <main className="h-full w-full overflow-y-auto scroll-container p-6 pb-40">
            <header className="flex items-center gap-4 mb-8">
                <button onClick={onClose} className="text-2xl" aria-label="Back"><i className="fas fa-arrow-left"></i></button>
                 <div>
                    <h1 className="text-3xl font-bold">Customize Appearance</h1>
                    <p className="text-neutral-400">Instantly preview themes & fonts</p>
                </div>
            </header>

            <div className="space-y-8">
                {categoryOrder.map((category) => (
                    groupedThemes[category] && <section key={category}>
                        <h2 className="text-lg font-bold text-white/80 mb-4 px-1">{category} Themes</h2>
                        <div className="grid grid-cols-3 gap-x-4 gap-y-6">
                            {groupedThemes[category].map(theme => (
                                <ThemeCard key={theme.name} themePair={theme} isActive={profile.activeThemePair === theme.name} onClick={() => onThemePairChange(theme.name)} currentMode={profile.themeMode}/>
                            ))}
                        </div>
                    </section>
                ))}

                 <section>
                    <h2 className="text-lg font-bold text-white/80 mb-4 px-1">Create Your Own</h2>
                    <div className="bg-[var(--surface-color)] rounded-2xl p-6">
                        <div className="flex justify-around items-center mb-6">
                             {(['primary', 'secondary', 'accent'] as const).map(key => (
                                <div key={key} className="flex flex-col items-center gap-2">
                                    <label htmlFor={`${key}ColorPicker`} className="relative w-16 h-16 rounded-full cursor-pointer border-2 border-white/20" style={{ backgroundColor: customColors[key] }}>
                                        <input id={`${key}ColorPicker`} type="color" value={customColors[key]} onChange={(e) => handleCustomColorChange(e, key)} className="absolute inset-0 opacity-0 w-full h-full" />
                                    </label>
                                    <span className="text-sm font-semibold capitalize">{key}</span>
                                </div>
                            ))}
                        </div>
                        <button onClick={handleApplyClick} className="w-full bg-[var(--primary-accent)] hover:brightness-110 text-black font-bold py-3 rounded-lg transition-all">
                            Apply Custom Colors
                        </button>
                    </div>
                </section>
                
                <section>
                     <h2 className="text-lg font-bold text-white/80 mb-4 px-1">Customize App Fonts</h2>
                     <div className="space-y-4">
                        {groupedFonts.map(group => (
                            <div key={group.category}>
                                <h3 className="text-md font-bold mb-2 text-neutral-300">{group.category}</h3>
                                <div className="prompt-scroller">
                                    <div className="prompt-scroller-content">
                                        {group.fonts.map(font => (
                                            <button 
                                                key={font.name} 
                                                onClick={() => onFontChange(font.name)}
                                                style={{ fontFamily: font.family }}
                                                className={`font-picker-button ${profile.activeFont === font.name ? 'active' : ''}`}
                                                title={`Set font: ${font.name}`}
                                            >
                                                {font.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                     </div>
                </section>
            </div>
        </main>
    );
};

export default CustomizeAppearanceView;