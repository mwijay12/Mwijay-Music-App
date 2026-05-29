import React, { useState, useEffect, useRef } from 'react';
import { Music, ArrowLeft, Trophy, User, Users, Heart, X, Volume2, Check, Sparkles, Flame, RefreshCw, Zap, Award, Star } from 'lucide-react';
import type { Song, ProfileData } from '../types.ts';
import BubbleButton from './BubbleButton.tsx';
import Confetti from './Confetti.tsx';
import { collection, doc, setDoc, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../services/firebase.ts';

interface MusicQuizViewProps {
    librarySongs: Song[];
    onBack: () => void;
    profile?: ProfileData;
    onAddXp?: (amount: number, reason: string) => void;
}

type Difficulty = 'easy' | 'medium' | 'hard';

interface LeaderboardEntry {
    userId: string;
    name: string;
    avatarUrl: string;
    score: number;
    difficulty: string;
    timestamp: number;
}

const MusicQuizView: React.FC<MusicQuizViewProps> = ({ librarySongs, onBack, profile, onAddXp }) => {
    const [gameMode, setGameMode] = useState<'solo' | 'versus' | null>(null);
    const [difficulty, setDifficulty] = useState<Difficulty>('medium');
    const [score, setScore] = useState({ p1: 0, p2: 0 });
    const [highScore, setHighScore] = useState(0);
    const [turn, setTurn] = useState<1 | 2>(1);
    const [round, setRound] = useState(1);
    const [lives, setLives] = useState(3);
    const [currentSong, setCurrentSong] = useState<Song | null>(null);
    const [options, setOptions] = useState<Song[]>([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [hasGuessed, setHasGuessed] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState('');
    const [snippetStart, setSnippetStart] = useState(0);
    const [isNewHighScore, setIsNewHighScore] = useState(false);
    const [isGameOver, setIsGameOver] = useState(false);
    
    // Tab State for Game Menu
    const [activeMenuTab, setActiveMenuTab] = useState<'play' | 'leaderboard'>('play');
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);

    // Gamification Power-ups (Lifelines)
    const [used5050, setUsed5050] = useState(false);
    const [usedBoost, setUsedBoost] = useState(false);
    const [usedSkip, setUsedSkip] = useState(false);
    const [hiddenOptionIds, setHiddenOptionIds] = useState<string[]>([]);
    const [bonusMessage, setBonusMessage] = useState('');

    // Streak and XP statistics
    const [streak, setStreak] = useState(0);
    const [xp, setXp] = useState(0);
    
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const snippetTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        audioRef.current = new Audio();
        const savedHighScore = parseInt(localStorage.getItem('mwijay_quiz_highscore_solo') || '0', 10);
        setHighScore(savedHighScore);

        // Load Streak and XP
        const savedXp = parseInt(localStorage.getItem('mwijay_quiz_xp') || '0', 10);
        setXp(savedXp);
        
        const lastPlayDate = localStorage.getItem('mwijay_quiz_last_play_date') || '';
        const savedStreak = parseInt(localStorage.getItem('mwijay_quiz_streak') || '0', 10);
        const today = new Date().toDateString();
        
        if (lastPlayDate === today) {
            setStreak(savedStreak);
        } else {
            const yesterday = new Date(Date.now() - 86400000).toDateString();
            if (lastPlayDate === yesterday) {
                setStreak(savedStreak);
            } else {
                setStreak(0); // Streak broken
            }
        }

        // Leaderboard real-time listener
        setIsLeaderboardLoading(true);
        const q = query(collection(db, 'music_quiz_leaderboards'), orderBy('score', 'desc'), limit(10));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const entries: LeaderboardEntry[] = [];
            snapshot.forEach((doc) => {
                entries.push(doc.data() as LeaderboardEntry);
            });
            setLeaderboard(entries);
            setIsLeaderboardLoading(false);
        }, (err) => {
            console.warn("Firestore leaderboard listen error:", err);
            setIsLeaderboardLoading(false);
        });

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = '';
            }
            if (snippetTimeoutRef.current) clearTimeout(snippetTimeoutRef.current);
            unsubscribe();
        };
    }, []);

    // Calculate Level based on Round (every 5 rounds)
    const level = Math.floor((round - 1) / 5) + 1;

    const playAudioSnippet = (correct: Song, diff: Difficulty, currentLevel: number, extended = false) => {
        if (audioRef.current) {
            const src = correct.url || (correct.audioData ? URL.createObjectURL(new Blob([correct.audioData])) : '');
            if (src) {
                audioRef.current.src = src;
                audioRef.current.volume = 1;
                
                // Dynamic Difficulty + Level Scaling
                let baseDuration = 10;
                if (diff === 'easy') baseDuration = 15;
                if (diff === 'hard') baseDuration = 5;
                
                let snippetDuration = Math.max(2, baseDuration - (currentLevel - 1));
                if (extended) {
                    snippetDuration += 5; // Play 5s longer
                }
                
                const maxStart = (correct.duration || 180) - snippetDuration;
                const randomStart = Math.max(0, Math.random() * maxStart);
                setSnippetStart(randomStart);

                audioRef.current.currentTime = randomStart; 
                audioRef.current.play().catch(e => console.error("Quiz play error", e));
                setIsPlaying(true);
                
                if (snippetTimeoutRef.current) clearTimeout(snippetTimeoutRef.current);
                snippetTimeoutRef.current = window.setTimeout(() => {
                    if (audioRef.current) audioRef.current.pause();
                    setIsPlaying(false);
                }, snippetDuration * 1000);
            }
        }
    };

    const startNewRound = () => {
        if (librarySongs.length < 4) return;
        
        setIsNewHighScore(false);
        setHiddenOptionIds([]);
        setBonusMessage('');
        
        // Pick random song
        const correctIndex = Math.floor(Math.random() * librarySongs.length);
        const correct = librarySongs[correctIndex];
        
        // Pick 3 distractors
        const distractors: Song[] = [];
        while (distractors.length < 3) {
            const rand = librarySongs[Math.floor(Math.random() * librarySongs.length)];
            if (rand.id !== correct.id && !distractors.find(d => d.id === rand.id)) {
                distractors.push(rand);
            }
        }
        
        const allOptions = [...distractors, correct].sort(() => 0.5 - Math.random());
        
        setCurrentSong(correct);
        setOptions(allOptions);
        setHasGuessed(false);
        setIsCorrect(false);
        setFeedbackMessage('');
        
        playAudioSnippet(correct, difficulty, level);
    };

    // Lifeline triggers
    const handleUse5050 = () => {
        if (used5050 || hasGuessed || !currentSong) return;
        setUsed5050(true);
        const wrongOptions = options.filter(o => o.id !== currentSong.id);
        const toHide = wrongOptions.sort(() => 0.5 - Math.random()).slice(0, 2).map(o => o.id);
        setHiddenOptionIds(toHide);
        setBonusMessage("50/50 Active! Two incorrect options removed.");
    };

    const handleUseBoost = () => {
        if (usedBoost || hasGuessed || !currentSong) return;
        setUsedBoost(true);
        setBonusMessage("Acoustic Boost Active! Extended playing +5s.");
        playAudioSnippet(currentSong, difficulty, level, true);
    };

    const handleUseSkip = () => {
        if (usedSkip || hasGuessed || !currentSong) return;
        setUsedSkip(true);
        setHasGuessed(true);
        setIsCorrect(true);
        setFeedbackMessage("Free Pass Used! Round skipped safely.");
        if (audioRef.current) audioRef.current.pause();
        setIsPlaying(false);
        if (snippetTimeoutRef.current) clearTimeout(snippetTimeoutRef.current);
    };

    const handleGameOver = async (finalP1Score: number) => {
        setIsGameOver(true);
        if (gameMode === 'solo') {
            const savedHighScore = parseInt(localStorage.getItem('mwijay_quiz_highscore_solo') || '0', 10);
            if (finalP1Score > savedHighScore) {
                localStorage.setItem('mwijay_quiz_highscore_solo', finalP1Score.toString());
                setHighScore(finalP1Score);
            }

            // Increment real games won
            const currentWins = parseInt(localStorage.getItem('mwijay_quiz_games_won') || '0', 10);
            localStorage.setItem('mwijay_quiz_games_won', (currentWins + 1).toString());

            // Sync score to Firestore Global Leaderboards
            if (auth.currentUser) {
                try {
                    const username = auth.currentUser.displayName || profile?.name || 'Mwijay User';
                    const avatar = auth.currentUser.photoURL || profile?.avatarUrl || '';
                    const docRef = doc(db, 'music_quiz_leaderboards', auth.currentUser.uid);
                    await setDoc(docRef, {
                        userId: auth.currentUser.uid,
                        name: username,
                        avatarUrl: avatar,
                        score: Math.max(finalP1Score, savedHighScore),
                        difficulty,
                        timestamp: Date.now()
                    }, { merge: true });
                } catch (e) {
                    console.warn("Failed to sync leaderboard score to Firestore:", e);
                }
            }
        }
    };

    const handleGuess = (songId: string) => {
        if (hasGuessed || !currentSong || isGameOver) return;
        
        const correct = songId === currentSong.id;
        setHasGuessed(true);
        setIsCorrect(correct);
        
        if (audioRef.current) audioRef.current.pause();
        setIsPlaying(false);
        if (snippetTimeoutRef.current) clearTimeout(snippetTimeoutRef.current);

        // Increment attempted questions count
        const currentAttempted = parseInt(localStorage.getItem('mwijay_quiz_questions_attempted') || '0', 10);
        localStorage.setItem('mwijay_quiz_questions_attempted', (currentAttempted + 1).toString());

        if (correct) {
            // Increment correct answers count
            const currentCorrect = parseInt(localStorage.getItem('mwijay_quiz_questions_correct') || '0', 10);
            localStorage.setItem('mwijay_quiz_questions_correct', (currentCorrect + 1).toString());

            let multiplier = 1;
            if (difficulty === 'medium') multiplier = 1.5;
            if (difficulty === 'hard') multiplier = 2;

            const basePoints = 100 + (level * 10);
            const points = Math.round(basePoints * multiplier);
            
            let updatedP1Score = score.p1;
            setScore(prev => {
                const newScore = { ...prev, [turn === 1 ? 'p1' : 'p2']: prev[turn === 1 ? 'p1' : 'p2'] + points };
                updatedP1Score = newScore.p1;
                
                if (gameMode === 'solo' && newScore.p1 > highScore) {
                    setHighScore(newScore.p1);
                    setIsNewHighScore(true);
                    localStorage.setItem('mwijay_quiz_highscore_solo', newScore.p1.toString());
                }
                return newScore;
            });

            // Sync XP & Streak on correct answers
            const pointsGained = Math.round(10 * multiplier);
            const newXp = xp + pointsGained;
            setXp(newXp);
            localStorage.setItem('mwijay_quiz_xp', newXp.toString());
            if (onAddXp) {
                onAddXp(pointsGained, "Correct song guess in quiz");
            }

            const today = new Date().toDateString();
            localStorage.setItem('mwijay_quiz_last_play_date', today);
            
            const savedStreak = parseInt(localStorage.getItem('mwijay_quiz_streak') || '0', 10);
            const lastPlayDate = localStorage.getItem('mwijay_quiz_last_play_date_check') || '';
            if (lastPlayDate !== today) {
                const newStreak = lastPlayDate === new Date(Date.now() - 86400000).toDateString() ? savedStreak + 1 : 1;
                setStreak(newStreak);
                localStorage.setItem('mwijay_quiz_streak', newStreak.toString());
                localStorage.setItem('mwijay_quiz_last_play_date_check', today);
            }

            setFeedbackMessage(`Correct! 🎉 +${points} XP & Points!`);
        } else {
            setFeedbackMessage(`Oops! It was "${currentSong.title}"`);
            if (gameMode === 'solo') {
                setLives(prev => {
                    const newLives = prev - 1;
                    if (newLives <= 0) {
                        setTimeout(() => handleGameOver(score.p1), 1500);
                    }
                    return newLives;
                });
            }
        }
    };

    const nextRound = () => {
        if (gameMode === 'versus') {
            setTurn(prev => prev === 1 ? 2 : 1);
        }
        setRound(r => {
            const nextR = r + 1;
            const currentLvl = Math.floor((r - 1) / 5) + 1;
            const nextLvl = Math.floor((nextR - 1) / 5) + 1;
            if (nextLvl > currentLvl && onAddXp) {
                onAddXp(50, `Reached Quiz Level ${nextLvl}`);
            }
            return nextR;
        });
        startNewRound();
    };
    
    const restartGame = () => {
        setIsGameOver(false);
        setScore({ p1: 0, p2: 0 });
        setLives(3);
        setRound(1);
        setTurn(1);
        setUsed5050(false);
        setUsedBoost(false);
        setUsedSkip(false);
        setHiddenOptionIds([]);
        setBonusMessage('');
        startNewRound();
    };

    if (librarySongs.length < 4) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 home-gradient-bg">
                <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mb-6 animate-pulse">
                    <Music size={48} className="text-neutral-500" />
                </div>
                <h2 className="text-2xl font-bold mb-3">Not Enough Songs</h2>
                <p className="text-neutral-400 max-w-xs mx-auto leading-relaxed">
                    You need at least 4 songs in your library to play the Music Quiz. 
                    This helps us create challenging questions for you!
                </p>
                
                <div className="mt-8 flex flex-col gap-3 w-full max-w-xs">
                    <BubbleButton onClick={onBack} className="w-full">
                        Add More Songs
                    </BubbleButton>
                    <button 
                        onClick={onBack}
                        className="w-full py-3 rounded-full bg-white/10 font-bold text-sm hover:bg-white/20 transition-colors"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    // Mode Selection Screen
    if (!gameMode) {
        return (
            <main className="h-full w-full home-gradient-bg flex flex-col p-6 pb-40 overflow-y-auto">
                <header className="flex items-center gap-4 mb-6">
                    <button onClick={onBack} className="text-2xl hover:scale-105 active:scale-95 transition-transform"><ArrowLeft size={24} /></button>
                    <h1 className="text-2xl font-bold">Music Quiz</h1>
                </header>
                
                {/* Stats Summary Capsule */}
                <div className="flex gap-4 mb-6 relative z-10 w-full max-w-md self-center">
                    <div className="flex-1 bg-white/5 border border-white/10 p-3 rounded-2xl flex items-center justify-between shadow-lg">
                        <div className="text-left">
                            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Solo High Score</p>
                            <p className="text-2xl font-black text-[var(--primary-accent)] font-mono">{highScore}</p>
                        </div>
                        <Trophy size={28} className="text-yellow-400 filter drop-shadow" />
                    </div>
                    
                    <div className="flex-1 bg-white/5 border border-white/10 p-3 rounded-2xl flex items-center justify-between shadow-lg">
                        <div className="text-left">
                            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Daily Streak</p>
                            <p className="text-2xl font-black text-orange-400 font-mono flex items-center gap-1">
                                {streak} <span className="text-sm">days</span>
                            </p>
                        </div>
                        <Flame size={28} className={`${streak > 0 ? 'text-orange-500 fill-orange-500 animate-pulse' : 'text-neutral-500'}`} />
                    </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex bg-black/30 p-1 rounded-full border border-white/5 max-w-sm w-full self-center mb-6">
                    <button 
                        onClick={() => setActiveMenuTab('play')} 
                        className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-full transition-all ${activeMenuTab === 'play' ? 'bg-[var(--primary-accent)] text-black font-black' : 'text-neutral-400 hover:text-white'}`}
                    >
                        Play Quiz
                    </button>
                    <button 
                        onClick={() => setActiveMenuTab('leaderboard')} 
                        className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-full transition-all ${activeMenuTab === 'leaderboard' ? 'bg-[var(--primary-accent)] text-black font-black' : 'text-neutral-400 hover:text-white'}`}
                    >
                        Leaderboard
                    </button>
                </div>
                
                {activeMenuTab === 'play' ? (
                    <div className="flex-1 flex flex-col max-w-md w-full self-center space-y-6">
                        <div>
                            <p className="font-bold mb-2 text-sm text-neutral-300 text-left">Select Difficulty:</p>
                            <div className="flex gap-2">
                                {(['easy', 'medium', 'hard'] as const).map(d => (
                                    <button 
                                        key={d}
                                        onClick={() => setDifficulty(d)}
                                        className={`flex-1 py-3 rounded-xl text-xs uppercase tracking-wider font-black transition-all ${difficulty === d ? 'bg-[var(--primary-accent)] text-black scale-105 shadow-lg shadow-[var(--primary-accent)]/20' : 'bg-white/10 text-neutral-400 border border-white/5 hover:bg-white/20'}`}
                                    >
                                        {d}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col gap-4">
                            <button onClick={() => { setGameMode('solo'); setLives(3); startNewRound(); }} className="liquid-glass-pane glare-effect p-6 rounded-3xl text-center hover:scale-102 transition-transform flex flex-col items-center border border-white/10 group">
                                <div className="w-16 h-16 rounded-2xl bg-[var(--primary-accent)]/20 text-[var(--primary-accent)] flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                                    <User size={32} />
                                </div>
                                <h2 className="text-xl font-black uppercase tracking-wide">Solo Challenge</h2>
                                <p className="text-xs text-neutral-400 mt-2">Earn XP points, maintain your streak, and rank up on the Global Leaderboard!</p>
                            </button>
                            <button onClick={() => { setGameMode('versus'); startNewRound(); }} className="liquid-glass-pane glare-effect p-6 rounded-3xl text-center hover:scale-102 transition-transform flex flex-col items-center border border-white/10 group">
                                <div className="w-16 h-16 rounded-2xl bg-[var(--secondary-accent-start)]/20 text-[var(--secondary-accent-start)] flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                                    <Users size={32} />
                                </div>
                                <h2 className="text-xl font-black uppercase tracking-wide">Local Versus</h2>
                                <p className="text-xs text-neutral-400 mt-2">Pass the phone! Play head-to-head with a friend in real time.</p>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col max-w-md w-full self-center bg-black/20 rounded-3xl border border-white/5 p-6 backdrop-blur-md">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-black text-sm uppercase tracking-widest text-[var(--primary-accent)]">Global Top players</h3>
                            <Award className="text-yellow-400 fill-yellow-400/20" size={20} />
                        </div>

                        {isLeaderboardLoading ? (
                            <div className="flex-1 flex flex-col items-center justify-center py-20">
                                <RefreshCw className="animate-spin text-[var(--primary-accent)] mb-2" size={24} />
                                <span className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Syncing global rankings...</span>
                            </div>
                        ) : leaderboard.length > 0 ? (
                            <div className="space-y-3 flex-1 flex flex-col">
                                {/* Visual Podium for Top 3 */}
                                <div className="grid grid-cols-3 gap-2 items-end mb-4 pt-4 border-b border-white/5 pb-6">
                                    {/* 2nd Place */}
                                    {leaderboard[1] && (
                                        <div className="flex flex-col items-center">
                                            <div className="relative">
                                                <img src={leaderboard[1].avatarUrl || 'https://via.placeholder.com/150'} alt={leaderboard[1].name} className="w-12 h-12 rounded-full border-2 border-slate-400 object-cover" />
                                                <span className="absolute -bottom-1 -right-1 bg-slate-400 text-black text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center">2</span>
                                            </div>
                                            <p className="text-[10px] font-black text-neutral-300 truncate w-full mt-2 text-center uppercase tracking-tight">{leaderboard[1].name}</p>
                                            <p className="text-xs font-black text-slate-400 font-mono mt-0.5">{leaderboard[1].score}</p>
                                        </div>
                                    )}
                                    {/* 1st Place */}
                                    {leaderboard[0] && (
                                        <div className="flex flex-col items-center scale-110 -translate-y-2">
                                            <div className="relative">
                                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-yellow-400"><Star size={16} fill="currentColor" /></div>
                                                <img src={leaderboard[0].avatarUrl || 'https://via.placeholder.com/150'} alt={leaderboard[0].name} className="w-14 h-14 rounded-full border-2 border-yellow-400 object-cover shadow-lg shadow-yellow-400/20" />
                                                <span className="absolute -bottom-1 -right-1 bg-yellow-400 text-black text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center">1</span>
                                            </div>
                                            <p className="text-[11px] font-black text-white truncate w-full mt-2 text-center uppercase tracking-tight">{leaderboard[0].name}</p>
                                            <p className="text-sm font-black text-yellow-400 font-mono mt-0.5">{leaderboard[0].score}</p>
                                        </div>
                                    )}
                                    {/* 3rd Place */}
                                    {leaderboard[2] && (
                                        <div className="flex flex-col items-center">
                                            <div className="relative">
                                                <img src={leaderboard[2].avatarUrl || 'https://via.placeholder.com/150'} alt={leaderboard[2].name} className="w-12 h-12 rounded-full border-2 border-amber-600 object-cover" />
                                                <span className="absolute -bottom-1 -right-1 bg-amber-600 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center">3</span>
                                            </div>
                                            <p className="text-[10px] font-black text-neutral-300 truncate w-full mt-2 text-center uppercase tracking-tight">{leaderboard[2].name}</p>
                                            <p className="text-xs font-black text-amber-500 font-mono mt-0.5">{leaderboard[2].score}</p>
                                        </div>
                                    )}
                                </div>

                                {/* List for Ranks 4-10 */}
                                <div className="space-y-2 overflow-y-auto max-h-60 pr-1 text-left">
                                    {leaderboard.slice(3).map((entry, index) => (
                                        <div key={entry.userId || index} className="flex items-center justify-between bg-white/5 border border-white/5 px-4 py-2.5 rounded-xl text-xs">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span className="font-bold font-mono text-neutral-500 text-center w-4">{index + 4}</span>
                                                <img src={entry.avatarUrl || 'https://via.placeholder.com/150'} alt={entry.name} className="w-8 h-8 rounded-full object-cover" />
                                                <span className="font-black text-white truncate uppercase tracking-tight">{entry.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] font-black uppercase tracking-wider text-neutral-500 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">{entry.difficulty}</span>
                                                <span className="font-black text-[var(--primary-accent)] font-mono">{entry.score}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center py-20 text-center text-neutral-500">
                                <User size={36} className="mb-2 opacity-50" />
                                <p className="text-xs font-bold uppercase tracking-wider">No records yet</p>
                                <p className="text-[10px] max-w-xs px-6 mt-1">Be the first to secure a legendary rank on the global high scores!</p>
                            </div>
                        )}
                        
                        {!auth.currentUser && (
                            <div className="mt-4 p-3 bg-indigo-600/20 border border-indigo-500/20 rounded-xl text-[10px] text-indigo-300 font-bold uppercase tracking-wider text-center">
                                Login with Google inside Sidebar to publish your scores!
                            </div>
                        )}
                    </div>
                )}
            </main>
        );
    }
    
    // Game Over Screen
    if (isGameOver) {
        return (
            <main className="h-full w-full home-gradient-bg flex flex-col items-center justify-center p-6 text-center animate-pop-in">
                <Trophy size={60} className="text-yellow-400 mb-2 filter drop-shadow" />
                <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-2">Game Over</h1>
                <p className="text-neutral-400 font-bold uppercase tracking-widest text-xs mb-8">You ran out of lives!</p>
                
                <div className="bg-white/5 border border-white/10 p-6 rounded-3xl w-full max-w-xs mb-8 shadow-2xl backdrop-blur-md relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-[var(--primary-accent)] text-black text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl">
                        Difficulty: {difficulty}
                    </div>
                    <p className="text-[10px] text-neutral-400 font-black uppercase tracking-widest mb-2">Final Score</p>
                    <p className="text-6xl font-black text-[var(--primary-accent)] font-mono tracking-tight">{score.p1}</p>
                    {score.p1 >= highScore && score.p1 > 0 && (
                        <p className="text-yellow-400 font-black uppercase tracking-wide mt-3 text-xs flex items-center justify-center gap-1 animate-bounce">
                            <Star size={14} fill="currentColor" /> New Personal Best!
                        </p>
                    )}
                </div>
                
                <div className="flex gap-4 w-full max-w-xs">
                    <button onClick={() => setGameMode(null)} className="flex-1 bg-white/10 hover:bg-white/20 border border-white/5 text-white font-black py-3 rounded-full text-xs uppercase tracking-wider transition-colors">Menu</button>
                    <BubbleButton onClick={restartGame} className="flex-1 text-xs uppercase tracking-wider">Try Again</BubbleButton>
                </div>
            </main>
        );
    }

    return (
        <main className="h-full w-full home-gradient-bg flex flex-col p-6 pb-40 overflow-y-auto">
            {(isCorrect || isNewHighScore) && <Confetti />}
            <header className="flex justify-between items-center mb-6 flex-shrink-0">
                <button onClick={() => setGameMode(null)} className="text-xl w-9 h-9 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full border border-white/5 transition-colors"><X size={18} /></button>
                <div className="flex items-center gap-2 bg-black/40 border border-white/5 px-4 py-1.5 rounded-full shadow-lg">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[var(--primary-accent)] bg-[var(--primary-accent)]/20 px-2 py-0.5 rounded">Level {level}</span>
                    <span className="w-1 h-3 bg-white/20"></span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-neutral-300">Round {round}</span>
                </div>
                {gameMode === 'solo' && (
                    <div className="flex gap-1 bg-black/40 px-3 py-1.5 rounded-full border border-white/5">
                        {[...Array(3)].map((_, i) => (
                            <Heart key={i} size={16} className={`${i < lives ? 'text-red-500 fill-red-500 scale-110' : 'text-neutral-700'} transition-all`} />
                        ))}
                    </div>
                )}
            </header>

            <div className="flex justify-between items-end mb-6 px-2 w-full max-w-md self-center">
                <div className="text-center flex-1">
                    <p className="text-[10px] text-neutral-400 font-black uppercase tracking-wider mb-1">{gameMode === 'versus' ? 'P1 Score' : 'Total Score'}</p>
                    <p className="text-3xl font-black text-[var(--primary-accent)] font-mono">{score.p1}</p>
                </div>
                {gameMode === 'versus' && (
                    <div className="text-center flex-1">
                        <p className="text-[10px] text-neutral-400 font-black uppercase tracking-wider mb-1">P2 Score</p>
                        <p className="text-3xl font-black text-[var(--secondary-accent-start)] font-mono">{score.p2}</p>
                    </div>
                )}
            </div>

            {gameMode === 'versus' && (
                <div className="text-center mb-6 p-3 bg-[var(--secondary-accent-start)]/20 border border-[var(--secondary-accent-start)]/20 rounded-2xl max-w-sm w-full self-center animate-pulse">
                    <p className="text-sm font-black uppercase tracking-widest text-white">Player {turn}'s Turn</p>
                </div>
            )}
            
            {isNewHighScore && hasGuessed && (
                 <div className="text-center mb-4 animate-bounce">
                    <span className="bg-yellow-400 text-black font-black uppercase tracking-wider px-4 py-1.5 rounded-full text-xs shadow-lg">New High Score! 🏆</span>
                </div>
            )}

            <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full relative">
                {/* Tactical Lifelines / Power-Ups (Solo Mode Only) */}
                {gameMode === 'solo' && !hasGuessed && !isGameOver && (
                    <div className="flex justify-center gap-3 w-full mb-6">
                        <button 
                            onClick={handleUse5050}
                            disabled={used5050}
                            className={`flex-1 py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider border flex items-center justify-center gap-1 transition-all ${used5050 ? 'bg-white/5 text-neutral-600 border-neutral-800' : 'bg-white/10 text-white border-white/5 hover:bg-white/20 hover:scale-105 active:scale-95 shadow-md'}`}
                            title="Fifty-Fifty (Removes 2 incorrect choices)"
                        >
                            <Sparkles size={12} className={used5050 ? 'text-neutral-600' : 'text-[var(--primary-accent)]'} />
                            <span>50/50</span>
                        </button>
                        <button 
                            onClick={handleUseBoost}
                            disabled={usedBoost}
                            className={`flex-1 py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider border flex items-center justify-center gap-1 transition-all ${usedBoost ? 'bg-white/5 text-neutral-600 border-neutral-800' : 'bg-white/10 text-white border-white/5 hover:bg-white/20 hover:scale-105 active:scale-95 shadow-md'}`}
                            title="Acoustic Boost (Extended play +5s)"
                        >
                            <Volume2 size={12} className={usedBoost ? 'text-neutral-600' : 'text-cyan-400'} />
                            <span>Boost</span>
                        </button>
                        <button 
                            onClick={handleUseSkip}
                            disabled={usedSkip}
                            className={`flex-1 py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider border flex items-center justify-center gap-1 transition-all ${usedSkip ? 'bg-white/5 text-neutral-600 border-neutral-800' : 'bg-white/10 text-white border-white/5 hover:bg-white/20 hover:scale-105 active:scale-95 shadow-md'}`}
                            title="Skip Round (Safety pass without life deduction)"
                        >
                            <X size={12} className={usedSkip ? 'text-neutral-600' : 'text-red-400'} />
                            <span>Skip</span>
                        </button>
                    </div>
                )}

                {/* Subtitular notifications of items */}
                {bonusMessage && !hasGuessed && (
                    <div className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-4 animate-pulse">
                        {bonusMessage}
                    </div>
                )}

                <div className="w-32 h-32 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-8 relative flex-shrink-0 shadow-2xl backdrop-blur-md">
                    {isPlaying ? (
                        <div className="absolute inset-0 rounded-full border-4 border-[var(--primary-accent)] animate-ping opacity-35"></div>
                    ) : null}
                    {isPlaying ? <Volume2 size={44} className="text-[var(--primary-accent)] loader-pulse" /> : <Music size={44} className="text-neutral-500" />}
                </div>

                <h2 className="text-2xl font-black uppercase tracking-tighter mb-1 text-center">Guess the Song</h2>
                <p className="text-neutral-400 mb-6 text-xs font-bold font-mono tracking-wide">Audio snippet starting at {Math.floor(snippetStart)}s</p>

                <div className="grid grid-cols-1 gap-3 w-full text-left">
                    {options.map(song => {
                        const isHidden = hiddenOptionIds.includes(song.id);
                        if (isHidden) return null; // Hide 50/50 options completely

                        let btnClass = "bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/10";
                        if (hasGuessed) {
                            if (song.id === currentSong?.id) btnClass = "bg-green-600 text-white border-green-400 shadow-lg shadow-green-600/20";
                            else if (hasGuessed && !isCorrect) btnClass = "bg-red-600/40 text-white opacity-40 border-red-500/20";
                            else btnClass = "bg-white/5 opacity-20 border-transparent";
                        }

                        return (
                            <button
                                key={song.id}
                                onClick={() => handleGuess(song.id)}
                                disabled={hasGuessed}
                                className={`p-4 rounded-2xl font-black text-left transition-all border flex flex-col justify-between ${btnClass}`}
                            >
                                <div className="flex items-center justify-between w-full">
                                    <span className="truncate mr-2 uppercase tracking-tight text-sm font-black">{song.title}</span>
                                    {hasGuessed && song.id === currentSong?.id && <Check size={16} className="text-white" />}
                                    {hasGuessed && !isCorrect && song.id !== currentSong?.id && <X size={16} className="text-transparent" />} 
                                </div>
                                <span className="text-xs font-bold text-white/50 block truncate mt-1">{song.artist}</span>
                            </button>
                        );
                    })}
                </div>

                {hasGuessed && (
                    <div className="mt-8 text-center animate-pop-in w-full">
                        <p className="text-xl font-black uppercase tracking-wider mb-4 text-white">{feedbackMessage}</p>
                        <BubbleButton onClick={nextRound} className="w-full text-xs uppercase tracking-wider py-4">
                            {gameMode === 'versus' ? `Next Player` : `Next Round`}
                        </BubbleButton>
                    </div>
                )}
            </div>
            <div className="h-12"></div>
        </main>
    );
};

export default MusicQuizView;
