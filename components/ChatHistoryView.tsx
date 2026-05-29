import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, MessageSquareOff, Trash2 } from 'lucide-react';
import { getChatHistory, deleteChatHistory, type ChatHistoryItem } from './db.ts';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatHistoryViewProps {
    onLoadChat: (id: string) => void;
    onBack: () => void;
}

const ChatHistoryView: React.FC<ChatHistoryViewProps> = ({ onLoadChat, onBack }) => {
    const [history, setHistory] = useState<ChatHistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadHistory = async () => {
            setIsLoading(true);
            const items = await getChatHistory();
            setHistory(items);
            setIsLoading(false);
        };
        loadHistory();
    }, []);

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        await deleteChatHistory(id);
        setHistory(prev => prev.filter(item => item.id !== id));
    };

    return (
        <div className="fixed inset-0 bg-[var(--surface-color)] z-[61] flex flex-col">
            <header className="flex items-center justify-between p-4 border-b border-[var(--surface-border-color)] flex-shrink-0">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="text-xl w-8 h-8 flex items-center justify-center">
                         <ArrowLeft size={20} />
                    </button>
                    <h2 className="font-bold text-lg">Chat History</h2>
                </div>
            </header>
            
            <div className="flex-1 p-4 overflow-y-auto">
                {isLoading ? (
                    <div className="flex justify-center items-center h-full">
                        <Loader2 className="animate-spin text-2xl" />
                    </div>
                ) : history.length === 0 ? (
                    <div className="flex flex-col justify-center items-center h-full text-neutral-400 text-center">
                        <MessageSquareOff size={48} className="mb-4" />
                        <p>No chat history yet.</p>
                        <p className="text-sm">Your conversations with the assistant will be saved here.</p>
                    </div>
                ) : (
                    <ul className="space-y-3">
                        <AnimatePresence>
                            {history.map(item => (
                                <motion.li
                                    key={item.id}
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -50 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <div 
                                        onClick={() => onLoadChat(item.id)}
                                        className="bg-white/5 rounded-lg p-3 group hover:bg-white/10 transition-colors cursor-pointer"
                                    >
                                        <div className="flex justify-between items-start">
                                            <p className="font-bold text-sm flex-1 pr-2">{item.title}</p>
                                            <button 
                                                onClick={(e) => handleDelete(e, item.id)}
                                                className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-neutral-400 hover:bg-red-500/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Delete chat"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                        <p className="text-xs text-neutral-400 mt-1">
                                            {new Date(item.timestamp).toLocaleString()}
                                        </p>
                                    </div>
                                </motion.li>
                            ))}
                        </AnimatePresence>
                    </ul>
                )}
            </div>
        </div>
    );
};

export default ChatHistoryView;