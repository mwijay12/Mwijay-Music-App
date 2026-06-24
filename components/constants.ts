
import type { User, Song, Video, ThemePair, Font, Achievement, NameplateAnimation, ThemeColors, ProfileData, Playlist } from '../types.ts';

export const GEMINI_KEYS = (typeof process !== 'undefined' && process.env.GEMINI_KEYS ? process.env.GEMINI_KEYS.split(',') : []).filter(Boolean);

const defaultGradients = [
    // Original
    ['#FF6B6B', '#FFD93D'], ['#6BFFB8', '#3D7EFF'], ['#FF8C42', '#FFD32D'],
    ['#AE6BFF', '#3DFFE2'], ['#FF6B9A', '#FFD93D'], ['#42E695', '#3BB2B8'],
    ['#FFB86B', '#FF7C6B'], ['#5EEBFF', '#5E8BFF'], ['#FF5E5E', '#FF9E5E'],
    ['#43E97B', '#38F9D7'], ['#FAD961', '#F76B1C'], ['#C33764', '#1D2671'],
    ['#155799', '#159957'], ['#00C9FF', '#92FE9D'], ['#F36265', '#961276'],
    ['#EECDA3', '#EF629F'],
    // New Additions
    ['#ff9a9e', '#fecfef'], // Sweet Pink
    ['#a1c4fd', '#c2e9fb'], // Sky Blue
    ['#84fab0', '#8fd3f4'], // Aqua Marine
    ['#d4fc79', '#96e6a1'], // Lime Green
    ['#f093fb', '#f5576c'], // Fiery Fuchsia
    ['#fdfbfb', '#ebedee'], // Soft Gray
    ['#c1dfc4', '#deecdd'], // Minty Fresh
    ['#6a11cb', '#2575fc'], // Royal Blue
    ['#30cfd0', '#330867'], // Deep Indigo
    ['#f43b47', '#453a94'], // Twilight
    ['#fa709a', '#fee140'], // Sunset Orange
    ['#209cff', '#68e0cf'], // Ocean Teal
    ['#eaafc8', '#654ea3'], // Lavender Purple
    ['#ffdde1', '#ee9ca7'], // Blush Pink
    ['#f6d365', '#fda085'], // Warm Peach
];

const generateSvgDataUrl = (colors: string[]) => {
    const stops = colors.map((color, index) => 
        `<stop offset="${index * 100 / (colors.length -1)}%" stop-color="${color}" />`
    ).join('');
    
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">${stops}</linearGradient></defs><rect width="200" height="200" fill="url(#g)" /></svg>`;
    
    try {
        const base64 = btoa(unescape(encodeURIComponent(svg)));
        return `data:image/svg+xml;base64,${base64}`;
    } catch (e) {
        return '';
    }
};

export const defaultCoverArt = defaultGradients.map(generateSvgDataUrl);

export const getRandomCoverArt = () => {
    const randomGradientColors = defaultGradients[Math.floor(Math.random() * defaultGradients.length)];
    return generateSvgDataUrl(randomGradientColors);
};

export const user: User = {
    name: 'Mwijay',
    avatarUrl: getRandomCoverArt(),
};

export const FAVORITES_PLAYLIST_ID = 'favorites-playlist-mwijay-music';
export const FAVORITE_REELS_PLAYLIST_ID = 'favorite-reels-playlist-mwijay-music';


export const defaultMoods = [
    { name: 'Happy', emoji: '😊', color: 'bg-yellow-400/80 text-black', themeColor: '#FFD700' },
    { name: 'Sad', emoji: '😢', color: 'bg-blue-500/80 text-white', themeColor: '#3B82F6' },
    { name: 'Energetic', emoji: '🔥', color: 'bg-red-500/80 text-white', themeColor: '#EF4444' },
    { name: 'Chill', emoji: '❄️', color: 'bg-sky-400/80 text-white', themeColor: '#38BDF8' },
    { name: 'Dance', emoji: '🕺', color: 'bg-purple-500/80 text-white', themeColor: '#A855F7' },
    { name: 'Sleepy', emoji: '😴', color: 'bg-indigo-500/80 text-white', themeColor: '#6366F1' },
    { name: 'Worship', emoji: '🙏', color: 'bg-amber-400/80 text-black', themeColor: '#FBBF24' },
    { name: 'Party', emoji: '🎉', color: 'bg-pink-500/80 text-white', themeColor: '#EC4899' },
    { name: 'Workout', emoji: '💪', color: 'bg-red-600/80 text-white', themeColor: '#DC2626' },
    { name: 'Focus', emoji: '🤔', color: 'bg-cyan-500/80 text-white', themeColor: '#06B6D4' },
    { name: 'Cool', emoji: '😎', color: 'bg-blue-600/80 text-white', themeColor: '#2563EB' },
    { name: 'Heartbreak', emoji: '💔', color: 'bg-gray-500/80 text-white', themeColor: '#6B7280' },
];

export const TTS_VOICES = {
    female: [
        { name: 'Zephyr', description: 'Calm, soothing' },
        { name: 'Kore', description: 'Clear, youthful' },
        { name: 'Laomedeia', description: 'Gentle, melodic' },
        { name: 'Callirrhoe', description: 'Warm, engaging' },
        { name: 'Autonoe', description: 'Soft, caring' },
        { name: 'Amalthea', description: 'Bright, friendly' },
        { name: 'Eirene', description: 'Peaceful, elegant' },
        { name: 'Thebe', description: 'Confident, direct' },
    ],
    male: [
        { name: 'Puck', description: 'Friendly, upbeat' },
        { name: 'Charon', description: 'Deep, authoritative' },
        { name: 'Fenrir', description: 'Rich, resonant' },
        { name: 'Zubenelgenubi', description: 'Clear, strong' },
        { name: 'Orus', description: 'Powerful, narrative' },
        { name: 'Achernar', description: 'Crisp, professional' },
        { name: 'Fornax', description: 'Gravelly, wise' },
        { name: 'Heze', description: 'Smooth, relaxed' },
    ]
};

export const visualizers = [
    { id: 'none', name: 'None', icon: 'Ban' },
    { id: 'beat-pulse', name: 'Beat Pulse', icon: 'Activity' },
    { id: 'spectral', name: 'Spectral', icon: 'BarChart3' },
    { id: 'beat-synced-spectral', name: 'Beat Synced', icon: 'BarChart' },
    { id: 'rhythmic-grid', name: 'Rhythmic Grid', icon: 'Grid' },
    { id: 'galaxy', name: 'Galaxy', icon: 'Sparkles' },
    { id: 'tunnel', name: 'Tunnel', icon: 'Target' },
    { id: 'particles', name: 'Particles', icon: 'Atom' },
    { id: 'vortex', name: 'Vortex', icon: 'Tornado' },
    { id: 'stardust', name: 'Stardust', icon: 'Star' },
    { id: 'equalizer', name: 'Equalizer', icon: 'Sliders' },
    { id: 'flow', name: 'Flow', icon: 'Wind' },
    { id: 'neon-grid', name: 'Neon Grid', icon: 'Grid3X3' },
    { id: 'metropolis', name: 'Metropolis', icon: 'Building2' },
    { id: 'waveform', name: 'Waveform', icon: 'Waves' },
    { id: 'circular-bars', name: 'Circular Bars', icon: 'CircleDot' },
    { id: 'kaleidoscope', name: 'Kaleidoscope', icon: 'Hexagon' },
    { id: 'dna-helix', name: 'DNA Helix', icon: 'Dna' },
    { id: 'matrix-rain', name: 'Matrix Rain', icon: 'Binary' },
    { id: 'fire-storm', name: 'Fire Storm', icon: 'Flame' },
    { id: 'aurora', name: 'Aurora', icon: 'CloudLightning' },
    { id: 'digital-rain', name: 'Digital Rain', icon: 'Code' },
    { id: 'retro-wave', name: 'Retro Wave', icon: 'Mountain' },
    { id: 'serengeti-sunset', name: 'Serengeti', icon: 'Sun' },
    { id: 'kente-flow', name: 'Kente Flow', icon: 'Grid' },
    { id: 'kilimanjaro', name: 'Kilimanjaro', icon: 'MountainSnow' },
    { id: 'zanzibar-tide', name: 'Zanzibar Tide', icon: 'Waves' },
    { id: 'tribal-pulse', name: 'Tribal Pulse', icon: 'Drum' },
];

export const backgroundStyles = [
    { id: 'none', name: 'None', icon: 'Ban' },
    { id: 'constellationDrift', name: 'Constellation', icon: 'Star' },
    { id: 'spiritRise', name: 'Spirit Rise', icon: 'Feather' },
    { id: 'warpPulse', name: 'Ripple', icon: 'Target' },
    { id: 'fallingNotes', name: 'Falling Notes', icon: 'Music' },
    { id: 'cosmicDust', name: 'Cosmic Dust', icon: 'Atom' },
    { id: 'fireflies', name: 'Fireflies', icon: 'Zap' },
    { id: 'bubbles', name: 'Bubbles', icon: 'CircleDot' },
    { id: 'warpSpeed', name: 'Warp Speed', icon: 'Rocket' },
    { id: 'stardust', name: 'Stardust', icon: 'Sparkles' },
    { id: 'energyFlow', name: 'Energy Flow', icon: 'Wind' },
    { id: 'twinklingStars', name: 'Twinkle Stars', icon: 'StarHalf' },
    // Holiday Effects
    { id: 'hearts', name: 'Hearts', icon: 'Heart' },
    { id: 'christmas', name: 'Festive', icon: 'TreePine' },
    { id: 'spooky', name: 'Spooky', icon: 'Ghost' },
    { id: 'diwali', name: 'Diwali', icon: 'Flame' },
    { id: 'fireworks', name: 'Fireworks', icon: 'Sparkles' },
    { id: 'eggs', name: 'Easter', icon: 'Egg' },
    { id: 'colors', name: 'Holi', icon: 'Palette' },
    { id: 'crescents', name: 'Eid', icon: 'Moon' },
    { id: 'petals', name: 'Sakura', icon: 'Flower2' },
    { id: 'pride', name: 'Pride', icon: 'Rainbow' },
    { id: 'leaves', name: 'Harvest', icon: 'Leaf' },
    { id: 'earth', name: 'Nature', icon: 'Globe' },
    { id: 'stars_david', name: 'Hanukkah', icon: 'Star' },
    { id: 'fiesta', name: 'Fiesta', icon: 'PartyPopper' },
    { id: 'pretzels', name: 'Bavarian', icon: 'Beer' },
    { id: 'torch', name: 'Uhuru', icon: 'Flame' }, // New for Union Day / Uhuru Torch
] as const;


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
    { name: 'Click', icon: 'MousePointer2', type: 'click' },
    { name: 'Tick', icon: 'Clock', type: 'tick' },
    { name: 'Beep', icon: 'Volume2', type: 'beep' },
    { name: 'Snare', icon: 'Drum', type: 'snare' },
    { name: 'Kick', icon: 'Drum', type: 'kick' },
    { name: 'Hi-Hat', icon: 'Drum', type: 'hihat' },
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
    'Apply the Cyber Punch theme',
];

