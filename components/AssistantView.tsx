
import React, { useState, useEffect, useRef } from 'react';
import type { ChatMessage } from '../types.ts';
import TypingIndicator from './TypingIndicator.tsx';
import TextGenerateEffect from './TextGenerateEffect.tsx';
import { useInterruptibleScroll } from '../hooks/useInterruptibleScroll.ts';
import { 
    Brain, 
    History, 
    X, 
    Paperclip, 
    Mic, 
    Send, 
    ChevronLeft,
    RefreshCw,
    Trash2
} from 'lucide-react';

declare const webkitSpeechRecognition: any;

interface AssistantViewProps {
  messages: ChatMessage[];
  onSendMessage: (text: string, file?: File) => void;
  onClose: () => void;
  showNotification: (message: string, type?: 'success' | 'info' | 'error') => void;
  isOnline: boolean;
  toggleOnlineMode: () => void;
  onShowHistory: () => void;
  isTtsSpeaking: boolean;
}

const onlinePrompts = [
    'Generate lyrics about space',
    'Create an AI Playlist',
    'Search online for Lo-Fi',
    'I want a pink theme',
    'Analyze this image',
    'Find stations near me',
    'What is the history of Jazz?'
];

const offlinePrompts = [
    'Play some music',
    'What song is this?',
    'Play songs by Drake',
    'Change theme to Saba Saba',
    'Set sleep timer for 15 mins',
    'Change font to Poppins',
    'Create playlist "My Jams"',
    'Toggle shuffle',
    'Open equalizer'
];

