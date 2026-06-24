import { useState } from 'react';
import { motion } from 'framer-motion';
import { aiService } from '../services/aiService.ts';
import { LyricsAnalysis as AnalysisType } from '../services/lyricsAiService';
import { Sparkles, BrainCircuit, RefreshCw, MessageSquare } from 'lucide-react';

interface LyricsAnalysisProps {
  songTitle: string;
  artist: string;
  lyricsText: string;
}

export function LyricsAnalysis({ 
  songTitle, 
  artist, 
  lyricsText 
}: LyricsAnalysisProps) {
  const [analysis, setAnalysis] = useState<AnalysisType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleAnalyze = async () => {
    setLoading(true);
    setError('');
    
    try {
      const result = await aiService.analyzeLyrics(
        songTitle, 
        artist, 
        lyricsText
      );
      
      if (result) {
        setAnalysis(result);
      } else {
        setError('Could not analyze lyrics. Try again.');
      }
    } catch (e: any) {
      setError(e.message || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };
  
  if (!analysis && !loading) {
    return (
      <div className="bg-black/30 rounded-2xl p-6 border border-white/5 text-center flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 bg-[var(--primary-accent)]/10 rounded-full flex items-center justify-center text-[var(--primary-accent)]">
          <BrainCircuit size={24} />
        </div>
        <div>
          <h3 className="font-bold text-base text-[var(--text-primary)]">AI Lyrics Analysis</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-[280px] mx-auto leading-relaxed">
            Get deep neurological insights about this song's theme, underlying emotions, metaphors, and story.
          </p>
        </div>
        <button 
          onClick={handleAnalyze}
          className="w-full bg-[var(--primary-accent)] text-black font-extrabold py-3.5 rounded-full hover:scale-102 active:scale-98 transition-transform text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[var(--primary-accent)]/10"
        >
          <Sparkles size={16} /> Analyze Vibe & Meaning
        </button>
        {error && <div className="text-red-400 text-xs mt-1">{error}</div>}
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className="bg-black/30 rounded-2xl p-8 border border-white/5 text-center flex flex-col items-center justify-center space-y-4 min-h-[250px]">
        <div className="flex space-x-1.5 justify-center items-center">
          <div className="w-2 h-2 bg-[var(--primary-accent)] rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
          <div className="w-2 h-2 bg-[var(--primary-accent)] rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
          <div className="w-2 h-2 bg-[var(--primary-accent)] rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
        </div>
        <p className="text-xs text-[var(--text-secondary)]">AI is analyzing the lyrics & mood...</p>
      </div>
    );
  }
  
  return (
    <motion.div 
      className="space-y-4 text-left"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="p-4 bg-black/20 rounded-2xl border border-white/5 space-y-3">
        <div className="flex items-center gap-2 text-[var(--primary-accent)] font-bold text-xs uppercase tracking-wider">
          <Sparkles size={14} /> Theme & Mood
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-white/5 rounded-xl border border-white/5">
            <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">🎯 Core Theme</span>
            <p className="text-sm font-bold text-[var(--text-primary)] mt-0.5">{analysis?.theme}</p>
          </div>
          <div className="p-3 bg-white/5 rounded-xl border border-white/5">
            <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">💫 Vibe & Mood</span>
            <p className="text-sm font-bold text-[var(--text-primary)] mt-0.5">{analysis?.mood}</p>
          </div>
        </div>
      </div>
      
      <div className="p-4 bg-black/20 rounded-2xl border border-white/5 space-y-2">
        <h4 className="font-bold text-xs text-[var(--text-secondary)] uppercase tracking-wider">📖 Core Meaning</h4>
        <p className="text-sm text-[var(--text-primary)] leading-relaxed">{analysis?.meaning}</p>
      </div>
      
      <div className="p-4 bg-black/20 rounded-2xl border border-white/5 space-y-2">
        <h4 className="font-bold text-xs text-[var(--text-secondary)] uppercase tracking-wider">📖 The Story</h4>
        <p className="text-sm text-[var(--text-primary)] leading-relaxed">{analysis?.story}</p>
      </div>
      
      {analysis?.emotions && analysis.emotions.length > 0 && (
        <div className="p-4 bg-black/20 rounded-2xl border border-white/5 space-y-2.5">
          <h4 className="font-bold text-xs text-[var(--text-secondary)] uppercase tracking-wider">💭 Emotions</h4>
          <div className="flex flex-wrap gap-2">
            {analysis.emotions.map((emotion, idx) => (
              <span key={idx} className="text-xs bg-[var(--primary-accent)]/15 border border-[var(--primary-accent)]/20 text-[var(--primary-accent)] px-3 py-1 rounded-full font-medium">
                {emotion}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {analysis?.key_lines && analysis.key_lines.length > 0 && (
        <div className="p-4 bg-black/20 rounded-2xl border border-white/5 space-y-3">
          <h4 className="font-bold text-xs text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
            <MessageSquare size={14} className="text-[var(--primary-accent)]" /> Impactful Lines
          </h4>
          <div className="space-y-2">
            {analysis.key_lines.map((line, idx) => (
              <blockquote key={idx} className="border-l-2 border-[var(--primary-accent)]/40 pl-3 italic text-xs text-[var(--text-secondary)] py-0.5 leading-relaxed">
                "{line}"
              </blockquote>
            ))}
          </div>
        </div>
      )}

      {analysis?.metaphors && analysis.metaphors.length > 0 && (
        <div className="p-4 bg-black/20 rounded-2xl border border-white/5 space-y-2">
          <h4 className="font-bold text-xs text-[var(--text-secondary)] uppercase tracking-wider">🎭 Notable Metaphors</h4>
          <ul className="list-disc list-inside text-xs text-[var(--text-secondary)] space-y-1 pl-1">
            {analysis.metaphors.map((m, idx) => (
              <li key={idx} className="leading-relaxed">{m}</li>
            ))}
          </ul>
        </div>
      )}
      
      <button 
        onClick={handleAnalyze}
        className="w-full bg-white/5 text-[var(--text-primary)] border border-white/10 font-bold py-3.5 rounded-full hover:bg-white/10 transition-colors text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer mt-2"
      >
        <RefreshCw size={14} /> Re-analyze Lyrics
      </button>
    </motion.div>
  );
}