export const playlists = [
    { id: '1', name: 'Starlit Reverie', details: 'By Budiarti • 8 Songs', coverUrl: getRandomCoverArt() },
    { id: '2', name: 'Midnight Confessions', details: 'By Alex Morning', coverUrl: getRandomCoverArt() },
    { id: '3', name: 'Golden Hour Beats', details: 'By Lo-Fi Cafe', coverUrl: getRandomCoverArt() }
];

export const navItems = [
    { name: 'Home', icon: 'Home' },
    { name: 'Explore', icon: 'Compass' },
    { name: 'Library', icon: 'Music' },
    { name: 'ZenMode', icon: 'Wind' },
    { name: 'Reels', icon: 'Film' },
    { name: 'Settings', icon: 'Settings' },
];

export const videos: Video[] = [];

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
const lightThemeBase = { '--bg-color': '#F9FAFB', '--surface-color': '#FFFFFF', '--text-primary': '#000000', '--text-secondary': '#374151', '--chip-bg': '#E5E7EB', '--surface-border-color': 'rgba(17, 24, 39, 0.1)' };

// --- NEW: Vibrant Themes (Unaffected by light/dark toggle) ---
const darkVibrantThemeBase = { ...darkThemeBase, '--text-primary': '#FFFFFF', '--text-secondary': '#E0E0E0', '--chip-bg': '#2A2A2A' };
const brightVibrantThemeBase = { ...lightThemeBase, '--chip-bg': '#E0E0E0', '--surface-border-color': 'rgba(0,0,0,0.1)' };

