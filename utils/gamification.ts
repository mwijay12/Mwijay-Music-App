import type { ProfileData } from '../types.ts';

/**
 * Returns the cumulative XP required to reach a specific level.
 * Formula: 100 * level^1.5
 */
export const getXpForLevel = (level: number): number => {
    if (level <= 1) return 0;
    return Math.floor(100 * Math.pow(level, 1.5));
};

/**
 * Inverses the XP formula to find the corresponding level from total XP.
 * Safe from floating point issues via an airtight search loop.
 */
export const getLevelFromXp = (xp: number): number => {
    if (xp <= 0) return 1;
    for (let lvl = 100; lvl >= 1; lvl--) {
        if (xp >= getXpForLevel(lvl)) {
            return lvl;
        }
    }
    return 1;
};

export const LEVEL_TITLES = [
    { min: 1, max: 4, title: "Listener 🎵" },
    { min: 5, max: 9, title: "Music Fan 🎶" },
    { min: 10, max: 14, title: "Audiophile 🎧" },
    { min: 15, max: 19, title: "Beat Maker 🥁" },
    { min: 20, max: 29, title: "Rockstar 🎸" },
    { min: 30, max: 39, title: "Virtuoso 🎻" },
    { min: 40, max: 49, title: "Maestro 🎼" },
    { min: 50, max: 59, title: "Legend 🌟" },
    { min: 60, max: 69, title: "Icon 💎" },
    { min: 70, max: 79, title: "Immortal 🔥" },
    { min: 80, max: 89, title: "Mythical 🦄" },
    { min: 90, max: 99, title: "Transcendent ✨" },
    { min: 100, max: 100, title: "GOAT 🐐" }
];

export const getTitleForLevel = (level: number): string => {
    const titleObj = LEVEL_TITLES.find(t => level >= t.min && level <= t.max);
    return titleObj ? titleObj.title : "Listener 🎵";
};

export const getLevelRewards = (level: number): string[] => {
    const rewards: string[] = [];
    if (level >= 5) rewards.push("Custom Emoji Profile Avatars 🥺");
    if (level >= 10) rewards.push("Premium Theme Shaders (Glassmorphism)");
    if (level >= 20) rewards.push("Full Sleep-Timer Freezes");
    if (level >= 30) rewards.push("AI Radio Host Custom Voices");
    if (level >= 50) rewards.push("Music DNA Custom Color Grading");
    if (level >= 100) rewards.push("The Ultimate GOAT Golden Halo Badge 👑");
    return rewards;
};

/**
 * Returns local date string in timezone-safe YYYY-MM-DD format.
 */
export const getLocalDateString = (): string => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Returns yesterday's local date string in timezone-safe YYYY-MM-DD format.
 */
export const getYesterdayDateString = (): string => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Manages daily consecutive listening streaks client-side.
 * Runs when daily listening seconds reaches exactly 300 (5 minutes).
 */
export const updateStreakClientSide = (profile: ProfileData): ProfileData => {
    const todayStr = getLocalDateString();
    const yesterdayStr = getYesterdayDateString();

    const streak = profile.streak || {
        currentStreak: 0,
        longestStreak: 0,
        lastListenDate: '',
        freezeCount: 2,
        calendar: [],
        dailySeconds: {}
    };

    let calendar = [...(streak.calendar || [])];
    if (!calendar.includes(todayStr)) {
        calendar.push(todayStr);
    }

    let current = streak.currentStreak || 0;
    let longest = streak.longestStreak || 0;
    let freezes = streak.freezeCount || 0;
    const lastDate = streak.lastListenDate || '';

    if (lastDate === todayStr) {
        // Already secured today's streak!
    } else if (lastDate === yesterdayStr) {
        // Yes, consecutive day listen!
        current += 1;
    } else if (lastDate === '') {
        // Starting streak for the very first time!
        current = 1;
    } else {
        // Gap in days! Check if freezes are available to bridge the gap
        const lastDateObj = new Date(lastDate);
        const todayDateObj = new Date(todayStr);
        const diffTime = Math.abs(todayDateObj.getTime() - lastDateObj.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= freezes + 1) {
            // Gap is protected by freezes!
            freezes -= (diffDays - 1);
            current += 1;
        } else {
            // Unprotected gap! Reset streak.
            current = 1;
        }
    }

    if (current > longest) {
        longest = current;
    }

    return {
        ...profile,
        streak: {
            ...streak,
            currentStreak: current,
            longestStreak: longest,
            lastListenDate: todayStr,
            freezeCount: freezes,
            calendar: calendar
        }
    };
};

/**
 * Validates the user's streak when launching the app.
 * If the user has missed too many days beyond their available freezes, resets current streak.
 */
export const validateStreakOnLoad = (profile: ProfileData): ProfileData => {
    if (!profile.streak) return profile;
    const streak = profile.streak;
    const lastDate = streak.lastListenDate;
    if (!lastDate) return profile;

    const todayStr = getLocalDateString();
    if (lastDate === todayStr) return profile;

    const yesterdayStr = getYesterdayDateString();
    if (lastDate === yesterdayStr) return profile;

    // Check if the gap exceeds available freezes
    const lastDateObj = new Date(lastDate);
    const todayDateObj = new Date(todayStr);
    const diffTime = Math.abs(todayDateObj.getTime() - lastDateObj.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    const freezes = streak.freezeCount || 0;

    if (diffDays > freezes + 1) {
        // Resets current streak
        return {
            ...profile,
            streak: {
                ...streak,
                currentStreak: 0
            }
        };
    }

    return profile;
};

/**
 * Client-side XP adder. Handles leveling logic and checks if a boundary is crossed.
 */
export const addXpClientSide = (
    profile: ProfileData,
    amount: number,
    reason: string,
    onLevelUp?: (newLevel: number, rewards: string[]) => void
): ProfileData => {
    const currentXp = profile.xp || 0;
    const newXp = currentXp + amount;

    const currentLevel = profile.level || 1;
    const newLevel = getLevelFromXp(newXp);

    const levelUp = newLevel > currentLevel;

    if (levelUp && onLevelUp) {
        const rewards = getLevelRewards(newLevel);
        onLevelUp(newLevel, rewards);
    }

    console.log(`[XP Awarded] +${amount} XP for: "${reason}". Total XP: ${newXp}. Level: ${newLevel}`);

    return {
        ...profile,
        xp: newXp,
        level: newLevel
    };
};
