
import React, { useState, useRef, useEffect } from 'react';
import type { Video, ProfileData, Comment } from '../types.ts';

interface CommentsModalProps {
    video: Video;
    profile: ProfileData;
    onClose: () => void;
    onUpdateVideo: (updatedVideo: Video) => void;
}

const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const seconds = Math.floor((now - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
};

const CommentsModal: React.FC<CommentsModalProps> = ({ video, profile, onClose, onUpdateVideo }) => {
    const [newComment, setNewComment] = useState('');
    const [editingComment, setEditingComment] = useState<Comment | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [newComment]);

    const handleAddComment = () => {
        if (!newComment.trim()) return;
        const comment: Comment = {
            id: `comment-${Date.now()}`,
            userName: profile.name,
            userAvatar: profile.avatarUrl,
            text: newComment.trim(),
            timestamp: Date.now(),
        };
        const updatedVideo = {
            ...video,
            comments: [...(video.comments || []), comment],
        };
        onUpdateVideo(updatedVideo);
        setNewComment('');
    };
    
    const handleUpdateComment = () => {
        if (!editingComment || !editingComment.text.trim()) return;
        const updatedComments = (video.comments || []).map(c => 
            c.id === editingComment.id ? { ...editingComment, isEditing: false } : c
        );
        onUpdateVideo({ ...video, comments: updatedComments });
        setEditingComment(null);
    };

    const handleDeleteComment = (commentId: string) => {
        const updatedComments = (video.comments || []).filter(c => c.id !== commentId);
        onUpdateVideo({ ...video, comments: updatedComments });
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[80] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-[var(--surface-color)] rounded-2xl flex flex-col w-full max-w-lg max-h-[80vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                <header className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
                    <h2 className="font-bold text-lg">Comments ({video.comments?.length || 0})</h2>
                    <button onClick={onClose} className="text-white/70 hover:text-white" aria-label="Close modal"><i className="fas fa-times text-2xl"></i></button>
                </header>

                <div className="flex-1 p-4 overflow-y-auto space-y-4 scroll-container">
                    {(video.comments || []).map(comment => (
                        <div key={comment.id} className="flex items-start gap-3">
                            <img src={comment.userAvatar} alt={comment.userName} className="w-10 h-10 rounded-full object-cover" />
                            <div className="flex-1">
                                <div className="bg-white/10 rounded-lg p-3">
                                    <div className="flex items-baseline gap-2">
                                        <p className="font-bold text-sm">{comment.userName}</p>
                                        <p className="text-xs text-neutral-400">{formatTimeAgo(comment.timestamp)}</p>
                                    </div>
                                    {editingComment?.id === comment.id ? (
                                        <textarea
                                            value={editingComment.text}
                                            onChange={e => setEditingComment(c => c ? { ...c, text: e.target.value } : null)}
                                            className="w-full bg-black/20 rounded p-1 mt-1 text-sm resize-none"
                                            autoFocus
                                        />
                                    ) : (
                                        <p className="text-sm mt-1 whitespace-pre-wrap">{comment.text}</p>
                                    )}
                                </div>
                                {comment.userName === profile.name && (
                                    <div className="flex items-center gap-3 text-xs text-neutral-400 mt-1 px-2">
                                        {editingComment?.id === comment.id ? (
                                             <button onClick={handleUpdateComment} className="hover:text-white">Save</button>
                                        ) : (
                                             <button onClick={() => setEditingComment(comment)} className="hover:text-white">Edit</button>
                                        )}
                                        <button onClick={() => handleDeleteComment(comment.id)} className="hover:text-red-400">Delete</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                     {(!video.comments || video.comments.length === 0) && (
                        <p className="text-center text-neutral-400 pt-8">Be the first to comment.</p>
                    )}
                </div>
                
                <footer className="p-4 border-t border-white/10 flex-shrink-0 flex items-start gap-3">
                    <img src={profile.avatarUrl} alt={profile.name} className="w-10 h-10 rounded-full object-cover"/>
                    <div className="flex-1">
                         <textarea
                            ref={textareaRef}
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Add a comment..."
                            className="w-full bg-white/10 p-2 rounded-lg text-sm resize-none overflow-hidden"
                            rows={1}
                        />
                    </div>
                    <button onClick={handleAddComment} className="bg-[var(--primary-accent)] text-black font-bold h-10 px-4 rounded-lg" disabled={!newComment.trim()}>
                        Send
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default CommentsModal;
