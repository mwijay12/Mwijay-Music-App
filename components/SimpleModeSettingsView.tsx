
import React, { useState } from 'react';
import { ArrowLeft, RefreshCw, Square, Trash2, ThumbsDown } from 'lucide-react';
import type { ProfileData } from '../types.ts';
import SettingsToggle from './SettingsToggle.tsx';
import { simpleModeTopics } from './constants.ts';

interface SimpleModeSettingsViewProps {
    profile: ProfileData;
    onUpdateProfile: (updater: (prev: ProfileData) => ProfileData) => void;
    onBack: () => void;
    onAddWisdom: () => void;
}

const SimpleModeSettingsView: React.FC<SimpleModeSettingsViewProps> = ({ profile, onUpdateProfile, onBack, onAddWisdom }) => {
    const [isScrolled, setIsScrolled] = useState(false);
    const settings = profile.settings.simpleMode;

    const handleUpdate = <K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) => {
        onUpdateProfile(p => ({
            ...p,
            settings: {
                ...p.settings,
                simpleMode: {
                    ...p.settings.simpleMode,
                    [key]: value
                }
            }
        }));
    };
    
    const handleTopicToggle = (topicId: string) => {
        onUpdateProfile(p => {
            const currentTopics = new Set(p.settings.simpleMode.selectedTopics || []);
            if (currentTopics.has(topicId)) {
                currentTopics.delete(topicId);
            } else {
                currentTopics.add(topicId);
            }
            return {
                ...p,
                settings: {
                    ...p.settings,
                    simpleMode: {
                        ...p.settings.simpleMode,
                        selectedTopics: Array.from(currentTopics)
                    }
                }
            };
        });
    };

    const handleDeleteWisdom = (wisdomToDelete: string) => {
        onUpdateProfile(p => ({
            ...p,
            customWisdom: (p.customWisdom || []).filter(w => w !== wisdomToDelete)
        }));
    };
    
    const handleDeleteLikedWisdom = (wisdomToUnlike: string) => {
        onUpdateProfile(p => ({
            ...p,
            likedWisdoms: (p.likedWisdoms || []).filter(w => w !== wisdomToUnlike)
        }));
    };

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setIsScrolled(e.currentTarget.scrollTop > 50);
    };

    const selectedTopics = new Set(profile.settings.simpleMode.selectedTopics || []);

    return (
        <main onScroll={handleScroll} className="h-full w-full bg-[var(--bg-color)] overflow-y-auto scroll-container home-gradient-bg gpu-accelerated-scroll text-[var(--text-primary)]">
            <div className={`collapsible-header-container ${isScrolled ? 'collapsed' : ''}`}>
                <h1 className="header-big-title">Zen & Vibe <span className="text-[10px] opacity-50 ml-1">2026</span></h1>
                <h2 className="header-small-title">Simple Mode</h2>
                <div className="header-actions-right">
                    <button onClick={onBack} className="w-10 h-10 rounded-full bg-[var(--surface-color)] border border-[var(--surface-border-color)] flex items-center justify-center text-[var(--text-primary)]" aria-label="Back"><ArrowLeft size={20} /></button>
                </div>
            </div>

            <div className="space-y-6 max-w-2xl mx-auto px-6 pb-40 scroll-content-with-header">
                <div className="liquid-glass-pane p-4 rounded-lg mt-4">
                    <SettingsToggle
                        label="Enable Simple Mode"
                        isChecked={settings.enabled}
                        onToggle={() => handleUpdate('enabled', !settings.enabled)}
                    />
                </div>

                <div className="liquid-glass-pane p-4 rounded-lg">
                    <h3 className="font-bold mb-3 text-center text-[var(--text-primary)]">Card Style</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => handleUpdate('style', 'rotate')} className={`py-3 rounded-lg font-bold flex items-center justify-center gap-2 ${settings.style === 'rotate' ? 'bg-[var(--primary-accent)] text-black' : 'bg-[var(--surface-color)] border border-[var(--surface-border-color)]'}`}>
                            <RefreshCw size={18} /> Rotate
                        </button>
                        <button onClick={() => handleUpdate('style', 'static')} className={`py-3 rounded-lg font-bold flex items-center justify-center gap-2 ${settings.style === 'static' ? 'bg-[var(--primary-accent)] text-black' : 'bg-[var(--surface-color)] border border-[var(--surface-border-color)]'}`}>
                           <Square size={18} /> Static
                        </button>
                    </div>
                </div>
                
                 <div className="liquid-glass-pane p-4 rounded-lg">
                    <h3 className="font-bold mb-3 text-[var(--text-primary)]">Content Topics</h3>
                    <p className="text-xs text-[var(--text-secondary)] mb-3">Select topics for the wisdom/facts displayed. Uses AI if online, or curated local content if offline.</p>
                     <div className="prompt-scroller -mx-2 px-2 pb-2">
                        <div className="slow-scroll-horizontal-content flex gap-2">
                            {simpleModeTopics.map(topic => (
                                <button key={`${topic.id}-1`} onClick={() => handleTopicToggle(topic.id)} className={`font-picker-button text-sm ${selectedTopics.has(topic.id) ? 'active' : 'text-[var(--text-secondary)] bg-[var(--surface-color)] border border-[var(--surface-border-color)]'}`}>
                                    {topic.name}
                                </button>
                            ))}
                             {simpleModeTopics.map(topic => (
                                <button key={`${topic.id}-2`} onClick={() => handleTopicToggle(topic.id)} className={`font-picker-button text-sm ${selectedTopics.has(topic.id) ? 'active' : 'text-[var(--text-secondary)] bg-[var(--surface-color)] border border-[var(--surface-border-color)]'}`}>
                                    {topic.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="liquid-glass-pane p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-3">
                         <h3 className="font-bold text-[var(--text-primary)]">Your Custom Wisdoms</h3>
                         <button onClick={onAddWisdom} className="bg-[var(--chip-bg)] text-sm font-bold py-2 px-3 rounded-full text-[var(--text-primary)]">Add New</button>
                    </div>
                    {profile.customWisdom && profile.customWisdom.length > 0 ? (
                        <div className="max-h-40 overflow-y-auto scroll-container space-y-2">
                           {profile.customWisdom.map((wisdom, index) => (
                               <div key={index} className="bg-[var(--surface-color)] p-2 rounded text-sm italic text-[var(--text-secondary)] flex justify-between items-center gap-2 border border-[var(--surface-border-color)]">
                                   <span className="flex-1">"{wisdom}"</span>
                                   <button onClick={() => handleDeleteWisdom(wisdom)} className="w-8 h-8 flex-shrink-0 rounded-full hover:bg-red-500/20 text-red-400" title="Delete wisdom">
                                       <Trash2 size={16} />
                                   </button>
                               </div>
                           ))}
                        </div>
                    ) : (
                        <p className="text-center text-sm text-[var(--text-secondary)] py-4">You haven't added any custom quotes or facts yet.</p>
                    )}
                </div>

                 <div className="liquid-glass-pane p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-3">
                         <h3 className="font-bold text-[var(--text-primary)]">Your Liked Wisdoms</h3>
                    </div>
                    {profile.likedWisdoms && profile.likedWisdoms.length > 0 ? (
                        <div className="max-h-40 overflow-y-auto scroll-container space-y-2">
                           {profile.likedWisdoms.map((wisdom, index) => (
                               <div key={index} className="bg-[var(--surface-color)] p-2 rounded text-sm italic text-[var(--text-secondary)] flex justify-between items-center gap-2 border border-[var(--surface-border-color)]">
                                   <span className="flex-1">"{wisdom}"</span>
                                   <button onClick={() => handleDeleteLikedWisdom(wisdom)} className="w-8 h-8 flex-shrink-0 rounded-full hover:bg-red-500/20 text-red-400" title="Unlike">
                                       <ThumbsDown size={16} />
                                   </button>
                               </div>
                           ))}
                        </div>
                    ) : (
                        <p className="text-center text-sm text-[var(--text-secondary)] py-4">Quotes and facts you 'like' in Simple Mode will appear here.</p>
                    )}
                </div>
            </div>
        </main>
    );
};

export default SimpleModeSettingsView;
