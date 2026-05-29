import React, { useState, useEffect } from 'react';
import { Share2, RefreshCw, Check } from 'lucide-react';
import { quotesService, Quote } from '../services/quotesService.ts';
import { shareTextOrUrl } from '../utils/helpers.ts';
import { Capacitor } from '@capacitor/core';

interface DailyQuoteProps {
  size?: 'small' | 'large';
  showControls?: boolean; // show New/Share buttons
  autoRefresh?: boolean;  // get new quote on mount
}

export const DailyQuote: React.FC<DailyQuoteProps> = ({
  size = 'large',
  showControls = true,
  autoRefresh = false
}) => {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [animationKey, setAnimationKey] = useState<number>(0);

  const fetchQuote = async (isDaily = true) => {
    setLoading(true);
    try {
      const q = isDaily ? await quotesService.getDailyQuote() : await quotesService.getRandomQuote();
      setQuote(q);
      setAnimationKey(prev => prev + 1); // trigger re-render of letter animation
    } catch (e) {
      console.error("Error fetching quote:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuote(!autoRefresh);
  }, [autoRefresh]);

  const handleShare = async () => {
    if (!quote) return;
    const shareText = `"${quote.text}" — ${quote.author}\n\nShared from Mwijay Music App`;
    
    await shareTextOrUrl('Music Quote - Mwijay', shareText, undefined);
    
    if (typeof navigator !== 'undefined' && !navigator.share && !Capacitor.isNativePlatform()) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNewQuote = () => {
    fetchQuote(false);
  };

  if (loading || !quote) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/30 p-6 backdrop-blur-md animate-pulse min-h-[140px] flex items-center justify-center">
        <div className="text-white/40 text-sm font-medium flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin text-purple-400" />
          <span>Tuning into wisdom...</span>
        </div>
      </div>
    );
  }

  const isSmall = size === 'small';
  const characters = quote.text.split('');

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-white/20">
      {/* Glow highlight */}
      <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-purple-500/10 blur-[80px]" />
      <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-blue-500/10 blur-[80px]" />

      <style>{`
        @keyframes fadeInLetter {
          from {
            opacity: 0;
            transform: translateY(3px);
            filter: blur(1px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
        }
        .animate-fade-in-letter {
          display: inline-block;
          white-space: pre-wrap;
          animation: fadeInLetter 0.3s ease-out forwards;
        }
      `}</style>

      <div className={`flex flex-col ${isSmall ? 'items-start text-left' : 'items-center text-center'} w-full`}>
        {/* Quote body */}
        <div className={`w-full ${isSmall ? 'text-base line-clamp-2' : 'text-xl md:text-2xl font-light tracking-wide leading-relaxed'} text-white/95`}>
          {!isSmall && <span className="text-purple-400 font-serif mr-1">“</span>}
          <span key={animationKey} className="inline">
            {characters.map((char, index) => (
              <span
                key={`${char}-${index}`}
                className="animate-fade-in-letter"
                style={{
                  animationDelay: `${index * 0.015}s`,
                  opacity: 0,
                }}
              >
                {char}
              </span>
            ))}
          </span>
          {!isSmall && <span className="text-purple-400 font-serif ml-1">”</span>}
        </div>

        {/* Author */}
        <div className={`mt-3 text-xs md:text-sm font-medium ${isSmall ? 'text-white/60' : 'text-purple-300/80 tracking-widest uppercase mt-4'}`}>
          — {quote.author}
        </div>

        {/* Controls */}
        {showControls && (
          <div className="mt-5 flex items-center justify-center gap-3 w-full border-t border-white/5 pt-4">
            <button
              onClick={handleNewQuote}
              className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/80 transition-all hover:bg-white/[0.08] hover:text-white active:scale-95"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>New Quote</span>
            </button>
            
            <button
              onClick={handleShare}
              className="flex items-center gap-2 rounded-xl bg-purple-500/20 px-4 py-2 text-xs font-semibold text-purple-200 transition-all hover:bg-purple-500/30 hover:text-white active:scale-95"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-green-400 animate-bounce" />
                  <span className="text-green-400">Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="h-3.5 w-3.5" />
                  <span>Share</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
