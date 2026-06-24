import React, { useState, useRef, useMemo } from 'react';
import { Smile, Camera, ArrowRight, Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import BubbleButton from './BubbleButton.tsx';
import Confetti from './Confetti.tsx';
import Aurora from './Aurora.tsx';
import { signInWithGoogle } from '../services/firebase.ts';
import { uploadToR2 } from '../services/r2Service.ts';
import { useAuth } from '../hooks/useAuth.ts';
import { motion, AnimatePresence } from 'framer-motion';

interface OnboardingProps {
    onComplete: (data: {name: string, userId?: string, avatarUrl?: string}) => void;
    onOpenEmojiPicker: () => void;
    avatarUrl: string;
    onAvatarChange: (url: string) => void;
    themeMode: 'light' | 'dark';
    onToggleTheme: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete, onOpenEmojiPicker, avatarUrl, onAvatarChange, themeMode, onToggleTheme }) => {
    const { signIn, signUp } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [authMode, setAuthMode] = useState<'quick' | 'signin' | 'signup'>('quick');
    const [isCompleting, setIsCompleting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const handleGoogleSignIn = async () => {
        try {
            setIsAuthenticating(true);
            const user = await signInWithGoogle();
            if (user) {
                setName(user.displayName || '');
                if (user.photoURL) {
                    onAvatarChange(user.photoURL);
                }
                // Auto complete if we have a name
                if (user.displayName) {
                    onComplete({ 
                        name: user.displayName, 
                        userId: user.uid, 
                        avatarUrl: user.photoURL || undefined 
                    });
                }
            }
        } catch (error) {
            console.error("Auth failed", error);
        } finally {
            setIsAuthenticating(false);
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsUploading(true);
            const result = await uploadToR2(file);
            onAvatarChange(result.secure_url);
        } catch (error) {
            console.error("Cloudinary upload failed", error);
            alert("Failed to upload avatar. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = () => {
        if (name.trim()) {
            setIsCompleting(true);
            setTimeout(() => {
                onComplete({ name });
            }, 1500); // Wait for confetti animation
        } else {
            const nameInput = document.getElementById('onboarding-name-input');
            nameInput?.classList.add('animate-shake');
            setTimeout(() => nameInput?.classList.remove('animate-shake'), 500);
        }
    };

    const handleEmailSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !password.trim()) {
            alert('Please enter both email and password.');
            return;
        }

        try {
            setIsAuthenticating(true);
            await signIn(email, password);
        } catch (error: any) {
            console.error("Sign in failed", error);
            alert(error.message || 'Incorrect email or password.');
        } finally {
            setIsAuthenticating(false);
        }
    };

    const handleEmailSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !password.trim() || !name.trim()) {
            alert('Please fill in all fields (Name, Email, Password).');
            return;
        }

        try {
            setIsAuthenticating(true);
            await signUp(email, password, name);
        } catch (error: any) {
            console.error("Sign up failed", error);
            alert(error.message || 'Failed to create account.');
        } finally {
            setIsAuthenticating(false);
        }
    };

    const stars = useMemo(() => Array.from({ length: 50 }).map((_, i) => (
        <div
            key={`star-${i}`}
            className="twinkle-star"
            style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${Math.random() * 2 + 3}s`,
            }}
        />
    )), []);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black text-white overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0">
                <Aurora />
            </div>
            {isCompleting && <Confetti />}
            
            {/* Main Container - Responsive Layout */}
            <div className="relative z-10 w-full h-full lg:max-w-6xl lg:h-[85vh] flex flex-col lg:flex-row bg-[var(--surface-color)]/30 backdrop-blur-2xl lg:rounded-[3rem] lg:border lg:border-white/10 shadow-2xl overflow-hidden">
                
                {/* Desktop Left Side: Artistic Showcase */}
                <div className="hidden lg:flex flex-1 relative flex-col items-center justify-center p-12 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary-accent)]/20 via-transparent to-[var(--secondary-accent-end)]/20 mix-blend-overlay"></div>
                    <div className="absolute inset-0 opacity-60">{stars}</div>
                    
                    {/* Floating Elements */}
                    <div className="absolute top-20 left-20 text-6xl animate-bounce" style={{ animationDuration: '3s' }}>🎵</div>
                    <div className="absolute bottom-32 right-20 text-6xl animate-bounce" style={{ animationDuration: '4s', animationDelay: '1s' }}>✨</div>
                    <div className="absolute top-1/2 left-10 text-4xl animate-pulse text-[var(--primary-accent)]">●</div>

                    <div className="relative z-10 text-center space-y-6">
                        <h1 className="text-8xl font-bold tracking-tighter" style={{ fontFamily: "'Lobster', cursive" }}>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">Mwijay</span>
                            <br />
                            <span className="text-[var(--primary-accent)] drop-shadow-[0_0_30px_rgba(200,240,82,0.4)]">Music</span>
                        </h1>
                        <p className="text-xl text-white/80 font-light max-w-md mx-auto leading-relaxed">
                            Experience music like never before. <br/> Curated vibes, smart AI, and stunning visuals.
                        </p>
                    </div>
                </div>

                {/* Right Side / Mobile View: Input Form */}
                <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 relative">
                    <div className="w-full max-w-sm flex flex-col items-center name-anim-fade-in" style={{ animationDelay: '0.2s' }}>
                        
                        <div className="lg:hidden mb-8 text-center">
                             <h1 className="text-5xl font-bold wavy-text" style={{ fontFamily: "'Lobster', cursive" }}>
                                {'Mwijay Music'.split('').map((char, i) => (
                                    <span key={i} style={{ animationDelay: `${i * 0.07}s` }}>{char === ' ' ? '\u00A0' : char}</span>
                                ))}
                            </h1>
                        </div>

                        {authMode === 'quick' && (
                            <div className="relative mb-8 group">
                                <div className="absolute inset-0 bg-[var(--primary-accent)] rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                                <div className="relative z-10">
                                    {avatarUrl && !avatarUrl.startsWith('http') && !avatarUrl.startsWith('data:') && !avatarUrl.startsWith('/') ? (
                                        <div className="w-40 h-40 rounded-full bg-gradient-to-br from-[var(--primary-accent)]/20 to-[var(--secondary-accent-start)]/20 border-4 border-white/10 shadow-2xl flex items-center justify-center text-7xl select-none">
                                            {avatarUrl}
                                        </div>
                                    ) : (
                                        <img src={avatarUrl} alt="Avatar Preview" className="w-40 h-40 rounded-full object-cover border-4 border-white/10 shadow-2xl"/>
                                    )}
                                    {isUploading && (
                                        <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-sm">
                                            <Loader2 className="animate-spin text-[var(--primary-accent)]" size={32} />
                                        </div>
                                    )}
                                </div>
                                
                                <div className="absolute -bottom-2 -right-2 z-20 flex gap-2">
                                    <button onClick={onOpenEmojiPicker} className="w-12 h-12 bg-yellow-400 text-black rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-lg border-2 border-black/10" title="Set Emoji">
                                        <Smile size={24} />
                                    </button>
                                    <button onClick={() => fileInputRef.current?.click()} className="w-12 h-12 bg-[var(--primary-accent)] text-black rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-lg border-2 border-black/10" title="Upload Photo">
                                        <Camera size={24} />
                                    </button>
                                </div>
                                <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} accept="image/*" className="hidden"/>
                            </div>
                        )}

                        {/* Tab Switcher */}
                        <div className="w-full flex bg-white/5 border border-white/10 rounded-full p-1 mb-6 relative">
                            <button
                                onClick={() => setAuthMode('quick')}
                                className={`flex-1 py-2.5 text-xs font-bold rounded-full transition-all duration-300 relative z-10 cursor-pointer ${authMode === 'quick' ? 'text-black' : 'text-neutral-400'}`}
                            >
                                Quick Setup
                            </button>
                            <button
                                onClick={() => setAuthMode('signin')}
                                className={`flex-1 py-2.5 text-xs font-bold rounded-full transition-all duration-300 relative z-10 cursor-pointer ${authMode === 'signin' ? 'text-black' : 'text-neutral-400'}`}
                            >
                                Sign In
                            </button>
                            <button
                                onClick={() => setAuthMode('signup')}
                                className={`flex-1 py-2.5 text-xs font-bold rounded-full transition-all duration-300 relative z-10 cursor-pointer ${authMode === 'signup' ? 'text-black' : 'text-neutral-400'}`}
                            >
                                Register
                            </button>
                            
                            {/* Sliding Active Backplate */}
                            <div 
                                className="absolute top-1 bottom-1 rounded-full bg-[var(--primary-accent)] shadow-md transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]"
                                style={{
                                    left: authMode === 'quick' ? '4px' : authMode === 'signin' ? '33.33%' : '66.66%',
                                    width: 'calc(33.33% - 5px)'
                                }}
                            />
                        </div>

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={authMode}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                transition={{ duration: 0.25, ease: 'easeInOut' }}
                                className="w-full space-y-4"
                            >
                                {authMode === 'quick' && (
                                    <>
                                        <div className="flex items-center gap-4 text-white/20 py-1">
                                            <div className="h-px flex-1 bg-current"></div>
                                            <span className="text-[10px] font-bold uppercase tracking-widest">Simple setup</span>
                                            <div className="h-px flex-1 bg-current"></div>
                                        </div>

                                        <div className="space-y-1.5 text-center">
                                            <label htmlFor="onboarding-name-input" className="text-xs font-bold uppercase tracking-widest text-[var(--primary-accent)]">Your Name</label>
                                            <input 
                                                id="onboarding-name-input"
                                                type="text" 
                                                value={name} 
                                                onChange={e => setName(e.target.value)} 
                                                placeholder="Enter your name" 
                                                className="w-full bg-white/5 hover:bg-white/10 focus:bg-white/10 text-white placeholder:text-white/30 py-3 px-4 rounded-xl border border-white/10 text-center text-lg font-bold focus:border-[var(--primary-accent)] focus:ring-[var(--primary-accent)] focus:ring-1 transition-all outline-none" 
                                                maxLength={30}
                                                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                                            />
                                        </div>

                                        <button
                                            onClick={handleSubmit}
                                            className="w-full h-11 bg-[var(--primary-accent)] hover:opacity-90 active:scale-[0.98] text-black font-extrabold rounded-full transition-all shadow-md flex items-center justify-center gap-2 text-sm cursor-pointer"
                                        >
                                            Continue <ArrowRight size={16} />
                                        </button>
                                    </>
                                )}

                                {authMode === 'signin' && (
                                    <div className="w-full space-y-4">
                                        <button
                                            onClick={handleGoogleSignIn}
                                            disabled={isAuthenticating}
                                            className="w-full h-11 bg-white hover:bg-neutral-100 active:scale-[0.98] text-black font-semibold rounded-full transition-all shadow-md flex items-center justify-center gap-3 text-sm cursor-pointer disabled:opacity-50"
                                        >
                                            {isAuthenticating ? <Loader2 className="animate-spin text-black" size={18} /> : <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-4 h-4" />}
                                            Continue with Google
                                        </button>

                                        <form onSubmit={handleEmailSignIn} className="space-y-4">
                                            <div className="flex items-center gap-4 text-white/20 py-1">
                                                <div className="h-px flex-1 bg-current"></div>
                                                <span className="text-[10px] font-bold uppercase tracking-widest">Or sign in with email</span>
                                                <div className="h-px flex-1 bg-current"></div>
                                            </div>

                                            <div className="space-y-1 text-left relative">
                                                <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--primary-accent)] pl-1">Email Address</label>
                                                <div className="relative">
                                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                                                    <input 
                                                        type="email" 
                                                        value={email} 
                                                        onChange={e => setEmail(e.target.value)} 
                                                        placeholder="name@example.com" 
                                                        className="w-full bg-white/5 hover:bg-white/10 focus:bg-white/10 text-white placeholder:text-white/30 py-3 pl-12 pr-4 rounded-xl border border-white/10 text-sm focus:border-[var(--primary-accent)] focus:ring-[var(--primary-accent)] focus:ring-1 transition-all outline-none" 
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-1 text-left relative">
                                                <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--primary-accent)] pl-1">Password</label>
                                                <div className="relative">
                                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                                                    <input 
                                                        type={showPassword ? 'text' : 'password'} 
                                                        value={password} 
                                                        onChange={e => setPassword(e.target.value)} 
                                                        placeholder="••••••••" 
                                                        className="w-full bg-white/5 hover:bg-white/10 focus:bg-white/10 text-white placeholder:text-white/30 py-3 pl-12 pr-12 rounded-xl border border-white/10 text-sm focus:border-[var(--primary-accent)] focus:ring-[var(--primary-accent)] focus:ring-1 transition-all outline-none" 
                                                        required
                                                    />
                                                    <button 
                                                        type="button" 
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white cursor-pointer transition-colors"
                                                    >
                                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                    </button>
                                                </div>
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={isAuthenticating}
                                                className="w-full h-11 bg-[var(--primary-accent)] hover:opacity-90 active:scale-[0.98] text-black font-extrabold rounded-full transition-all shadow-md flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-50"
                                            >
                                                {isAuthenticating ? <Loader2 className="animate-spin text-black" size={18} /> : <>Sign In <ArrowRight size={16} /></>}
                                            </button>
                                        </form>
                                    </div>
                                )}

                                {authMode === 'signup' && (
                                    <div className="w-full space-y-4">
                                        <button
                                            onClick={handleGoogleSignIn}
                                            disabled={isAuthenticating}
                                            className="w-full h-11 bg-white hover:bg-neutral-100 active:scale-[0.98] text-black font-semibold rounded-full transition-all shadow-md flex items-center justify-center gap-3 text-sm cursor-pointer disabled:opacity-50"
                                        >
                                            {isAuthenticating ? <Loader2 className="animate-spin text-black" size={18} /> : <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-4 h-4" />}
                                            Continue with Google
                                        </button>

                                        <form onSubmit={handleEmailSignUp} className="space-y-4">
                                            <div className="flex items-center gap-4 text-white/20 py-1">
                                                <div className="h-px flex-1 bg-current"></div>
                                                <span className="text-[10px] font-bold uppercase tracking-widest">Or create account</span>
                                                <div className="h-px flex-1 bg-current"></div>
                                            </div>

                                            <div className="space-y-1 text-left relative">
                                                <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--primary-accent)] pl-1">Your Name</label>
                                                <input 
                                                    type="text" 
                                                    value={name} 
                                                    onChange={e => setName(e.target.value)} 
                                                    placeholder="Enter your name" 
                                                    className="w-full bg-white/5 hover:bg-white/10 focus:bg-white/10 text-white placeholder:text-white/30 py-3 px-4 rounded-xl border border-white/10 text-sm focus:border-[var(--primary-accent)] focus:ring-[var(--primary-accent)] focus:ring-1 transition-all outline-none" 
                                                    required
                                                />
                                            </div>

                                            <div className="space-y-1 text-left relative">
                                                <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--primary-accent)] pl-1">Email Address</label>
                                                <div className="relative">
                                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                                                    <input 
                                                        type="email" 
                                                        value={email} 
                                                        onChange={e => setEmail(e.target.value)} 
                                                        placeholder="name@example.com" 
                                                        className="w-full bg-white/5 hover:bg-white/10 focus:bg-white/10 text-white placeholder:text-white/30 py-3 pl-12 pr-4 rounded-xl border border-white/10 text-sm focus:border-[var(--primary-accent)] focus:ring-[var(--primary-accent)] focus:ring-1 transition-all outline-none" 
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-1 text-left relative">
                                                <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--primary-accent)] pl-1">Password</label>
                                                <div className="relative">
                                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                                                    <input 
                                                        type={showPassword ? 'text' : 'password'} 
                                                        value={password} 
                                                        onChange={e => setPassword(e.target.value)} 
                                                        placeholder="••••••••" 
                                                        className="w-full bg-white/5 hover:bg-white/10 focus:bg-white/10 text-white placeholder:text-white/30 py-3 pl-12 pr-12 rounded-xl border border-white/10 text-sm focus:border-[var(--primary-accent)] focus:ring-[var(--primary-accent)] focus:ring-1 transition-all outline-none" 
                                                        required
                                                    />
                                                    <button 
                                                        type="button" 
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white cursor-pointer transition-colors"
                                                    >
                                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                    </button>
                                                </div>
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={isAuthenticating}
                                                className="w-full h-11 bg-[var(--primary-accent)] hover:opacity-90 active:scale-[0.98] text-black font-extrabold rounded-full transition-all shadow-md flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-50"
                                            >
                                                {isAuthenticating ? <Loader2 className="animate-spin text-black" size={18} /> : <>Register <ArrowRight size={16} /></>}
                                            </button>
                                        </form>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                        
                        <p className="mt-6 text-white/40 text-[10px]">By continuing, you agree to vibe responsibly.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Onboarding;