const AssistantView: React.FC<AssistantViewProps> = ({ messages, onSendMessage, onClose, showNotification, isOnline, toggleOnlineMode, onShowHistory, isTtsSpeaking }) => {
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  useInterruptibleScroll(scrollerRef, contentRef);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
   useEffect(() => {
    if (selectedFile) {
        const url = URL.createObjectURL(selectedFile);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    } else {
        setPreviewUrl(null);
    }
  }, [selectedFile]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
            showNotification("Microphone access denied. Please allow it in your browser settings to use voice commands.", 'error');
        } else {
            showNotification(`Speech recognition error: ${event.error}`, 'error');
        }
        setIsListening(false);
      };
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        onSendMessage(transcript);
        setInputText('');
      };
      recognitionRef.current = recognition;
    }
  }, [onSendMessage, showNotification]);

  const handleMicClick = () => {
    if (!recognitionRef.current) {
        showNotification("Sorry, your browser doesn't support speech recognition.", 'error');
        return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
        setSelectedFile(file);
    } else if (file) {
        showNotification('Please select an image file.', 'error');
    }
    if(e.target) e.target.value = ''; // Reset to allow re-upload
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !selectedFile) return;
    onSendMessage(inputText, selectedFile || undefined);
    setInputText('');
    setSelectedFile(null);
  };
  
  const activePrompts = isOnline ? [...offlinePrompts, ...onlinePrompts].sort(() => 0.5 - Math.random()) : offlinePrompts;

  const PromptSamples = () => (
    <>
      {activePrompts.map((p, i) => (
          <button 
            key={p} 
            onClick={() => onSendMessage(p)} 
            className="bg-[var(--chip-bg)] py-2 px-4 rounded-xl text-sm hover:bg-[var(--surface-color)] flex-shrink-0 border border-white/5 transition-all hover:scale-105 active:scale-95 hover:border-[var(--primary-accent)]/30 group relative overflow-hidden prompt-bounce-anim"
            style={{ animationDelay: `${i * 0.2}s` }}
          >
            <span className="relative z-10">"{p}"</span>
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--primary-accent)]/0 via-[var(--primary-accent)]/5 to-[var(--primary-accent)]/0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
      ))}
    </>
  );

  return (
    <div className="fixed inset-0 bg-[var(--surface-color)] z-[300] flex flex-col"
        style={{
            transition: 'opacity 0.5s ease-in-out',
            animation: 'achievement-pop-in-anim 0.5s ease-out forwards',
        }}
    >
      <header className="flex items-center justify-between p-4 border-b border-[var(--surface-border-color)] flex-shrink-0 bg-[var(--surface-color)]/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose} 
            className="group flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-full transition-all border border-white/5 active:scale-95" 
            aria-label="Go back"
          >
            <ChevronLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-sm font-bold">Back</span>
          </button>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <Brain size={18} className="text-[var(--primary-accent)]" />
              <h2 className="font-black text-base tracking-tight">Mwijay AI</h2>
            </div>
            <button onClick={toggleOnlineMode} className={`text-[9px] uppercase tracking-widest font-black px-2 py-0.5 rounded-full flex items-center gap-1 transition-all hover:scale-105 ${isOnline ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'}`}>
              <span className={`w-1 h-1 rounded-full ${isOnline ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></span>
              {isOnline ? 'Online' : 'Offline'}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={onShowHistory} className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]" aria-label="View chat history" title="View chat history">
                <History size={20} />
            </button>
            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]" aria-label="Close Assistant" title="Close Assistant">
                <X size={24} />
            </button>
        </div>
      </header>
      
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((msg, index) => {
          const isLastMessage = index === messages.length - 1;
          const isAssistant = msg.sender === 'assistant';

          if (msg.sender === 'loading') {
              return <TypingIndicator key={msg.id} />;
          }
          
          if (msg.sender === 'greeting' && index === 0) {
              return (
                  <div key={msg.id} className="text-center text-neutral-300 pt-16 pb-8 flex flex-col items-center">
                      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[var(--primary-accent)] to-amber-500 flex items-center justify-center mb-6 shadow-2xl shadow-[var(--primary-accent)]/20 animate-pulse">
                        <Brain size={40} className="text-black" />
                      </div>
                      <TextGenerateEffect words={msg.text} className="text-2xl font-black tracking-tight max-w-xs mx-auto" />
                      <p className="mt-4 text-sm text-white/40 font-medium">How can I help you today?</p>
                  </div>
              );
          }

          return (
              <div key={msg.id} className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                  {isAssistant && (
                      <div className="w-8 h-8 rounded-full bg-[var(--primary-accent)]/20 flex items-center justify-center flex-shrink-0 mt-1">
                          <Brain size={16} className="text-[var(--primary-accent)]" />
                      </div>
                  )}
                  <div className={`relative group px-4 py-2.5 rounded-2xl max-w-[85%] md:max-w-[75%] break-words shadow-sm ${
                      msg.sender === 'user' 
                          ? 'bg-[var(--primary-accent)] text-black rounded-tr-none' 
                          : 'bg-[var(--chip-bg)] text-[var(--text-primary)] rounded-tl-none border border-white/5'
                  }`}>
                      {msg.file && (
                          <div className="mb-2 overflow-hidden rounded-xl border border-black/10">
                              <img src={`data:${msg.file.mimeType};base64,${msg.file.data}`} alt="User upload" className="w-full h-auto object-cover max-h-60" />
                          </div>
                      )}
                      <div className="text-sm leading-relaxed">
                        {isAssistant && isLastMessage ? (
                            <TextGenerateEffect words={msg.text} />
                        ) : (
                            <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                        )}
                      </div>
                       {msg.sources && msg.sources.length > 0 && (
                          <div className="mt-3 pt-2 border-t border-white/10 space-y-1">
                              <h4 className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">Sources</h4>
                              {msg.sources.map((source, i) => (
                                  <a href={source.uri} target="_blank" rel="noopener noreferrer" key={i} className="flex items-center gap-1.5 text-[11px] text-[var(--primary-accent)] hover:underline truncate" title={source.title}>
                                      <span className="w-1 h-1 rounded-full bg-[var(--primary-accent)]" />
                                      {source.title}
                                  </a>
                              ))}
                          </div>
                      )}
                  </div>
                  {isAssistant && isLastMessage && isTtsSpeaking && (
                        <div className="tts-indicator self-end mb-2" title="Speaking...">
                           <span></span><span style={{animationDelay: '0.2s'}}></span><span style={{animationDelay: '0.1s'}}></span>
                        </div>
                   )}
              </div>
          );
        })}
         <div ref={messagesEndRef} />
      </div>
      
        <div className="px-4 pb-2 pt-2 border-t border-[var(--surface-border-color)] flex-shrink-0 bg-[var(--surface-color)]/50 backdrop-blur-sm">
            <div ref={scrollerRef} className="prompt-scroller gpu-accelerated-scroll">
                <div ref={contentRef} className="slow-scroll-horizontal-content gap-2">
                    <PromptSamples />
                    <PromptSamples />
                </div>
            </div>
            {previewUrl && (
                <div className="mt-2 p-2 relative inline-block group">
                    <img src={previewUrl} alt="File preview" className="w-20 h-20 object-cover rounded-xl border border-white/10 shadow-lg" />
                    <button onClick={() => setSelectedFile(null)} className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md hover:bg-red-600 transition-colors" title="Remove image">
                        <X size={14} />
                    </button>
                </div>
            )}
        </div>

        <form onSubmit={handleSubmit} className="p-4 flex items-center gap-3 flex-shrink-0 bg-[var(--surface-color)] border-t border-[var(--surface-border-color)]">
            <div className="relative flex-1 flex items-center">
                <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={isOnline ? "Ask about an image or..." : "Ask me anything..."}
                    className="w-full bg-[var(--chip-bg)] rounded-2xl py-3 pl-12 pr-12 text-[var(--text-primary)] placeholder-[var(--text-secondary)] border border-[var(--surface-border-color)] outline-none focus:ring-2 focus:ring-[var(--primary-accent)]/50 transition-all"
                />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute left-3 w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center transition-colors hover:bg-white/5 disabled:opacity-30" aria-label="Attach image" title={isOnline ? "Attach an image" : "Image upload is available in online mode"} disabled={!isOnline}>
                    <Paperclip size={18} className="text-[var(--text-secondary)]" />
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
                <button type="button" onClick={handleMicClick} className={`absolute right-3 w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center transition-all ${isListening ? 'bg-red-500/20 text-red-400' : 'hover:bg-white/5 text-[var(--text-secondary)]'}`} aria-label="Use microphone" title={isListening ? 'Stop listening' : 'Use microphone'}>
                    <Mic size={18} className={isListening ? 'animate-pulse' : ''} />
                </button>
            </div>
            <button type="submit" disabled={!inputText.trim() && !selectedFile} className="w-12 h-12 rounded-2xl flex-shrink-0 bg-[var(--primary-accent)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center shadow-lg shadow-[var(--primary-accent)]/20 disabled:opacity-50 disabled:hover:scale-100" aria-label="Send message" title="Send message">
                <Send size={20} className="text-black" />
            </button>
        </form>
    </div>
  );
};

export default AssistantView;