const vibrantThemes = [
    // Dark Themes
    { name: 'Cyber Punch', theme: { ...darkVibrantThemeBase, '--bg-color': '#190028', '--surface-color': '#28003D', ...defaultColors('#F02395', '#B823F0', '#FF00E5') } },
    { name: 'Tidal Rush', theme: { ...darkVibrantThemeBase, '--bg-color': '#012A4A', '--surface-color': '#013A63', ...defaultColors('#468FAF', '#2C7DA0', '#A9D6E5') } },
    { name: 'Nebula Haze', theme: { ...darkVibrantThemeBase, '--bg-color': '#00001D', '--surface-color': '#111133', ...defaultColors('#9D4EDD', '#5A189A', '#C77DFF') } },
    { name: 'Retrograde', theme: { ...darkVibrantThemeBase, '--bg-color': '#0F2027', '--surface-color': '#203A43', ...defaultColors('#1488CC', '#2B32B2', '#FF5F6D') } },
    { name: 'Crimson Bloom', theme: { ...darkVibrantThemeBase, '--bg-color': '#2A0000', '--surface-color': '#410000', ...defaultColors('#E63946', '#F1FAEE', '#A8DADC') } },
    { name: 'Emerald Tablet', theme: { ...darkVibrantThemeBase, '--bg-color': '#011F11', '--surface-color': '#02301A', ...defaultColors('#00A86B', '#50C878', '#A7D7C5') } },
    { name: 'Electric Lime', theme: { ...darkVibrantThemeBase, '--bg-color': '#0A1A0A', '--surface-color': '#142E14', ...defaultColors('#CCFF00', '#99CC00', '#669900') } },
    { name: 'Hyper Violet', theme: { ...darkVibrantThemeBase, '--bg-color': '#120024', '--surface-color': '#240048', ...defaultColors('#BF00FF', '#8F00BF', '#DF80FF') } },
    { name: 'Cyber Yellow', theme: { ...darkVibrantThemeBase, '--bg-color': '#1A1A00', '--surface-color': '#333300', ...defaultColors('#FFFF00', '#FFCC00', '#CC9900') } },

    // Bright Themes
    { name: 'Kiwi Kick', theme: { ...brightVibrantThemeBase, '--bg-color': '#F0FFF0', '--surface-color': '#FFFFFF', '--text-primary': '#142101', '--text-secondary': '#253802', ...defaultColors('#9EF01A', '#70E000', '#BEF264') } },
    { name: 'Solar Flare', theme: { ...brightVibrantThemeBase, '--bg-color': '#FFF8E1', '--surface-color': '#FFFFFF', '--text-primary': '#3D0000', '--text-secondary': '#5C0000', ...defaultColors('#FF8C00', '#FF4500', '#FFD700') } },
    { name: 'Mango Tango', theme: { ...brightVibrantThemeBase, '--bg-color': '#FFF0E5', '--surface-color': '#FFFFFF', '--text-primary': '#3D1B00', '--text-secondary': '#5C2A00', ...defaultColors('#FF8C42', '#FF477E', '#FFD32D') } },
    { name: 'Glacier Mint', theme: { ...brightVibrantThemeBase, '--bg-color': '#F0FFFF', '--surface-color': '#FFFFFF', '--text-primary': '#002821', '--text-secondary': '#003D32', ...defaultColors('#6BFFB8', '#3DFFE2', '#A6FFF2') } },
    { name: 'Electric Coral', theme: { ...brightVibrantThemeBase, '--bg-color': '#FFF5F5', '--surface-color': '#FFFFFF', '--text-primary': '#001D28', '--text-secondary': '#002E40', ...defaultColors('#FF6B6B', '#4ECDC4', '#FFD166') } },
    { name: 'Gilded Gold', theme: { ...brightVibrantThemeBase, '--bg-color': '#FFFDF5', '--surface-color': '#FFFFFF', '--text-primary': '#3A3A3A', '--text-secondary': '#5A5A5A', ...defaultColors('#FFD700', '#F0E68C', '#BDB76B') } },
    { name: 'Hot Pink', theme: { ...brightVibrantThemeBase, '--bg-color': '#FFF0F5', '--surface-color': '#FFFFFF', '--text-primary': '#4D0026', '--text-secondary': '#800040', ...defaultColors('#FF69B4', '#FF1493', '#C71585') } },
    { name: 'Azure Sky', theme: { ...brightVibrantThemeBase, '--bg-color': '#F0F8FF', '--surface-color': '#FFFFFF', '--text-primary': '#002244', '--text-secondary': '#004488', ...defaultColors('#007FFF', '#00BFFF', '#1E90FF') } },
    { name: 'Lime Zest', theme: { ...brightVibrantThemeBase, '--bg-color': '#F9FFF0', '--surface-color': '#FFFFFF', '--text-primary': '#224400', '--text-secondary': '#448800', ...defaultColors('#BFFF00', '#76FF03', '#64DD17') } },
].map(t => ({ name: t.name, category: 'Vibrant', light: t.theme, dark: t.theme }));

// --- UPDATED: Theme definitions for Dark and Light categories ---
const defaultDarkTheme = { ...darkThemeBase, ...defaultColors('#C8F052', '#A050FF', '#6955FF') };
const defaultLightTheme = { ...lightThemeBase, ...defaultColors('#C8F052', '#A050FF', '#6955FF') };
const midnightBlueTheme = { ...darkThemeBase, '--bg-color': '#012a4a', ...defaultColors('#2c7da0', '#89c2d9', '#a9d6e5') };
const forestGreenTheme = { ...darkThemeBase, '--bg-color': '#1b4332', ...defaultColors('#40916c', '#74c69d', '#b7e4c7') };
const draculaTheme = { ...darkThemeBase, '--bg-color': '#282a36', '--surface-color': '#44475a', ...defaultColors('#bd93f9', '#ff79c6', '#f1fa8c') };
const rubyEmberTheme = { ...darkThemeBase, '--bg-color': '#2A0813', '--surface-color': '#411520', ...defaultColors('#FF4747', '#FF7B54', '#FFB26B') };
const amethystNightTheme = { ...darkThemeBase, '--bg-color': '#19172B', '--surface-color': '#272442', ...defaultColors('#D087F2', '#F287C8', '#F2A487') };
const abyssalVoidTheme = { ...darkThemeBase, '--bg-color': '#000000', '--surface-color': '#111111', ...defaultColors('#FFFFFF', '#CCCCCC', '#999999') };
const obsidianTheme = { ...darkThemeBase, '--bg-color': '#1C1C1C', '--surface-color': '#2E2E2E', ...defaultColors('#50E3C2', '#4A90E2', '#BD10E0') };
const deepSpaceTheme = { ...darkThemeBase, '--bg-color': '#0B0D17', '--surface-color': '#15192B', ...defaultColors('#FF0099', '#493240', '#FF6600') };
const charcoalMistTheme = { ...darkThemeBase, '--bg-color': '#2C2C2C', '--surface-color': '#3A3A3A', ...defaultColors('#A9A9A9', '#D3D3D3', '#808080') };
const midnightSlateTheme = { ...darkThemeBase, '--bg-color': '#2F4F4F', '--surface-color': '#3D6666', ...defaultColors('#708090', '#778899', '#B0C4DE') };
const eclipseTheme = { ...darkThemeBase, '--bg-color': '#050505', '--surface-color': '#141414', ...defaultColors('#FFFFFF', '#F0F0F0', '#E0E0E0') };


