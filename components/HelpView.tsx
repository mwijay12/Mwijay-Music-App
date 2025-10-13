import React, { useState } from 'react';

const FeatureSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="bg-[var(--surface-color)] rounded-2xl">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-6 text-left">
                <h2 className="text-xl font-bold">{title}</h2>
                <i className={`fas fa-chevron-down transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
            </button>
            {isOpen && (
                <div className="px-6 pb-6 text-neutral-300 space-y-3 max-w-none">
                    {children}
                </div>
            )}
        </div>
    );
}

const HelpView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    return (
        <main className="h-full w-full home-gradient-bg overflow-y-auto scroll-container p-6 pb-40">
            <header className="flex items-center gap-4 mb-8">
                <button onClick={onBack} className="text-2xl" aria-label="Back"><i className="fas fa-arrow-left"></i></button>
                <div>
                    <h1 className="text-3xl font-bold">Learn About Mwijay Music</h1>
                    <p className="text-neutral-400">Your guide to all features</p>
                </div>
            </header>

            <div className="space-y-4">
                 <FeatureSection title="✨ Gestures & Shortcuts">
                    <p><strong>Full Music Player:</strong></p>
                    <ul>
                        <li><strong>Change Track:</strong> Swipe left or right on the album art in the center of the screen to go to the next or previous song.</li>
                        <li><strong>Seek Forward/Backward:</strong> Press and hold on the right half of the screen (on the visualizer) to fast-forward, or the left half to rewind.</li>
                        <li><strong>Play/Pause:</strong> Double-tap in the center of the screen (on the visualizer) to quickly play or pause the music.</li>
                    </ul>
                    <p><strong>Reels Viewer:</strong></p>
                    <ul>
                        {/* FIX: Corrected Reels gestures to match implementation. */}
                        <li><strong>Play/Pause:</strong> Double-tap in the center of the video to toggle play/pause. A single tap will show/hide the controls.</li>
                        <li><strong>Seek Forward/Backward:</strong> Press and hold on the right side of the video to fast-forward, or the left side to rewind.</li>
                    </ul>
                </FeatureSection>
                <FeatureSection title="🎵 My Library">
                    <p>This is your personal music collection. Tap the 'Upload' button to add your own audio files (like MP3s, FLAC, etc.). The app automatically reads metadata like title, artist, and album art.</p>
                    <p>You can create playlists, search for songs, and view your music in a list or grid format. Use the sort button to organize your songs by date added, title, or artist.</p>
                </FeatureSection>
                 <FeatureSection title="✍️ Editing & Personalization">
                    <p><strong>Edit Song Details:</strong> In your Library, tap on any song's album art to open the details view. Here, you can edit the title and artist name, and upload a new cover image.</p>
                    <p><strong>Artist Pages:</strong> Artist names are now clickable! Tap on an artist's name anywhere in the app to go to their dedicated page. You can edit their profile picture, banner, and bio to create a personalized view of your favorite artists.</p>
                     <p><strong>Share Preview:</strong> Want to show off what you're listening to? From the song details pop-up, hit "Share Preview" to create a beautiful, animated story for social media.</p>
                </FeatureSection>
                 <FeatureSection title="📻 Live Radio">
                    <p>Discover thousands of live radio stations from around the world. You can search, browse by genre or region, and save your favorites. Create custom radio playlists from your favorite stations for quick access.</p>
                </FeatureSection>
                 <FeatureSection title="🎬 Reels">
                    <p>A space for short, looping video clips. Upload your own videos and organize them into reel playlists. You can even play the audio from any reel directly in the main music player by tapping the headphone icon in the side bar.</p>
                </FeatureSection>
                 <FeatureSection title="🎛️ Audio & Playback">
                    <p><strong>Crossfade:</strong> Found in `Settings`. It creates smooth, DJ-style transitions between songs. To turn it off, simply set the duration slider to 0 seconds.</p>
                    <p><strong>Audio FX Panel:</strong> In the full-screen player, tap the sliders icon <i className="fas fa-sliders-h"></i> to open the Audio FX panel. Here you can:</p>
                    <ul>
                        <li>Adjust the 5-band Equalizer or choose a preset.</li>
                        <li>Boost the bass or amplify the volume with the Maximizer.</li>
                        <li>Add echo effects with Reverb.</li>
                        <li>Change the song's tempo (speed) and apply creative low/high-pass filters.</li>
                        <li>Use the built-in Metronome for practice.</li>
                    </ul>
                    <p><strong>Sleep Timer:</strong> In the full player, tap the clock icon <i className="fas fa-clock"></i> to set a timer to stop the music after a certain duration or number of songs.</p>
                </FeatureSection>
                 <FeatureSection title="🎨 Appearance & UI">
                    <p><strong>Customize Appearance:</strong> Personalize everything! In your Profile (tap your avatar on Home), you can change themes, fonts, and even create your own custom color scheme.</p>
                    <p><strong>Dynamic Theming:</strong> Enable this in your Profile. The app's accent colors will automatically change to match the current song's cover art!</p>
                    <p><strong>Neon Glow:</strong> Customize the animated glow on the navigation bar and player controls in `Settings {'>'} Visuals & Effects`.</p>
                    <p><strong>Background Effects:</strong> You can add subtle, ambient animations to the app's background, like a retro synth grid or a field of stardust. Find these options in `Settings {'>'} Visuals & Effects {'>'} Background Effects`.</p>
                    <p><strong>Nameplate:</strong> Change the font and animation of your name on the Home screen from your Profile page.</p>
                    <p><strong>Simple Mode:</strong> A simplified, high-contrast interface for easy access, perfect for when you're driving. Enable it in Settings. Tap the wisdom card to see a new quote or fact!</p>
                </FeatureSection>
                 <FeatureSection title="🤖 Mwijay Assistant">
                    <p>Your AI companion for hands-free control. The assistant now has two modes:</p>
                    <ul>
                        <li><strong>Offline:</strong> Fast and reliable for basic music controls and app settings.</li>
                        <li><strong>Online (with Gemini):</strong> A more powerful mode that can understand complex requests, control advanced features like custom themes, and even analyze images you upload!</li>
                    </ul>
                    <p>You can manually switch between modes by tapping the "Online/Offline" button in the assistant view.</p>
                </FeatureSection>
                <FeatureSection title="🏆 Achievements">
                     <p>We've expanded the achievement system! There are now <strong>60 milestones</strong> to unlock as you explore the app.</p>
                     <p>From becoming a "Power User" of the Assistant to customizing your app's look and feel, there are many new ways to celebrate your musical journey.</p>
                </FeatureSection>
            </div>
        </main>
    );
};

export default HelpView;
