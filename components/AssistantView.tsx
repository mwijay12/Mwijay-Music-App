import React, { useState, useEffect, useRef } from 'react';
import type { ChatMessage, ProfileData } from '../types.ts';
import TypingIndicator from './TypingIndicator.tsx';
import TextGenerateEffect from './TextGenerateEffect.tsx';
import { assistantPrompts } from './constants.ts';

declare const webkitSpeechRecognition: any;

interface AssistantViewProps {
  messages: ChatMessage[];
  onSendMessage: (text: string, file?: File) => void;
  onClose: () => void;
  onToggleInputView: () => void;
  isInputVisible: boolean;
  profile: ProfileData | null;
  showNotification: (message: string, type?: 'success' | 'info' | 'error') => void;
  isOnline: boolean;
  toggleOnlineMode: () => void;
}

const AssistantView: React.FC<AssistantViewProps> = ({ messages, onSendMessage, onClose, onToggleInputView, isInputVisible, profile, showNotification, isOnline, toggleOnlineMode }) => {
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // TTS Effect
  useEffect(() => {
    if (!profile?.settings.assistantVoice.enabled || typeof window === 'undefined' || !window.speechSynthesis) {
        return;
    }
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.sender === 'assistant') {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(lastMessage.text);
        window.speechSynthesis.speak(utterance);
    }
    return () => window.speechSynthesis.cancel();
  }, [messages, profile?.settings.assistantVoice.enabled]);

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

  return (
    <div className="fixed inset-0 bg-[var(--surface-color)] z-[60] flex flex-col">
      <header className="flex items-center justify-between p-4 border-b border-[var(--surface-border-color)] flex-shrink-0">
        <div className="flex items-center gap-3">
          <i className="fas fa-brain text-xl text-[var(--primary-accent)]"></i>
          <h2 className="font-bold text-lg">Mwijay Assistant</h2>
          <button onClick={toggleOnlineMode} className={`text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1.5 transition-opacity hover:opacity-80 ${isOnline ? 'bg-green-500/30 text-green-300' : 'bg-gray-500/30 text-gray-300'}`} title={`Switch to ${isOnline ? 'Local' : 'Online'} Assistant`}>
            {isOnline ? 'Online' : 'Offline'} <i className="fas fa-sync-alt text-[10px]"></i>
          </button>
        </div>
        <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]" aria-label="Close Assistant" title="Close Assistant">
          <i className="fas fa-times text-2xl"></i>
        </button>
      </header>
      
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((msg, index) => {
          const isLastMessage = index === messages.length - 1;
          const isAssistant = msg.sender === 'assistant';

          if (msg.sender === 'loading') {
              return <TypingIndicator key={msg.id} />;
          }

          return (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`rounded-lg p-3 max-w-xs md:max-w-md break-words ${msg.sender === 'user' ? 'bg-[var(--primary-accent)] text-black' : 'bg-[var(--chip-bg)]'}`}>
                      {msg.file && (
                          <img src={`data:${msg.file.mimeType};base64,${msg.file.data}`} alt="User upload" className="rounded-lg mb-2 max-w-full h-auto" />
                      )}
                      {isAssistant && isLastMessage && profile?.settings.assistantVoice.enabled ? (
                          <TextGenerateEffect words={msg.text} />
                      ) : (
                          <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                      )}
                  </div>
              </div>
          );
        })}
         {messages.length === 0 && (
           <div className="text-center text-neutral-400 pt-10">
              <i className="fas fa-brain text-4xl text-[var(--primary-accent)]"></i>
              <p className="font-bold mt-4">Hi, I'm Mwijay!</p>
              <p className="text-sm">{isOnline ? "Ask me to play music, analyze an image, and more." : "Ask me to play music, change themes, and more."}</p>
           </div>
         )}
         <div ref={messagesEndRef} />
      </div>
      
      {isInputVisible && (
          <div className="px-4 pb-2 pt-2 border-t border-[var(--surface-border-color)] flex-shrink-0">
              <div className="prompt-scroller">
                <div className="prompt-scroller-content">
                    {assistantPrompts.map(p => (
                        <button key={p} onClick={() => onSendMessage(p, undefined)} className="bg-[var(--chip-bg)] py-1.5 px-3 rounded-full text-sm hover:bg-[var(--surface-color)]">"{p}"</button>
                    ))}
                </div>
              </div>
              {previewUrl && (
                    <div className="mt-2 p-2 relative inline-block">
                        <img src={previewUrl} alt="File preview" className="w-20 h-20 object-cover rounded-lg border border-white/20" />
                        <button onClick={() => setSelectedFile(null)} className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold" title="Remove image">&times;</button>
                    </div>
                )}
          </div>
      )}

        {isInputVisible ? (
             <form onSubmit={handleSubmit} className="p-4 pt-2 flex items-center gap-3 flex-shrink-0 bg-[var(--surface-color)]">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center transition-colors bg-[var(--chip-bg)] disabled:opacity-50" aria-label="Attach image" title={isOnline ? "Attach an image" : "Image upload is available in online mode"} disabled={!isOnline}>
                <i className="fas fa-paperclip text-xl text-white"></i>
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={isOnline ? "Ask about the image or anything else..." : "Ask me anything..."}
                className="flex-1 bg-[var(--chip-bg)] rounded-full py-3 px-5 text-[var(--text-primary)] placeholder-[var(--text-secondary)] border border-[var(--surface-border-color)] outline-none focus:ring-2 focus:ring-[var(--primary-accent)]"
              />
              <button type="button" onClick={handleMicClick} className={`w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center transition-colors ${isListening ? 'bg-red-500 animate-pulse' : 'bg-[var(--primary-accent)]'}`} aria-label="Use microphone" title={isListening ? 'Stop listening' : 'Use microphone'}>
                <i className={`fas fa-microphone text-xl ${isListening ? 'text-white' : 'text-black'}`}></i>
              </button>
              <button type="submit" className="w-12 h-12 rounded-full flex-shrink-0 bg-[var(--primary-accent)] flex items-center justify-center" aria-label="Send message" title="Send message">
                <i className="fas fa-paper-plane text-black text-xl"></i>
              </button>
            </form>
        ): (
            <div className="absolute bottom-4 right-4">
                <button onClick={onToggleInputView} className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white" aria-label="Show input bar" title="Show input bar">
                    <i className="fas fa-keyboard"></i>
                </button>
            </div>
        )}
    </div>
  );
};

export default AssistantView;