const skyBlueTheme = { ...lightThemeBase, ...defaultColors('#00b4d8', '#48cae4', '#023e8a') };
const mintGreenTheme = { ...lightThemeBase, ...defaultColors('#00a896', '#06d6a0', '#013220') };
const sunshineTheme = { ...lightThemeBase, ...defaultColors('#ffbe0b', '#ffca3a', '#141100') };
const peachSorbetTheme = { ...lightThemeBase, '--bg-color': '#FFF5F0', ...defaultColors('#FFB3A7', '#FF8B80', '#FFDAB9') };
const springMeadowTheme = { ...lightThemeBase, '--bg-color': '#F6FFF8', ...defaultColors('#A8E6CF', '#DCEDC1', '#FFD3B6') };
const lavenderMistTheme = { ...lightThemeBase, '--bg-color': '#F3E5F5', ...defaultColors('#AB47BC', '#E1BEE7', '#8E24AA') };
const arcticIceTheme = { ...lightThemeBase, '--bg-color': '#E0F7FA', ...defaultColors('#00BCD4', '#B2EBF2', '#0097A7') };
const cottonCandyTheme = { ...lightThemeBase, '--bg-color': '#FFEBEE', '--text-primary': '#880E4F', '--text-secondary': '#C2185B', ...defaultColors('#FF80AB', '#FFCDD2', '#F50057') };
const paperWhiteTheme = { ...lightThemeBase, '--bg-color': '#FFFFFF', '--surface-color': '#F5F5F5', '--text-primary': '#000000', '--text-secondary': '#333333', ...defaultColors('#000000', '#333333', '#666666') };
const creamLatteTheme = { ...lightThemeBase, '--bg-color': '#FFFDD0', '--surface-color': '#FDF5E6', '--text-primary': '#4B3621', '--text-secondary': '#6F4E37', ...defaultColors('#D2691E', '#8B4513', '#A0522D') };
const softLilacTheme = { ...lightThemeBase, '--bg-color': '#E6E6FA', '--surface-color': '#F0F0FF', '--text-primary': '#483D8B', '--text-secondary': '#6A5ACD', ...defaultColors('#9370DB', '#BA55D3', '#8A2BE2') };

// --- HOLIDAY THEMES (15 total, including Tanzanian) ---
const holidayBase = { ...darkVibrantThemeBase };
const holidayThemes = [
    { name: "Valentine's Day", theme: { ...holidayBase, '--bg-color': '#3D0011', '--surface-color': '#5E001A', '--font-family': "'Great Vibes', cursive", ...defaultColors('#FF1493', '#FF69B4', '#FFB6C1') }, effect: 'hearts' },
    { name: "Christmas", theme: { ...holidayBase, '--bg-color': '#0B2910', '--surface-color': '#1A4D23', '--font-family': "'Mountains of Christmas', serif", ...defaultColors('#C62828', '#2E7D32', '#FFD700') }, effect: 'christmas' },
    { name: "Eid", theme: { ...holidayBase, '--bg-color': '#001F17', '--surface-color': '#003D2E', '--font-family': "'Amiri', serif", ...defaultColors('#00A86B', '#FFD700', '#C0C0C0') }, effect: 'crescents' },
    { name: "Saba Saba", theme: { ...holidayBase, '--bg-color': '#002244', '--surface-color': '#003366', '--font-family': "'Bebas Neue', sans-serif", ...defaultColors('#00A5E3', '#FFD700', '#FFFFFF') }, effect: 'fireworks' }, // Tanzanian Trade Fair (Blue/Yellow)
    { name: "Nane Nane", theme: { ...holidayBase, '--bg-color': '#1B4332', '--surface-color': '#2D6A4F', '--font-family': "'Quicksand', sans-serif", ...defaultColors('#95D5B2', '#D8F3DC', '#40916C') }, effect: 'leaves' }, // Farmers Day (Green)
    { name: "Union Day", theme: { ...holidayBase, '--bg-color': '#0D1B2A', '--surface-color': '#1B263B', '--font-family': "'Ruslan Display', cursive", ...defaultColors('#1E90FF', '#FFD700', '#008000') }, effect: 'torch' }, // Tanzanian Union (Flag Colors)
    { name: "Nyerere Day", theme: { ...holidayBase, '--bg-color': '#2F1B25', '--surface-color': '#4A2C3A', '--font-family': "'Playfair Display', serif", ...defaultColors('#D4AF37', '#A9A9A9', '#FFFFFF') }, effect: 'stars_david' }, // Respectful, Gold/Silver
    { name: "New Year", theme: { ...holidayBase, '--bg-color': '#000000', '--surface-color': '#111111', '--font-family': "'Cinzel Decorative', cursive", ...defaultColors('#FFD700', '#C0C0C0', '#FFFFFF') }, effect: 'fireworks' },
    { name: "Easter", theme: { ...brightVibrantThemeBase, '--bg-color': '#FFF0F5', '--surface-color': '#FFFFFF', '--font-family': "'Fredoka', sans-serif", ...defaultColors('#FFB6C1', '#87CEEB', '#98FB98') }, effect: 'eggs' },
    { name: "Halloween", theme: { ...holidayBase, '--bg-color': '#1A0500', '--surface-color': '#2E0E05', '--font-family': "'Nosifer', sans-serif", ...defaultColors('#FF6D00', '#4A148C', '#000000') }, effect: 'spooky' },
    { name: "Diwali", theme: { ...holidayBase, '--bg-color': '#1A0033', '--surface-color': '#2E005E', '--font-family': "'Cinzel', serif", ...defaultColors('#FFD700', '#FF4500', '#9400D3') }, effect: 'diwali' },
    { name: "Mothers Day", theme: { ...brightVibrantThemeBase, '--bg-color': '#FFF5EE', '--surface-color': '#FFFFFF', '--font-family': "'Dancing Script', cursive", ...defaultColors('#FF69B4', '#FFB7C5', '#FFC0CB') }, effect: 'petals' },
    { name: "Fathers Day", theme: { ...darkVibrantThemeBase, '--bg-color': '#1C2331', '--surface-color': '#2E3B55', '--font-family': "'Roboto Slab', serif", ...defaultColors('#4682B4', '#B0C4DE', '#778899') }, effect: 'energyFlow' },
    { name: "Independence", theme: { ...holidayBase, '--bg-color': '#002147', '--surface-color': '#003366', '--font-family': "'Bricolage Grotesque', sans-serif", ...defaultColors('#00A86B', '#FCD116', '#0077C8') }, effect: 'fireworks' }, // TZ Flag colors
    { name: "Revolution", theme: { ...holidayBase, '--bg-color': '#2A0808', '--surface-color': '#470E0E', '--font-family': "'Oswald', sans-serif", ...defaultColors('#FF0000', '#FFFFFF', '#000000') }, effect: 'fireworks' }, // Zanzibar Revolution
].map(t => ({ name: t.name, category: 'Holiday', light: t.theme, dark: t.theme, effect: t.effect }));


