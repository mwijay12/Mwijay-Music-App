import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Check, X, ShieldAlert, Sparkles } from 'lucide-react';
import { microphoneService } from '../services/microphoneService';

interface KaraokePermissionProps {
  onPermissionGranted: () => void;
  onClose: () => void;
}

export const KaraokePermission: React.FC<KaraokePermissionProps> = ({
  onPermissionGranted,
  onClose,
}) => {
  const [status, setStatus] = useState<'prompt' | 'granted' | 'denied' | 'checking'>('prompt');
  const [audioLevel, setAudioLevel] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const handleRequestAccess = async () => {
    setStatus('checking');
    setErrorMsg('');
    
    const result = await microphoneService.requestPermission();
    
    if (result.granted) {
      setStatus('granted');
      // Start listening briefly so they see their mic level working
      microphoneService.startListening((level) => {
        setAudioLevel(level);
      });
      
      // Auto transition after 3 seconds of cool microhpone feedback
      setTimeout(() => {
        microphoneService.stopListening();
        onPermissionGranted();
      }, 3000);
    } else {
      setStatus('denied');
      setErrorMsg(result.error || 'Access denied. Please enable mic inside system settings.');
    }
  };

  useEffect(() => {
    return () => {
      microphoneService.stopListening();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="liquid-glass-pane rounded-3xl border border-white/10 p-6 max-w-sm w-full text-center space-y-6 bg-[var(--surface-color)]/95 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b border-white/5 pb-3">
          <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-[var(--text-secondary)]">
            <Mic size={14} className="text-[var(--primary-accent)]" />
            <span>Voice Assistant</span>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={18} /></button>
        </div>

        <AnimatePresence mode="wait">
          {status === 'prompt' && (
            <motion.div
              key="prompt"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="w-16 h-16 bg-violet-600/20 border border-violet-500/30 text-violet-400 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-violet-500/10">
                <Mic size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black text-[var(--text-primary)]">Enable Karaoke Mic</h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed px-2">
                  We need microphone permission so you can sing along, hear yourself through the effects, and record your performance!
                </p>
              </div>
              
              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={handleRequestAccess}
                  className="w-full bg-[var(--primary-accent)] text-black font-extrabold py-3.5 rounded-full hover:scale-102 active:scale-98 transition-transform text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles size={16} /> Allow Microphone Access
                </button>
                <button
                  onClick={onClose}
                  className="w-full text-center text-xs text-[var(--text-secondary)] hover:text-white py-2"
                >
                  No, thank you
                </button>
              </div>
            </motion.div>
          )}

          {status === 'checking' && (
            <motion.div
              key="checking"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-12 space-y-4"
            >
              <div className="flex space-x-1.5 justify-center items-center py-4">
                <div className="w-2.5 h-2.5 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-2.5 h-2.5 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                <div className="w-2.5 h-2.5 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">Awaiting microphone approval...</p>
            </motion.div>
          )}

          {status === 'granted' && (
            <motion.div
              key="granted"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="w-16 h-16 bg-green-500/20 border border-green-500/30 text-green-400 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-green-500/10">
                <Check size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black text-green-400">Vocal Active!</h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Mic approved. Try speaking into your microphone to test the feedback bar:
                </p>
              </div>

              {/* Dynamic Sound Level Bar */}
              <div className="w-full bg-white/5 border border-white/10 h-6 rounded-full overflow-hidden relative">
                <div 
                  className="h-full bg-gradient-to-r from-violet-500 to-[var(--primary-accent)] transition-all duration-75"
                  style={{ width: `${Math.min(100, Math.max(10, audioLevel * 100))}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white/80">
                  {Math.round(audioLevel * 100)}% Input Vibe
                </span>
              </div>
              
              <p className="text-[10px] text-neutral-500 animate-pulse pt-2">Starting Karaoke mode in a moment...</p>
            </motion.div>
          )}

          {status === 'denied' && (
            <motion.div
              key="denied"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="w-16 h-16 bg-red-500/20 border border-red-500/30 text-red-400 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-red-500/10">
                <ShieldAlert size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black text-red-400">Microphone Denied</h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed px-2">
                  {errorMsg}
                </p>
              </div>
              
              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={handleRequestAccess}
                  className="w-full bg-white/10 hover:bg-white/20 text-white font-extrabold py-3.5 rounded-full transition-colors text-xs uppercase tracking-wider"
                >
                  Try Request Again
                </button>
                <button
                  onClick={onClose}
                  className="w-full text-center text-xs text-[var(--text-secondary)] hover:text-white py-2"
                >
                  Close Panel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
