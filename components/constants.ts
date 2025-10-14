
import type { User, Song, Video, ThemePair, Font, Achievement, NameplateAnimation } from './types.ts';

export const user: User = {
    name: 'Mwijay',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=128&h=128&fit=crop&crop=faces',
};

export const FAVORITES_PLAYLIST_ID = 'favorites-playlist-mwijay-music';

// NEW: Offline-first SVG gradient placeholder generation
const defaultGradients = [
    ['#FF6B6B', '#FFD93D'], ['#6BFFB8', '#3D7EFF'], ['#FF8C42', '#FFD32D'],
    ['#AE6BFF', '#3DFFE2'], ['#FF6B9A', '#FFD93D'], ['#42E695', '#3BB2B8'],
    ['#FFB86B', '#FF7C6B'], ['#5EEBFF', '#5E8BFF'], ['#FF5E5E', '#FF9E5E'],
    ['#43E97B', '#38F9D7'], ['#FAD961', '#F76B1C'], ['#C33764', '#1D2671'],
    ['#155799', '#159957'], ['#00C9FF', '#92FE9D'], ['#F36265', '#961276'],
    ['#EECDA3', '#EF629F'],
];

const generateSvgDataUrl = (colors: string[]) => {
    const stops = colors.map((color, index) => 
        `<stop offset="${index * 100 / (colors.length -1)}%" stop-color="${color}" />`
    ).join('');
    
    // Use a 45-degree angle for the gradient
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">${stops}</linearGradient></defs><rect width="200" height="200" fill="url(#g)" /></svg>`;
    
    // Base64 encode the SVG string
    try {
        return `data:image/svg+xml;base64,${btoa(svg)}`;
    } catch (e) {
        // Fallback for environments where btoa might not be available (though unlikely in a browser)
        return `data:image/svg+xml,${encodeURIComponent(svg)}`;
    }
};

export const defaultCoverArt = defaultGradients.map(generateSvgDataUrl);

export const getRandomCoverArt = () => {
    const randomGradientColors = defaultGradients[Math.floor(Math.random() * defaultGradients.length)];
    return generateSvgDataUrl(randomGradientColors);
};

export const defaultMoods = [
    { name: 'Happy', emoji: '😊', color: 'bg-yellow-400/80 text-black' },
    { name: 'Sad', emoji: '😢', color: 'bg-blue-500/80 text-white' },
    { name: 'Energetic', emoji: '🔥', color: 'bg-red-500/80 text-white' },
    { name: 'Chill', emoji: '❄️', color: 'bg-sky-400/80 text-white' },
    { name: 'Dance', emoji: '🕺', color: 'bg-purple-500/80 text-white' },
    { name: 'Sleepy', emoji: '😴', color: 'bg-indigo-500/80 text-white' },
    { name: 'Worship', emoji: '🙏', color: 'bg-amber-400/80 text-black' },
    { name: 'Party', emoji: '🎉', color: 'bg-pink-500/80 text-white' },
    { name: 'Workout', emoji: '💪', color: 'bg-red-600/80 text-white' },
    { name: 'Focus', emoji: '🤔', color: 'bg-cyan-500/80 text-white' },
    { name: 'Cool', emoji: '😎', color: 'bg-blue-600/80 text-white' },
    { name: 'Heartbreak', emoji: '💔', color: 'bg-gray-500/80 text-white' },
];

// NOTE: Obsolete visualizers like 'DNA', 'Warp', 'Crystal', 'Bloom' have been removed.
export const visualizers = [
    { id: 'none', name: 'None', icon: 'fa-ban' },
    { id: 'spectral', name: 'Spectral', icon: 'fa-chart-bar' },
    { id: 'galaxy', name: 'Galaxy', icon: 'fa-meteor' },
    { id: 'tunnel', name: 'Tunnel', icon: 'fa-bullseye' },
    { id: 'particles', name: 'Particles', icon: 'fa-atom' },
    { id: 'vortex', name: 'Vortex', icon: 'fa-hurricane' },
    { id: 'stardust', name: 'Stardust', icon: 'fa-star' },
    { id: 'electric', name: 'Electric', icon: 'fa-bolt' },
    { id: 'equalizer', name: 'Equalizer', icon: 'fa-sliders-h' },
    { id: 'flow', name: 'Flow', icon: 'fa-wind' },
    { id: 'neon-grid', name: 'Neon Grid', icon: 'fa-border-all' },
    { id: 'metropolis', name: 'Metropolis', icon: 'fa-city' },
];


export const equalizerPresets: { [key: string]: number[] } = {
    'Studio': [0, 0, 0, 0, 0],
    'Acoustic': [3, 2, 0, 2, 3],
    'Dance': [5, 3, -2, 2, 4],
    'Deep Bass': [7, 5, 0, -3, -5],
    'Electronic': [4, 2, -1, 3, 5],
    'Hip-Hop': [6, 4, 0, 1, 3],
    'Latin': [4, 2, -1, 2, 4],
    'Lounge': [-2, 0, 3, 2, -1],
    'Piano': [2, 1, 0, 2, 3],
    'Pop': [-1, 2, 3, 2, -1],
    'R&B': [5, 3, 1, 0, -2],
    'Rock': [5, 3, -2, 3, 5],
    'Vocal Booster': [-2, -1, 2, 4, 2],
};

export const metronomeSounds = [
    { name: 'Click', icon: 'fa-mouse-pointer', type: 'click' },
    { name: 'Tick', icon: 'fa-clock', type: 'tick' },
    { name: 'Beep', icon: 'fa-volume-up', type: 'beep' },
    { name: 'Snare', icon: 'fa-drum', type: 'snare' },
    { name: 'Kick', icon: 'fa-drum-kit', type: 'kick' },
    { name: 'Hi-Hat', icon: 'fa-drum-steelpan', type: 'hihat' },
];

export const assistantPrompts = [
    'Play some music',
    'What song is this?',
    'Show my top songs',
    'Play some radio',
    'Enable simple mode',
    'Switch to dark theme',
    'Set a sleep timer for 15 minutes',
    'How do I change the theme?',
    'Change font to Inter',
    'I want a pink theme',
];

export const playlists = [
    { id: '1', name: 'Starlit Reverie', details: 'By Budiarti • 8 Songs', coverUrl: getRandomCoverArt() },
    { id: '2', name: 'Midnight Confessions', details: 'By Alex Morning', coverUrl: getRandomCoverArt() },
    { id: '3', name: 'Golden Hour Beats', details: 'By Lo-Fi Cafe', coverUrl: getRandomCoverArt() }
];

export const navItems = [
    { name: 'Home', icon: 'fa-home' },
    { name: 'Explore', icon: 'fa-compass' },
    { name: 'Library', icon: 'fa-music' },
    { name: 'Reels', icon: 'fa-film' },
    { name: 'Settings', icon: 'fa-cog' },
];

export const videos: Video[] = [
    // { id: '1', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', title: 'Big Buck Bunny', uploader: 'Blender Foundation', isFavorite: false, },
    // { id: '2', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', title: 'Elephants Dream', uploader: 'Blender Foundation', isFavorite: true, },
];

export const moodPlaylists: { [key: string]: Song[] } = {
    Chill: [ { id: 'mood-chill-1', url: 'https://storage.googleapis.com/media-session/elephants-dream/the-wires.mp3', title: 'The Wires', artist: 'Late Night Alumni', albumArtUrl: getRandomCoverArt() } ],
    Upbeat: [ { id: 'mood-upbeat-1', url: 'https://storage.googleapis.com/media-session/big-buck-bunny/pre-teaser.mp3', title: 'Pre-Teaser', artist: 'The Go! Team', albumArtUrl: getRandomCoverArt() } ],
    Sad: [ { id: 'mood-sad-1', url: 'https://storage.googleapis.com/media-session/sintel/shaman-fight.mp3', title: 'Shaman Fight', artist: 'Bon Iver', albumArtUrl: getRandomCoverArt() } ],
    Energetic: [ { id: 'mood-energetic-1', url: 'https://storage.googleapis.com/media-session/sintel/the-dragon.mp3', title: 'The Dragon', artist: 'Pendulum', albumArtUrl: getRandomCoverArt() } ],
};

const defaultColors = (primary: string, secondary: string, accent: string) => ({
    '--primary-accent': primary, '--secondary-accent-start': secondary, '--secondary-accent-end': accent,
});

const darkThemeBase = { '--bg-color': '#111827', '--surface-color': '#1F2937', '--text-primary': '#F9FAFB', '--text-secondary': '#D1D5DB', '--chip-bg': '#374151', '--surface-border-color': 'rgba(249, 250, 251, 0.1)' };
const lightThemeBase = { '--bg-color': '#F9FAFB', '--surface-color': '#FFFFFF', '--text-primary': '#111827', '--text-secondary': '#374151', '--chip-bg': '#E5E7EB', '--surface-border-color': 'rgba(17, 24, 39, 0.1)' };

// --- NEW: Vibrant Themes (Unaffected by light/dark toggle) ---
const darkVibrantThemeBase = { ...darkThemeBase, '--text-primary': '#FFFFFF', '--text-secondary': '#E0E0E0', '--chip-bg': '#2A2A2A' };
const brightVibrantThemeBase = { ...lightThemeBase, '--chip-bg': '#E0E0E0', '--surface-border-color': 'rgba(0,0,0,0.1)' };

const vibrantThemes = [
    // Dark Themes (6)
    { name: 'Cyber Punch', theme: { ...darkVibrantThemeBase, '--bg-color': '#190028', '--surface-color': '#28003D', ...defaultColors('#F02395', '#B823F0', '#FF00E5') } },
    { name: 'Tidal Rush', theme: { ...darkVibrantThemeBase, '--bg-color': '#012A4A', '--surface-color': '#013A63', ...defaultColors('#468FAF', '#2C7DA0', '#A9D6E5') } },
    { name: 'Nebula Haze', theme: { ...darkVibrantThemeBase, '--bg-color': '#00001D', '--surface-color': '#111133', ...defaultColors('#9D4EDD', '#5A189A', '#C77DFF') } },
    { name: 'Retrograde', theme: { ...darkVibrantThemeBase, '--bg-color': '#0F2027', '--surface-color': '#203A43', ...defaultColors('#1488CC', '#2B32B2', '#FF5F6D') } },
    { name: 'Crimson Bloom', theme: { ...darkVibrantThemeBase, '--bg-color': '#2A0000', '--surface-color': '#410000', ...defaultColors('#E63946', '#F1FAEE', '#A8DADC') } },
    { name: 'Emerald Tablet', theme: { ...darkVibrantThemeBase, '--bg-color': '#011F11', '--surface-color': '#02301A', ...defaultColors('#00A86B', '#50C878', '#A7D7C5') } },

    // Bright Themes (6)
    { name: 'Kiwi Kick', theme: { ...brightVibrantThemeBase, '--bg-color': '#F0FFF0', '--surface-color': '#FFFFFF', '--text-primary': '#142101', '--text-secondary': '#253802', ...defaultColors('#9EF01A', '#70E000', '#BEF264') } },
    { name: 'Solar Flare', theme: { ...brightVibrantThemeBase, '--bg-color': '#FFF8E1', '--surface-color': '#FFFFFF', '--text-primary': '#3D0000', '--text-secondary': '#5C0000', ...defaultColors('#FF8C00', '#FF4500', '#FFD700') } },
    { name: 'Mango Tango', theme: { ...brightVibrantThemeBase, '--bg-color': '#FFF0E5', '--surface-color': '#FFFFFF', '--text-primary': '#3D1B00', '--text-secondary': '#5C2A00', ...defaultColors('#FF8C42', '#FF477E', '#FFD32D') } },
    { name: 'Glacier Mint', theme: { ...brightVibrantThemeBase, '--bg-color': '#F0FFFF', '--surface-color': '#FFFFFF', '--text-primary': '#002821', '--text-secondary': '#003D32', ...defaultColors('#6BFFB8', '#3DFFE2', '#A6FFF2') } },
    { name: 'Electric Coral', theme: { ...brightVibrantThemeBase, '--bg-color': '#FFF5F5', '--surface-color': '#FFFFFF', '--text-primary': '#001D28', '--text-secondary': '#002E40', ...defaultColors('#FF6B6B', '#4ECDC4', '#FFD166') } },
    { name: 'Gilded Gold', theme: { ...brightVibrantThemeBase, '--bg-color': '#FFFDF5', '--surface-color': '#FFFFFF', '--text-primary': '#3A3A3A', '--text-secondary': '#5A5A5A', ...defaultColors('#FFD700', '#F0E68C', '#BDB76B') } },
].map(t => ({ name: t.name, category: 'Vibrant', light: t.theme, dark: t.theme }));

// --- UPDATED: Theme definitions for Dark and Light categories ---
const defaultDarkTheme = { ...darkThemeBase, '--bg-color': '#1e1b18', ...defaultColors('#8e44ad', '#9b59b6', '#d2b4de') };
const midnightBlueTheme = { ...darkThemeBase, '--bg-color': '#012a4a', ...defaultColors('#2c7da0', '#89c2d9', '#a9d6e5') };
const forestGreenTheme = { ...darkThemeBase, '--bg-color': '#1b4332', ...defaultColors('#40916c', '#74c69d', '#b7e4c7') };
const draculaTheme = { ...darkThemeBase, '--bg-color': '#282a36', '--surface-color': '#44475a', ...defaultColors('#bd93f9', '#ff79c6', '#f1fa8c') };
const rubyEmberTheme = { ...darkThemeBase, '--bg-color': '#2A0813', '--surface-color': '#411520', ...defaultColors('#FF4747', '#FF7B54', '#FFB26B') };
const amethystNightTheme = { ...darkThemeBase, '--bg-color': '#19172B', '--surface-color': '#272442', ...defaultColors('#D087F2', '#F287C8', '#F2A487') };

const classicLightTheme = { ...lightThemeBase, ...defaultColors('#4361ee', '#3a0ca3', '#03045e') };
const skyBlueTheme = { ...lightThemeBase, ...defaultColors('#00b4d8', '#48cae4', '#023e8a') };
const mintGreenTheme = { ...lightThemeBase, ...defaultColors('#00a896', '#06d6a0', '#013220') };
const sunshineTheme = { ...lightThemeBase, ...defaultColors('#ffbe0b', '#ffca3a', '#141100') };
const peachSorbetTheme = { ...lightThemeBase, '--bg-color': '#FFF5F0', ...defaultColors('#FFB3A7', '#FF8B80', '#FFDAB9') };
const springMeadowTheme = { ...lightThemeBase, '--bg-color': '#F6FFF8', ...defaultColors('#A8E6CF', '#DCEDC1', '#FFD3B6') };


export const themePairs: ThemePair[] = [
    ...vibrantThemes,
    
    // --- Colorful Themes (have distinct light/dark modes) ---
    { name: 'Oceanic Bliss', category: 'Colorful',
      light: { ...lightThemeBase, ...defaultColors('#0096c7', '#00b4d8', '#48cae4') },
      dark: { ...darkThemeBase, '--bg-color': '#023047', ...defaultColors('#48cae4', '#ade8f4', '#90e0ef') } },
    { name: 'Crimson Fire', category: 'Colorful',
      light: { ...lightThemeBase, '--bg-color': '#fff1f2', ...defaultColors('#c9184a', '#ff4d6d', '#ff8fa3') },
      dark: { ...darkThemeBase, '--bg-color': '#280004', ...defaultColors('#ff4d6d', '#ff8fa3', '#ffb3c1') } },
    { name: 'Jungle Vibe', category: 'Colorful',
      light: { ...lightThemeBase, ...defaultColors('#70e000', '#9ef01a', '#ccff33') },
      dark: { ...darkThemeBase, '--bg-color': '#132a13', ...defaultColors('#9ef01a', '#ccff33', '#d4ff51') } },
    { name: 'Synthwave Sunset', category: 'Colorful',
      light: { ...lightThemeBase, '--bg-color': '#f3e8ff', ...defaultColors('#9d4edd', '#c77dff', '#e0aaff') },
      dark: { ...darkThemeBase, '--bg-color': '#10002b', ...defaultColors('#9d4edd', '#e0aaff', '#c77dff') } },
    { name: 'Golden Hour', category: 'Colorful',
      light: { ...lightThemeBase, ...defaultColors('#ff9f1c', '#ffbf69', '#fcdc9d') },
      dark: { ...darkThemeBase, '--bg-color': '#3d2300', ...defaultColors('#ff9f1c', '#ffbf69', '#fcdc9d') } },
    { name: 'Aquamarine Dream', category: 'Colorful',
      light: { ...lightThemeBase, ...defaultColors('#00a896', '#06d6a0', '#80ed99') },
      dark: { ...darkThemeBase, '--bg-color': '#013220', ...defaultColors('#06d6a0', '#80ed99', '#a9def9') } },
    
// FIX: Added missing 'dark' property to Dark and Light theme categories to match the ThemePair type.
    // --- Dark Themes (always dark) ---
    { name: 'Default Dark', category: 'Dark', light: defaultDarkTheme, dark: defaultDarkTheme },
    { name: 'Midnight Blue', category: 'Dark', light: midnightBlueTheme, dark: midnightBlueTheme },
    { name: 'Forest Green', category: 'Dark', light: forestGreenTheme, dark: forestGreenTheme },
    { name: 'Dracula', category: 'Dark', light: draculaTheme, dark: draculaTheme },
    { name: 'Ruby Ember', category: 'Dark', light: rubyEmberTheme, dark: rubyEmberTheme },
    { name: 'Amethyst Night', category: 'Dark', light: amethystNightTheme, dark: amethystNightTheme },

    // --- Light Themes (always light) ---
    { name: 'Classic Light', category: 'Light', light: classicLightTheme, dark: classicLightTheme },
    { name: 'Sky Blue', category: 'Light', light: skyBlueTheme, dark: skyBlueTheme },
    { name: 'Mint Green', category: 'Light', light: mintGreenTheme, dark: mintGreenTheme },
    { name: 'Sunshine', category: 'Light', light: sunshineTheme, dark: sunshineTheme },
    { name: 'Peach Sorbet', category: 'Light', light: peachSorbetTheme, dark: peachSorbetTheme },
    { name: 'Spring Meadow', category: 'Light', light: springMeadowTheme, dark: springMeadowTheme },
];

export const fonts: Font[] = [
    // Modern (Sans-Serif)
    { name: 'Satoshi', family: "'Satoshi', sans-serif", category: 'Modern' },
    { name: 'Inter', family: "'Inter', sans-serif", category: 'Modern' },
    { name: 'Poppins', family: "'Poppins', sans-serif", category: 'Modern' },
    { name: 'Lato', family: "'Lato', sans-serif", category: 'Modern' },
    { name: 'Montserrat', family: "'Montserrat', sans-serif", category: 'Modern' },
    { name: 'Nunito', family: "'Nunito', sans-serif", category: 'Modern' },
    { name: 'Bricolage Grotesque', family: "'Bricolage Grotesque', sans-serif", category: 'Modern' },
    
    // Elegant (Serif)
    { name: 'Playfair Display', family: "'Playfair Display', serif", category: 'Elegant' },
    { name: 'Merriweather', family: "'Merriweather', serif", category: 'Elegant' },
    { name: 'Lora', family: "'Lora', serif", category: 'Elegant' },
    { name: 'Zilla Slab', family: "'Zilla Slab', serif", category: 'Elegant' },

    // Handwriting (Script)
    { name: 'Dancing Script', family: "'Dancing Script', cursive", category: 'Handwriting' },
    { name: 'Lobster', family: "'Lobster', cursive", category: 'Handwriting' },
    { name: 'Caveat', family: "'Caveat', cursive", category: 'Handwriting' },
    { name: 'Pacifico', family: "'Pacifico', cursive", category: 'Handwriting' },
    { name: 'Permanent Marker', family: "'Permanent Marker', cursive", category: 'Handwriting' },
    
    // Monospace
    { name: 'Roboto Mono', family: "'Roboto Mono', monospace", category: 'Monospace' },
    { name: 'JetBrains Mono', family: "'JetBrains Mono', monospace", category: 'Monospace' },
    
    // Playful (Display)
    { name: 'Oswald', family: "'Oswald', sans-serif", category: 'Playful' },
    { name: 'Bebas Neue', family: "'Bebas Neue', sans-serif", category: 'Playful' },
    { name: 'Press Start 2P', family: "'Press Start 2P', cursive", category: 'Playful' },
];

// --- NEW: For randomized app title ---
export const calligraphyFonts = [
    'Dancing Script', 'Lobster', 'Caveat', 'Pacifico', 'Permanent Marker'
];

export const nameplateAnimations: NameplateAnimation[] = [
    { id: 'none', name: 'None' },
    { id: 'fade-in', name: 'Fade In' },
    { id: 'typewriter', name: 'Typewriter' },
    { id: 'glitch', name: 'Glitch' },
    { id: 'neon-glow', name: 'Neon' },
    { id: 'slide-in-left', name: 'Slide Left' },
    { id: 'slide-up', name: 'Slide Up' },
    { id: 'zoom-in', name: 'Zoom In' },
    { id: 'bounce-in', name: 'Bounce' },
    { id: 'pulse', name: 'Pulse' },
    { id: 'wavy', name: 'Wavy' },
    { id: 'shadow-pop', name: 'Shadow Pop' },
    { id: 'blur-in', name: 'Blur In' },
    { id: 'flip-in-x', name: 'Flip' },
    { id: 'rotate-in', name: 'Rotate' },
    { id: 'color-cycle', name: 'Color Cycle' },
];

export const allWisdom = [
    'Music gives a soul to the universe, wings to the mind, flight to the imagination and life to everything.',
    'Without music, life would be a mistake.',
    'The best time to plant a tree was 20 years ago. The second best time is now.',
    'An unexamined life is not worth living.',
    'The only thing we have to fear is fear itself.',
    'Did you know? The oldest known song is the "Hurrian Hymn No. 6", which is over 3,400 years old.',
    'A "jiffy" is an actual unit of time for 1/100th of a second.',
    'Finland has the most metal bands per capita. 🤘',
    'Listening to music has been shown to improve memory and athletic performance.',
    'The term "disc jockey" was first used in 1935.',
    'The only way to do great work is to love what you do.',
    'Success is not final, failure is not fatal: it is the courage to continue that counts.',
    'Believe you can and you’re halfway there.',
    'The future belongs to those who believe in the beauty of their dreams.',
    'What you get by achieving your goals is not as important as what you become by achieving your goals.',
    'Strive not to be a success, but rather to be of value.',
    'Did you know? A flock of crows is known as a murder.',
    'The national animal of Scotland is the unicorn.',
    'Honey never spoils. Archaeologists have found pots of honey in ancient Egyptian tombs that are over 3,000 years old and still edible.',
    'There are more trees on Earth than stars in the Milky Way galaxy.',
    'The human brain weighs about 3 pounds but uses 20% of the body’s oxygen and calories.',
    'An octopus has three hearts.',
    'You are the music while the music lasts.',
    'Where words fail, music speaks.',
    'Life is like a beautiful melody, only the lyrics are messed up.',
    'Music is the shorthand of emotion.',
    'One good thing about music, when it hits you, you feel no pain.',
    'The Earth is not a perfect sphere; it bulges at the equator.',
    'The quietest room in the world is at Microsoft’s headquarters in Washington, where the background noise is measured in negative decibels.',
    'Bees can recognize human faces.',
    'A day on Venus is longer than a year on Venus. It rotates very slowly.',
    'Your playlist is the soundtrack of your life. Make it a good one.',
    'Turn up the volume, turn down the problems.',
    'Every song is a memory waiting to happen.',
    'When in doubt, play that one song that always makes you feel better.',
    'A day without music is like... just kidding, I have no idea.',
    'Did you know? The sound of a vinyl record is created by a needle vibrating in a groove.',
    'The first-ever Grammy for Best Rap Performance was awarded in 1989 to DJ Jazzy Jeff & The Fresh Prince.',
    'Queen’s “Bohemian Rhapsody” is one of the most complex songs ever recorded, with over 180 vocal overdubs.',
    'The fear of long words is called hippopotomonstrosesquippedaliophobia. Seriously.',
    'Wombats have cube-shaped poop.',
    'Bananas are berries, but strawberries are not.',
    'The inventor of the Pringles can is now buried in one.',
    'The journey of a thousand miles begins with a single step.',
    'That which does not kill us makes us stronger.',
    'It is never too late to be what you might have been.',
    'Everything you’ve ever wanted is on the other side of fear.',
];

const BASE_ACHIEVEMENTS: Omit<Achievement, 'criteria'>[] = [
    // Listening Milestones
    { id: 'listen10min', name: 'Getting Started', description: 'Listen for 10 minutes.', icon: 'fa-headphones', emoji: '🎧' },
    { id: 'listen1hour', name: 'Dedicated Listener', description: 'Listen for a full hour.', icon: 'fa-clock', emoji: '🕰️' },
    { id: 'listen5hours', name: 'Audiophile', description: 'Listen for 5 hours.', icon: 'fa-headphones-alt', emoji: '🤯' },
    { id: 'listen24hours', name: '24-Hour Party Person', description: 'Accumulate 24 hours of listening time.', icon: 'fa-calendar-day', emoji: '🥳' },
    { id: 'play20', name: 'DJ in the Making', description: 'Play 20 songs in total.', icon: 'fa-play', emoji: '🎚️' },
    { id: 'play100', name: 'Serial Listener', description: 'Play 100 songs.', icon: 'fa-forward', emoji: '💯' },
    { id: 'play500', name: 'Music Junkie', description: 'Play 500 songs.', icon: 'fa-record-vinyl', emoji: '中毒' },

    // Collection Milestones
    { id: 'upload1', name: 'Collector', description: 'Upload your first song.', icon: 'fa-upload', emoji: '📥' },
    { id: 'upload10', name: 'Archivist', description: 'Upload 10 songs.', icon: 'fa-box-archive', emoji: '📦' },
    { id: 'upload50', name: 'Librarian', description: 'Upload 50 songs.', icon: 'fa-book-reader', emoji: '📚' },
    { id: 'upload250', name: 'Music Hoarder', description: 'Your collection has 250 songs.', icon: 'fa-warehouse', emoji: '🗄️' },
    { id: 'favorite1', name: 'First Love', description: 'Favorited a song.', icon: 'fa-heart', emoji: '❤️' },
    { id: 'favorite25', name: 'Heart Collector', description: 'Favorite 25 songs.', icon: 'fa-heart-circle-plus', emoji: '💖' },
    { id: 'favorite100', name: 'True Romantic', description: 'Favorite 100 songs.', icon: 'fa-gratipay', emoji: '😍' },
    
    // Playlist & Queue
    { id: 'playlist1', name: 'Playlist Pioneer', description: 'Create your first playlist.', icon: 'fa-list-music', emoji: '📝' },
    { id: 'playlist5', name: 'Curator', description: 'Create 5 playlists.', icon: 'fa-rectangle-list', emoji: '📚' },
    { id: 'playlist10', name: 'Master Curator', description: 'Create 10 playlists.', icon: 'fa-swatchbook', emoji: '🧐' },
    { id: 'queue1', name: 'Quick Mix', description: 'Add a song to the queue.', icon: 'fa-plus', emoji: '➕' },

    // Feature Exploration
    { id: 'radio1', name: 'On Air', description: 'Listen to a radio station.', icon: 'fa-tower-broadcast', emoji: '📻' },
    { id: 'radio-surfer', name: 'Radio Surfer', description: 'Listen to 5 different radio stations.', icon: 'fa-tower-broadcast', emoji: '🌍' },
    { id: 'reel1', name: 'First Reel', description: 'Upload your first reel.', icon: 'fa-video', emoji: '📹' },
    { id: 'reel10', name: 'Reel Enthusiast', description: 'Upload 10 reels.', icon: 'fa-film', emoji: '🎬' },
    { id: 'assistant1', name: 'Chatterbox', description: 'Use the Mwijay Assistant.', icon: 'fa-brain', emoji: '🤖' },
    { id: 'eq-tinkerer', name: 'Sound Engineer', description: 'Use the equalizer.', icon: 'fa-sliders-h', emoji: '🎛️' },
    { id: 'lyric-lover', name: 'Lyric Lover', description: 'View lyrics for a song.', icon: 'fa-file-alt', emoji: '🎤' },
    { id: 'ai-lyricist', name: 'AI Lyricist', description: 'Generate lyrics with the AI studio.', icon: 'fa-wand-magic-sparkles', emoji: '✨' },
    { id: 'mood-setter', name: 'Mood Setter', description: 'Set a mood for 3 different songs.', icon: 'fa-smile', emoji: '😊' },

    // Customization
    { id: 'theme-explorer', name: 'Customizer', description: 'Try 3 different themes.', icon: 'fa-palette', emoji: '🎨' },
    { id: 'font-fanatic', name: 'Typographer', description: 'Try 3 different fonts.', icon: 'fa-font', emoji: '✒️' },
    { id: 'custom-look', name: 'Personal Touch', description: 'Apply a custom theme.', icon: 'fa-brush', emoji: '🖌️' },
    { id: 'visual-artist', name: 'Visual Artist', description: 'Try 5 different visualizers.', icon: 'fa-eye', emoji: '👁️' },

    // Time-based
    { id: 'morning-vibes', name: 'Morning Vibes', description: 'Listen to music before 9 AM.', icon: 'fa-sun', emoji: '🌅' },
    { id: 'lunch-beats', name: 'Lunch Break Beats', description: 'Enjoyed tunes during lunch (12-2 PM).', icon: 'fa-hamburger', emoji: '🍔' },
    { id: 'night-owl', name: 'Night Owl', description: 'Listen to music after 10 PM.', icon: 'fa-moon', emoji: '🦉' },

    // Power User
    { id: 'power-user', name: 'Power User', description: 'Use the Mwijay Assistant 10 times.', icon: 'fa-bolt', emoji: '⚡' },
    { id: 'shuffle-master', name: 'Shuffle Master', description: 'Shuffle your music 50 times.', icon: 'fa-shuffle', emoji: '🔀' },
    { id: 'speed-demon', name: 'Speed Demon', description: 'Listen to a song at 1.5x speed or faster.', icon: 'fa-gauge-high', emoji: '🚀' },
    { id: 'binge-watcher', name: 'Binge Watcher', description: 'Watch 25 reels in one session.', icon: 'fa-films', emoji: '🍿' },
    { id: 'reel-playlist-creator', name: 'Reel Director', description: 'Create your first reel playlist.', icon: 'fa-clapperboard', emoji: '🎬' },
    { id: 'neon-dreamer', name: 'Neon Dreamer', description: 'Try all 3 neon glow styles.', icon: 'fa-lightbulb-on', emoji: '💡' },
    { id: 'nameplate-artist', name: 'Nameplate Artist', description: 'Try 5 different nameplate animations.', icon: 'fa-pen-fancy', emoji: '🖋️' },
    { id: 'theme-connoisseur', name: 'Theme Connoisseur', description: 'Try 10 different themes.', icon: 'fa-swatchbook', emoji: '🧐' },
    { id: 'favorite-radio', name: 'Radio Lover', description: 'Favorite your first radio station.', icon: 'fa-heart-pulse', emoji: '📻❤️' },
    { id: 'radio-dj', name: 'Radio DJ', description: 'Create a radio playlist.', icon: 'fa-compact-disc', emoji: '📀' },
    { id: 'tastemaker-pro', name: 'Tastemaker Pro', description: 'Create a playlist with over 50 songs.', icon: 'fa-crown', emoji: '👑' },
    { id: 'ar-scout', name: 'Artist Scout', description: 'Have songs from 50 different artists in your library.', icon: 'fa-users', emoji: '🔭' },
    { id: 'tastemaker', name: 'Tastemaker', description: 'Create a playlist with over 20 songs.', icon: 'fa-star-half-alt', emoji: '🌟' },
    { id: 'cover-artist', name: 'Cover Artist', description: 'Change the cover art for a song.', icon: 'fa-image', emoji: '🖼️' },
    { id: 'biographer', name: 'Biographer', description: 'Save a custom artist profile.', icon: 'fa-address-card', emoji: '✍️' },
    
    // --- NEW ACHIEVEMENTS ---
    { id: 'ambiance-architect', name: 'Ambiance Architect', description: 'Try 5 different background effects.', icon: 'fa-layer-group', emoji: '🌌' },
    { id: 'global-explorer', name: 'Global Explorer', description: 'Customize your Radio Hub.', icon: 'fa-globe-americas', emoji: '🗺️' },
    { id: 'wisdom-seeker', name: 'Wisdom Seeker', description: 'Add a custom quote to Simple Mode.', icon: 'fa-book-open', emoji: '🧐' },
    { id: 'mood-curator', name: 'Mood Curator', description: 'Create your first custom mood.', icon: 'fa-plus-circle', emoji: '🎨' },
    { id: 'digital-digger', name: 'Digital Crate Digger', description: 'Download 10 songs from Explore.', icon: 'fa-download', emoji: '💿' },
    { id: 'weekend-warrior', name: 'Weekend Warrior', description: 'Listen for 2 hours on a weekend.', icon: 'fa-calendar-week', emoji: '🎉' },
    { id: 'sound-sculptor', name: 'Sound Sculptor', description: 'Try 5 different equalizer presets.', icon: 'fa-sliders', emoji: '🎛️' },
    { id: 'rhythm-keeper', name: 'Rhythm Keeper', description: 'Use the metronome for 5 minutes.', icon: 'fa-stopwatch-20', emoji: '🥁' },
    { id: 'social-butterfly', name: 'Social Butterfly', description: 'Use the "Share Preview" feature.', icon: 'fa-share-alt', emoji: '📱' },
    { id: 'the-remixer', name: 'The Remixer', description: 'Change the tempo of 5 songs.', icon: 'fa-gauge-simple-high', emoji: '🚀' },
    { id: 'perfectionist', name: 'Perfectionist', description: 'Edit the details of 10 songs.', icon: 'fa-pencil-ruler', emoji: '✏️' },
];

export const achievements: Achievement[] = BASE_ACHIEVEMENTS.map(base => {
    const criteria: Achievement['criteria'] = (profile, type, value) => {
        const librarySongs = profile.librarySongs || [];
        switch (base.id) {
            // Listening Milestones
            case 'listen10min': return (type === 'listenTime' || type === 'radioListenTime') && value >= 600;
            case 'listen1hour': return (type === 'listenTime' || type === 'radioListenTime') && value >= 3600;
            case 'listen5hours': return (type === 'listenTime' || type === 'radioListenTime') && value >= 18000;
            case 'listen24hours': return (type === 'listenTime' || type === 'radioListenTime') && value >= 86400;
            case 'play20': return type === 'songsPlayed' && value >= 20;
            case 'play100': return type === 'songsPlayed' && value >= 100;
            case 'play500': return type === 'songsPlayed' && value >= 500;
            case 'weekend-warrior': return ((profile.analytics?.weeklyActivity?.[0] || 0) + (profile.analytics?.weeklyActivity?.[6] || 0)) >= 7200;

            // Collection Milestones
            case 'upload1': return type === 'songsUploaded' && value >= 1;
            case 'upload10': return type === 'songsUploaded' && value >= 10;
            case 'upload50': return type === 'songsUploaded' && value >= 50;
            case 'upload250': return type === 'songsUploaded' && value >= 250;
            case 'favorite1': return librarySongs.filter(s => s.isFavorite).length >= 1;
            case 'favorite25': return librarySongs.filter(s => s.isFavorite).length >= 25;
            case 'favorite100': return librarySongs.filter(s => s.isFavorite).length >= 100;
            case 'digital-digger': return (profile.analytics.songsDownloaded || 0) >= 10;
            case 'perfectionist': return (profile.analytics.songsEdited || 0) >= 10;
            
            // Playlist & Queue
            case 'playlist1': return type === 'playlists' && value >= 1;
            case 'playlist5': return type === 'playlists' && value >= 5;
            case 'playlist10': return type === 'playlists' && value >= 10;
            case 'queue1': return type === 'queue' && value >= 1;
            case 'tastemaker': return type === 'tastemaker' && value >= 1;
            case 'tastemaker-pro': return type === 'tastemaker-pro' && value >= 1;

            // Feature Exploration
            case 'radio1': return type === 'radio' && value >= 1;
            case 'favorite-radio': return (profile.favoriteRadioStations?.length || 0) >= 1;
            case 'radio-dj': return type === 'radioPlaylists' && value >= 1;
            case 'radio-surfer': return (profile.recentlyPlayedRadios?.length || 0) >= 5;
            case 'reel1': return type === 'reels' && value >= 1;
            case 'reel10': return type === 'reels' && value >= 10;
            case 'assistant1': return type === 'assistantUses' && value >= 1;
            case 'eq-tinkerer': return !profile.settings.equalizer.bands.every(b => b === 0);
            case 'lyric-lover': return !!profile.usedFeatures.lyricsViewed;
            case 'ai-lyricist': return type === 'ai-lyricist' && value >= 1;
            case 'mood-setter': return librarySongs.filter(s => s.moodEmoji).length >= 3;
            case 'global-explorer': return (profile.favoriteRadioGenres?.length || 0) > 0 || (profile.favoriteRadioRegions?.length || 0) > 0;
            case 'wisdom-seeker': return (profile.customWisdom?.length || 0) > 0;
            case 'mood-curator': return (profile.customMoods?.length || 0) > 0;
            case 'sound-sculptor': return (profile.usedFeatures.eqPresets?.size || 0) >= 5;
            case 'rhythm-keeper': return (profile.analytics.metronomeUsageTime || 0) >= 300;
            case 'social-butterfly': return !!profile.usedFeatures.sharedSong;
            case 'the-remixer': return (profile.usedFeatures.temposChanged?.size || 0) >= 5;

            // Customization
            case 'theme-explorer': return (profile.usedFeatures.themes?.size || 0) >= 3;
            case 'font-fanatic': return (profile.usedFeatures.fonts?.size || 0) >= 3;
            case 'custom-look': return type === 'customTheme' && value >= 1;
            case 'visual-artist': return (profile.usedFeatures.visualizers?.size || 0) >= 5;
            case 'ambiance-architect': return (profile.usedFeatures.backgroundEffects?.size || 0) >= 5;


            // Time-based
            case 'morning-vibes': return type === 'morning-vibes' && value >= 1;
            case 'lunch-beats': return type === 'lunch-beats' && value >= 1;
            case 'night-owl': return type === 'night' && value >= 1;

            // Power User
            case 'power-user': return type === 'assistantUses' && value >= 10;
            case 'shuffle-master': return type === 'songsShuffled' && value >= 50;
            case 'speed-demon': return type === 'highSpeedPlayback' && value >= 1;
            case 'binge-watcher': return type === 'reelsWatched' && value >= 25;
            case 'reel-playlist-creator': return type === 'reelPlaylists' && value >= 1;
            case 'neon-dreamer': return (profile.usedFeatures.neonStyles?.size || 0) >= 3;
            case 'nameplate-artist': return (profile.usedFeatures.nameplateAnimations?.size || 0) >= 5;
            case 'theme-connoisseur': return (profile.usedFeatures.themes?.size || 0) >= 10;
            
            // Library Management
            case 'ar-scout': return type === 'ar-scout' && value >= 50;
            case 'cover-artist': return type === 'cover-artist' && value >= 1;
            case 'biographer': return type === 'biographer' && value >= 1;

            default: return false;
        }
    };
    return { ...base, criteria };
});