// Explicitly export individual themes for direct access
export const morningTheme: ThemeColors = { ...lightThemeBase, '--bg-color': '#FFF3E0', ...defaultColors('#FFA726', '#FFCA28', '#81D4FA') };
export const middayTheme: ThemeColors = { ...lightThemeBase, '--bg-color': '#E3F2FD', ...defaultColors('#42A5F5', '#1976D2', '#90CAF9') };
export const eveningTheme: ThemeColors = { ...darkThemeBase, '--bg-color': '#1A237E', ...defaultColors('#FF8A65', '#D84315', '#F4511E') };
export const earlyNightTheme: ThemeColors = { ...darkThemeBase, '--bg-color': '#0D1B2A', ...defaultColors('#9575CD', '#5E35B1', '#311B92') };
export const midnightTheme: ThemeColors = { ...darkThemeBase, '--bg-color': '#011627', ...defaultColors('#6A0DAD', '#8338EC', '#A86ADD') };
export const lateNightTheme: ThemeColors = { ...darkThemeBase, '--bg-color': '#000000', ...defaultColors('#4A4E69', '#22223B', '#9A8C98') };

export const themePairs: ThemePair[] = [
    ...vibrantThemes,
    ...holidayThemes,
    
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
    { name: 'Tropical Paradise', category: 'Colorful',
        light: { ...lightThemeBase, '--bg-color': '#E0FFFF', ...defaultColors('#00CED1', '#FFA500', '#FF4500') },
        dark: { ...darkThemeBase, '--bg-color': '#002222', ...defaultColors('#20B2AA', '#FF8C00', '#FF6347') } },
    { name: 'Berry Blast', category: 'Colorful',
        light: { ...lightThemeBase, '--bg-color': '#FFE6F2', ...defaultColors('#C71585', '#8B008B', '#FF1493') },
        dark: { ...darkThemeBase, '--bg-color': '#290014', ...defaultColors('#FF69B4', '#DA70D6', '#C71585') } },
    { name: 'Aurora Borealis', category: 'Colorful',
        light: { ...lightThemeBase, '--bg-color': '#F0FFF0', ...defaultColors('#00FA9A', '#00BFFF', '#1E90FF') },
        dark: { ...darkThemeBase, '--bg-color': '#001133', ...defaultColors('#00FF7F', '#00CED1', '#4169E1') } },
    
    // --- Dark Themes (always dark) ---
    { name: 'Default Dark', category: 'Dark', light: defaultDarkTheme, dark: defaultDarkTheme },
    { name: 'Midnight Blue', category: 'Dark', light: midnightBlueTheme, dark: midnightBlueTheme },
    { name: 'Forest Green', category: 'Dark', light: forestGreenTheme, dark: forestGreenTheme },
    { name: 'Dracula', category: 'Dark', light: draculaTheme, dark: draculaTheme },
    { name: 'Ruby Ember', category: 'Dark', light: rubyEmberTheme, dark: rubyEmberTheme },
    { name: 'Amethyst Night', category: 'Dark', light: amethystNightTheme, dark: amethystNightTheme },
    { name: 'Abyssal Void', category: 'Dark', light: abyssalVoidTheme, dark: abyssalVoidTheme },
    { name: 'Obsidian', category: 'Dark', light: obsidianTheme, dark: obsidianTheme },
    { name: 'Deep Space', category: 'Dark', light: deepSpaceTheme, dark: deepSpaceTheme },
    { name: 'Charcoal Mist', category: 'Dark', light: charcoalMistTheme, dark: charcoalMistTheme },
    { name: 'Midnight Slate', category: 'Dark', light: midnightSlateTheme, dark: midnightSlateTheme },
    { name: 'Eclipse', category: 'Dark', light: eclipseTheme, dark: eclipseTheme },

    // --- Light Themes (always light) ---
    { name: 'Default Light', category: 'Light', light: defaultLightTheme, dark: defaultLightTheme },
    { name: 'Sky Blue', category: 'Light', light: skyBlueTheme, dark: skyBlueTheme },
    { name: 'Mint Green', category: 'Light', light: mintGreenTheme, dark: mintGreenTheme },
    { name: 'Sunshine', category: 'Light', light: sunshineTheme, dark: sunshineTheme },
    { name: 'Peach Sorbet', category: 'Light', light: peachSorbetTheme, dark: peachSorbetTheme },
    { name: 'Spring Meadow', category: 'Light', light: springMeadowTheme, dark: springMeadowTheme },
    { name: 'Lavender Mist', category: 'Light', light: lavenderMistTheme, dark: lavenderMistTheme },
    { name: 'Arctic Ice', category: 'Light', light: arcticIceTheme, dark: arcticIceTheme },
    { name: 'Cotton Candy', category: 'Light', light: cottonCandyTheme, dark: cottonCandyTheme },
    { name: 'Paper White', category: 'Light', light: paperWhiteTheme, dark: paperWhiteTheme },
    { name: 'Cream Latte', category: 'Light', light: creamLatteTheme, dark: creamLatteTheme },
    { name: 'Soft Lilac', category: 'Light', light: softLilacTheme, dark: softLilacTheme },
];

export const themeCounterparts: { [key: string]: string } = {
    // Dark <-> Light
    'Default Dark': 'Default Light',
    'Default Light': 'Default Dark',
    'Midnight Blue': 'Sky Blue',
    'Sky Blue': 'Midnight Blue',
    'Forest Green': 'Mint Green',
    'Mint Green': 'Forest Green',
    'Dracula': 'Peach Sorbet',
    'Peach Sorbet': 'Dracula',
    'Ruby Ember': 'Sunshine',
    'Sunshine': 'Ruby Ember',
    'Amethyst Night': 'Spring Meadow',
    'Spring Meadow': 'Amethyst Night',
    'Abyssal Void': 'Lavender Mist',
    'Lavender Mist': 'Abyssal Void',
    'Obsidian': 'Arctic Ice',
    'Arctic Ice': 'Obsidian',
    'Deep Space': 'Cotton Candy',
    'Cotton Candy': 'Deep Space',
    'Charcoal Mist': 'Paper White',
    'Paper White': 'Charcoal Mist',
    'Midnight Slate': 'Cream Latte',
    'Cream Latte': 'Midnight Slate',
    'Eclipse': 'Soft Lilac',
    'Soft Lilac': 'Eclipse',
    
    // Vibrant Dark <-> Vibrant Bright
    'Cyber Punch': 'Electric Coral',
    'Electric Coral': 'Cyber Punch',
    'Tidal Rush': 'Glacier Mint',
    'Glacier Mint': 'Tidal Rush',
    'Nebula Haze': 'Mango Tango',
    'Mango Tango': 'Nebula Haze',
    'Retrograde': 'Solar Flare',
    'Solar Flare': 'Retrograde',
    'Crimson Bloom': 'Kiwi Kick',
    'Kiwi Kick': 'Crimson Bloom',
    'Emerald Tablet': 'Gilded Gold',
    'Gilded Gold': 'Emerald Tablet',
    'Electric Lime': 'Hot Pink',
    'Hot Pink': 'Electric Lime',
    'Hyper Violet': 'Azure Sky',
    'Azure Sky': 'Hyper Violet',
    'Cyber Yellow': 'Lime Zest',
    'Lime Zest': 'Cyber Yellow',
};

export const fonts: Font[] = [
    { name: 'System Default', family: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'", category: 'System' },
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
    { name: 'Roboto Slab', family: "'Roboto Slab', serif", category: 'Elegant' },

    // Handwriting (Script)
    { name: 'Dancing Script', family: "'Dancing Script', cursive", category: 'Handwriting' },
    { name: 'Lobster', family: "'Lobster', cursive", category: 'Handwriting' },
    { name: 'Caveat', family: "'Caveat', cursive", category: 'Handwriting' },
    { name: 'Pacifico', family: "'Pacifico', cursive", category: 'Handwriting' },
    { name: 'Permanent Marker', family: "'Permanent Marker', cursive", category: 'Handwriting' },
    { name: 'Great Vibes', family: "'Great Vibes', cursive", category: 'Handwriting' },
    { name: 'Cinzel', family: "'Cinzel', serif", category: 'Handwriting' },
    { name: 'Cinzel Decorative', family: "'Cinzel Decorative', cursive", category: 'Handwriting' },
    
    // Monospace
    { name: 'Roboto Mono', family: "'Roboto Mono', monospace", category: 'Monospace' },
    { name: 'JetBrains Mono', family: "'JetBrains Mono', monospace", category: 'Monospace' },
    
    // Playful (Display)
    { name: 'Oswald', family: "'Oswald', sans-serif", category: 'Playful' },
    { name: 'Bebas Neue', family: "'Bebas Neue', sans-serif", category: 'Playful' },
    { name: 'Press Start 2P', family: "'Press Start 2P', cursive", category: 'Playful' },
    { name: 'Fredoka', family: "'Fredoka', sans-serif", category: 'Playful' },
    { name: 'Nosifer', family: "'Nosifer', cursive", category: 'Playful' },
    { name: 'Ruslan Display', family: "'Ruslan Display', cursive", category: 'Playful' },
    { name: 'Uncial Antiqua', family: "'Uncial Antiqua', serif", category: 'Playful' },
    { name: 'Amiri', family: "'Amiri', serif", category: 'Playful' },
    { name: 'Zen Antique', family: "'Zen Antique', serif", category: 'Playful' },
    { name: 'Kanit', family: "'Kanit', sans-serif", category: 'Playful' },
    { name: 'Quicksand', family: "'Quicksand', sans-serif", category: 'Playful' },
    { name: 'Miriam Libre', family: "'Miriam Libre', sans-serif", category: 'Playful' },
];

export const calligraphyFonts = [
    'Dancing Script', 'Lobster', 'Caveat', 'Pacifico', 'Permanent Marker'
];

export const nameplateAnimations: NameplateAnimation[] = [
    { id: 'none', name: 'None' },
    { id: 'fade-in', name: 'Fade In' },
    { id: 'typewriter', name: 'Typewriter' },
    { id: 'slide-in-left', name: 'Slide Left' },
    { id: 'slide-up', name: 'Slide Up' },
    { id: 'zoom-in', name: 'Zoom In' },
    { id: 'bounce-in', name: 'Bounce' },
    { id: 'blur-in', name: 'Blur In' },
    { id: 'flip-in-x', name: 'Flip' },
    { id: 'rotate-in', name: 'Rotate' },
    { id: 'pulse', name: 'Pulse' },
    { id: 'wavy', name: 'Wavy' },
    { id: 'shadow-pop', name: 'Shadow Pop' },
    { id: 'color-cycle', name: 'Color Cycle' },
    { id: 'neon-glow', name: 'Neon' },
    { id: 'glitch', name: 'Glitch' },
    { id: 'matrix', name: 'Matrix' },
    { id: 'fire', name: 'Fire' },
    { id: 'disco', name: 'Disco' },
    { id: 'text-rotate', name: 'Text Rotate' },
    { id: 'gradient-shift', name: 'Gradient Shift' },
];

export const simpleModeTopics = [
    { id: 'inspirational', name: 'Inspirational' },
    { id: 'science', name: 'Science Facts' },
    { id: 'history', name: 'History' },
    { id: 'music', name: 'Music Facts' },
    { id: 'philosophy', name: 'Philosophy' },
    { id: 'tech', name: 'Technology' },
    { id: 'nature', name: 'Nature Facts' },
    { id: 'lifehacks', name: 'Life Hacks' },
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
    { id: 'listen10min', name: 'Getting Started', description: 'Listen for 10 minutes.', icon: 'Headphones', emoji: '🎧' },
    { id: 'listen1hour', name: 'Dedicated Listener', description: 'Listen for a full hour.', icon: 'Clock', emoji: '🕰️' },
    { id: 'listen5hours', name: 'Audiophile', description: 'Listen for 5 hours.', icon: 'Headphones', emoji: '🤯' },
    { id: 'listen24hours', name: '24-Hour Party Person', description: 'Accumulate 24 hours of listening time.', icon: 'CalendarDays', emoji: '🥳' },
    { id: 'marathon', name: 'Marathon', description: 'Listen to a song longer than 10 minutes.', icon: 'Timer', emoji: '🏃' },
    { id: 'short_attention', name: 'Short Attention Span', description: 'Listen to 10 songs for less than 30 seconds each.', icon: 'Zap', emoji: '⚡' },
    { id: 'play20', name: 'DJ in the Making', description: 'Play 20 songs in total.', icon: 'Play', emoji: '🎚️' },
    { id: 'play100', name: 'Serial Listener', description: 'Play 100 songs.', icon: 'SkipForward', emoji: '💯' },
    { id: 'play500', name: 'Music Junkie', description: 'Play 500 songs.', icon: 'Disc', emoji: '中毒' },
    { id: 'play1000', name: 'Vinyl Veteran', description: 'Play 1,000 songs.', icon: 'Disc3', emoji: '📼' },
    { id: 'all_nighter', name: 'All Nighter', description: 'Listen to music between 2 AM and 5 AM.', icon: 'Moon', emoji: '🦉' },
    { id: 'early_bird', name: 'Early Bird', description: 'Listen to music between 5 AM and 7 AM.', icon: 'Sunrise', emoji: '🌅' },
    { id: 'streaker', name: 'Streaker', description: 'Listen to music 3 days in a row.', icon: 'Flame', emoji: '🔥' },
    { id: 'super_streaker', name: 'Super Streaker', description: 'Listen to music 7 days in a row.', icon: 'Comet', emoji: '☄️' },

    // Collection Milestones
    { id: 'upload1', name: 'Collector', description: 'Upload your first song.', icon: 'Upload', emoji: '📥' },
    { id: 'upload10', name: 'Archivist', description: 'Upload 10 songs.', icon: 'Archive', emoji: '📦' },
    { id: 'upload50', name: 'Librarian', description: 'Upload 50 songs.', icon: 'BookOpen', emoji: '📚' },
    { id: 'upload250', name: 'Music Hoarder', description: 'Your collection has 250 songs.', icon: 'Warehouse', emoji: '🗄️' },
    { id: 'upload1000', name: 'The Curator', description: 'Your collection has 1,000 songs.', icon: 'Landmark', emoji: '🏛️' },
    { id: 'favorite1', name: 'First Love', description: 'Favorited a song.', icon: 'Heart', emoji: '❤️' },
    { id: 'favorite25', name: 'Heart Collector', description: 'Favorite 25 songs.', icon: 'Heart', emoji: '💖' },
    { id: 'favorite100', name: 'True Romantic', description: 'Favorite 100 songs.', icon: 'Heart', emoji: '💘' },
    { id: 'diverse_taste', name: 'Diverse Taste', description: 'Have songs from 20 different artists in your library.', icon: 'Globe', emoji: '🌍' },

    // Feature Usage
    { id: 'create_playlist', name: 'Mix Master', description: 'Create your first playlist.', icon: 'Disc', emoji: '💿' },
    { id: 'create_5_playlists', name: 'Playlist Pro', description: 'Create 5 different playlists.', icon: 'Layers', emoji: '💽' },
    { id: 'use_assistant_5', name: 'Getting Acquainted', description: 'Use the assistant 5 times.', icon: 'Brain', emoji: '🤖' },
    { id: 'use_assistant_25', name: 'Power User', description: 'Use the assistant 25 times.', icon: 'Zap', emoji: '⚡' },
    { id: 'use_assistant_100', name: 'AI Companion', description: 'Use the assistant 100 times.', icon: 'UserCircle', emoji: '🧑‍🚀' },
    { id: 'change_theme_3', name: 'Interior Designer', description: 'Try 3 different themes.', icon: 'Palette', emoji: '🎨' },
    { id: 'change_theme_10', name: 'Chameleon', description: 'Try 10 different themes.', icon: 'SwatchBook', emoji: '🌈' },
    { id: 'change_font_3', name: 'Typographer', description: 'Try 3 different fonts.', icon: 'Type', emoji: '✒️' },
    { id: 'lyric_lover', name: 'Lyric Lover', description: 'View lyrics for a song.', icon: 'Feather', emoji: '📜' },
    { id: 'lyric_editor', name: 'Lyric Editor', description: 'Edit the lyrics for a song.', icon: 'PenBox', emoji: '📝' },
    { id: 'use_eq', name: 'Sound Sculptor', description: 'Use the equalizer.', icon: 'Sliders', emoji: '🎛️' },
    { id: 'share_song', name: 'Social Butterfly', description: 'Share a song preview.', icon: 'Share2', emoji: '🦋' },
    { id: 'watch_5_reels', name: 'Reel Enthusiast', description: 'Watch 5 Mwijay Reels.', icon: 'Film', emoji: '🎬' },
    { id: 'watch_50_reels', name: 'Binge Watcher', description: 'Watch 50 Mwijay Reels.', icon: 'Clapperboard', emoji: '🍿' },
    { id: 'ai-art-director', name: 'AI Art Director', description: 'Generate your first AI cover art.', icon: 'Sparkles', emoji: '🧑‍🎨' },
    { id: 'sound_architect', name: 'Sound Architect', description: 'Try 3 different EQ presets.', icon: 'Construction', emoji: '👷' },
    { id: 'tempo_tinkerer', name: 'Tempo Tinkerer', description: 'Change the playback speed of 3 different songs.', icon: 'Gauge', emoji: '🏎️' },
    { id: 'biographer', name: 'Biographer', description: 'Edit an artist\'s profile for the first time.', icon: 'PenTool', emoji: '✍️' },
    { id: 'radio_surfer', name: 'Radio Surfer', description: 'Favorite 5 radio stations.', icon: 'TowerControl', emoji: '📡' },
    { id: 'world_traveler', name: 'World Traveler', description: 'Listen to radio stations from 5 different countries.', icon: 'Globe2', emoji: '🗺️' },
    { id: 'shuffler', name: 'Shuffler', description: 'Shuffle your music 20 times.', icon: 'Shuffle', emoji: '🎲' },
    { id: 'mood_setter', name: 'Mood Setter', description: 'Set a mood for 5 different songs.', icon: 'Smile', emoji: '😊' },
    { id: 'sleepy_head', name: 'Sleepy Head', description: 'Use the sleep timer.', icon: 'Bed', emoji: '😴' },
    { id: 'ringtone_maker', name: 'Ringtone Maker', description: 'Create your first ringtone.', icon: 'Bell', emoji: '🔔' },
    { id: 'quiz_master', name: 'Quiz Master', description: 'Reach Level 10 in the Music Quiz.', icon: 'GraduationCap', emoji: '🎓' },

    // Discovery
    { id: 'discover_online', name: 'Explorer', description: 'Download a song from an online source.', icon: 'Compass', emoji: '🧭' },
    { id: 'discover_10_online', name: 'Digital Digger', description: 'Download 10 songs from online sources.', icon: 'Search', emoji: '🔎' },
    { id: 'listen_radio', name: 'On The Air', description: 'Listen to a radio station for 5 minutes.', icon: 'Radio', emoji: '📻' },

    // Hidden / Easter Eggs
    { id: 'secret_handshake', name: 'Secret Handshake', description: 'Find the developer credits.', icon: 'Handshake', emoji: '🤝' },
    { id: 'inspector', name: 'Inspector', description: 'Open the song details for 10 songs.', icon: 'ZoomIn', emoji: '🕵️' },
    { id: 'perfectionist', name: 'Perfectionist', description: 'Edit the details of 5 songs.', icon: 'Ruler', emoji: '📐' },
    { id: 'the_creator', name: 'The Creator', description: 'Use the AI Lyric & Cover Studio.', icon: 'Wand2', emoji: '🧙' },
    { id: 'simple_life', name: 'Simple Life', description: 'Use Simple Mode for 15 minutes.', icon: 'Leaf', emoji: '🧘' },
    { id: 'vibe_master', name: 'Vibe Master', description: 'Add a custom mood.', icon: 'PlusCircle', emoji: '✨' },
    { id: 'philosopher', name: 'Philosopher', description: 'Add a custom wisdom.', icon: 'BookOpen', emoji: '🧐' },
    { id: 'visual_artist', name: 'Visual Artist', description: 'Try 5 different visualizers.', icon: 'Eye', emoji: '👁️' },
    { id: 'visual_master', name: 'Visual Master', description: 'Try 15 different visualizers.', icon: 'Eye', emoji: '🎭' },
    { id: 'bpm_tapper', name: 'BPM Tapper', description: 'Use the tap-to-BPM feature in the Metronome.', icon: 'Hand', emoji: '👆' },
    { id: 'time_bender', name: 'Time Bender', description: 'Use the A-B loop feature.', icon: 'Repeat', emoji: '🔄' },
];


const XP_MAP: Record<string, number> = {
    listen10min: 20,
    listen1hour: 100,
    listen5hours: 300,
    listen24hours: 1000,
    marathon: 150,
    short_attention: 50,
    play20: 50,
    play100: 200,
    play500: 500,
    play1000: 1000,
    all_nighter: 100,
    early_bird: 100,
    streaker: 150,
    super_streaker: 300,
    upload1: 30,
    upload10: 100,
    upload50: 250,
    upload250: 500,
    upload1000: 1500,
    favorite1: 20,
    favorite25: 100,
    favorite100: 300,
    diverse_taste: 250,
    create_playlist: 50,
    create_5_playlists: 200,
    use_assistant_5: 50,
    use_assistant_25: 150,
    use_assistant_100: 500,
    change_theme_3: 30,
    change_theme_10: 100,
    change_font_3: 30,
    lyric_lover: 20,
    lyric_editor: 50,
    use_eq: 30,
    share_song: 50,
    watch_5_reels: 50,
    watch_50_reels: 300,
    'ai-art-director': 100,
    sound_architect: 100,
    tempo_tinkerer: 100,
    biographer: 50,
    radio_surfer: 100,
    world_traveler: 300,
    shuffler: 100,
    mood_setter: 100,
    sleepy_head: 50,
    ringtone_maker: 100,
    quiz_master: 250,
    discover_online: 50,
    discover_10_online: 250,
    listen_radio: 100,
    secret_handshake: 200,
    inspector: 100,
    perfectionist: 100,
    the_creator: 200,
    simple_life: 150,
    vibe_master: 100,
    philosopher: 100,
    visual_artist: 100,
    visual_master: 300,
    bpm_tapper: 50,
    time_bender: 50
};

export const achievements: Achievement[] = BASE_ACHIEVEMENTS.map(ach => ({
    ...ach,
    xpReward: XP_MAP[ach.id] || 50,
    criteria: (profile: ProfileData & { librarySongs: Song[], playlists: Playlist[] }, type: string, value: any) => {
        const analytics = profile.analytics;
        switch(ach.id) {
            case 'listen10min': return type === 'profileUpdate' && (analytics.listenTime || 0) >= 600;
            case 'listen1hour': return type === 'profileUpdate' && (analytics.listenTime || 0) >= 3600;
            case 'listen5hours': return type === 'profileUpdate' && (analytics.listenTime || 0) >= 18000;
            case 'listen24hours': return type === 'profileUpdate' && (analytics.listenTime || 0) >= 86400;
            case 'play20': return type === 'profileUpdate' && (analytics.songsPlayed || 0) >= 20;
            case 'play100': return type === 'profileUpdate' && (analytics.songsPlayed || 0) >= 100;
            case 'play500': return type === 'profileUpdate' && (analytics.songsPlayed || 0) >= 500;
            case 'play1000': return type === 'profileUpdate' && (analytics.songsPlayed || 0) >= 1000;
            case 'upload1': return type === 'profileUpdate' && (analytics.songsUploaded || 0) >= 1;
            case 'upload10': return type === 'profileUpdate' && (analytics.songsUploaded || 0) >= 10;
            case 'upload50': return type === 'profileUpdate' && (analytics.songsUploaded || 0) >= 50;
            case 'upload250': return profile.librarySongs.length >= 250;
            case 'upload1000': return profile.librarySongs.length >= 1000;
            case 'favorite1': return type === 'favorite1' && value >= 1;
            case 'favorite25': return profile.librarySongs.filter(s => s.isFavorite).length >= 25;
            case 'favorite100': return profile.librarySongs.filter(s => s.isFavorite).length >= 100;
            case 'create_playlist': return profile.playlists.length > 1; // Excludes default 'Favorites'
            case 'create_5_playlists': return profile.playlists.length > 5;
            case 'use_assistant_5': return type === 'profileUpdate' && (analytics.assistantUses || 0) >= 5;
            case 'use_assistant_25': return type === 'profileUpdate' && (analytics.assistantUses || 0) >= 25;
            case 'use_assistant_100': return type === 'profileUpdate' && (analytics.assistantUses || 0) >= 100;
            case 'change_theme_3': return type === 'profileUpdate' && (profile.usedFeatures.themes?.size || 0) >= 3;
            case 'change_theme_10': return type === 'profileUpdate' && (profile.usedFeatures.themes?.size || 0) >= 10;
            case 'change_font_3': return type === 'profileUpdate' && (profile.usedFeatures.fonts?.size || 0) >= 3;
            case 'lyric_lover': return type === 'profileUpdate' && profile.usedFeatures.lyricsViewed;
            case 'use_eq': return type === 'profileUpdate' && (profile.usedFeatures.eqPresets?.size || 0) >= 1;
            case 'share_song': return type === 'profileUpdate' && profile.usedFeatures.sharedSong;
            case 'watch_5_reels': return type === 'profileUpdate' && (analytics.reelsWatched || 0) >= 5;
            case 'watch_50_reels': return type === 'profileUpdate' && (analytics.reelsWatched || 0) >= 50;
            case 'ai-art-director': return type === 'ai-art-director' && value > 0;
            case 'sound_architect': return type === 'profileUpdate' && (profile.usedFeatures.eqPresets?.size || 0) >= 3;
            case 'tempo_tinkerer': return type === 'profileUpdate' && (profile.usedFeatures.temposChanged?.size || 0) >= 3;
            case 'biographer': return type === 'profileUpdate' && profile.usedFeatures.biographer;
            case 'radio_surfer': return (profile.favoriteRadioStations?.length || 0) >= 5;
            case 'discover_online': return type === 'profileUpdate' && (analytics.songsDownloaded || 0) >= 1;
            case 'discover_10_online': return type === 'profileUpdate' && (analytics.songsDownloaded || 0) >= 10;
            case 'listen_radio': return type === 'profileUpdate' && (analytics.radioListenTime || 0) >= 300;
            case 'shuffler': return type === 'profileUpdate' && (analytics.songsShuffled || 0) >= 20;
            case 'perfectionist': return type === 'profileUpdate' && (analytics.songsEdited || 0) >= 5;
            case 'the_creator': return type === 'ai-art-director' && value > 0; // Same as art director
            case 'vibe_master': return (profile.customMoods?.length || 0) >= 1;
            case 'philosopher': return (profile.customWisdom?.length || 0) >= 1;
            case 'visual_artist': return (profile.usedFeatures.visualizers?.size || 0) >= 5;
            case 'visual_master': return (profile.usedFeatures.visualizers?.size || 0) >= 15;
            case 'bpm_tapper': return type === 'bpm_tapper' && value > 0;
            case 'time_bender': return type === 'time_bender' && value > 0;
            case 'quiz_master': return type === 'quiz_level' && value >= 10;
            default: return false;
        }
    }
}));
