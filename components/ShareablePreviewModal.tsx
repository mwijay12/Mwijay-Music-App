import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { 
  Copy, Share2, X, Download, Image as ImageIcon,
  Music2, User, Sparkles, Disc3, Smartphone, 
  Heart, ArrowLeft
} from 'lucide-react';
import { shareService } from '../services/shareService.ts';
import type { Song } from '../types.ts';

interface CardStyle {
  type: string;
  name: string;
  icon: React.ReactNode;
  ratio: string;  // aspect ratio
  description: string;
}

const cardStyles: CardStyle[] = [
  { 
    type: 'now_streaming', 
    name: 'Streaming',
    icon: <Music2 size={16} />,
    ratio: '1:1',
    description: 'Classic now playing card',
  },
  { 
    type: 'artist', 
    name: 'Artist',
    icon: <User size={16} />,
    ratio: '1:1',
    description: 'Focus on the artist',
  },
  { 
    type: 'motto', 
    name: 'Brand',
    icon: <Sparkles size={16} />,
    ratio: '1:1',
    description: 'Stylish branded card',
  },
  { 
    type: 'story', 
    name: 'Story',
    icon: <Smartphone size={16} />,
    ratio: '9:16',
    description: 'Instagram story format',
  },
  { 
    type: 'vinyl', 
    name: 'Vinyl',
    icon: <Disc3 size={16} />,
    ratio: '1:1',
    description: 'Animated vinyl record',
  },
];

interface ShareablePreviewModalProps {
  song: Song;
  onClose: () => void;
  showNotification: (
    message: string, 
    type?: 'success' | 'info' | 'error'
  ) => void;
  userAvatar?: string;
  userName?: string;
}

const ShareablePreviewModal: React.FC<ShareablePreviewModalProps> = ({
  song,
  onClose,
  showNotification,
  userAvatar,
  userName,
}) => {
  
  const [activeStyle, setActiveStyle] = useState('now_streaming');
  const [isFlipped, setIsFlipped] = useState(false);
  const [dominantColor, setDominantColor] = useState('#9333ea');
  const [accentColor, setAccentColor] = useState('#c4b5fd');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  
  const currentTimestamp = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);
  
  // Extract dominant color from album art
  useEffect(() => {
    if (!song.albumArtUrl) return;
    
    extractDominantColor(song.albumArtUrl)
      .then(({ dominant, accent }) => {
        setDominantColor(dominant);
        setAccentColor(accent);
      })
      .catch(() => {
        // Graceful fallback to default themed colors
        setDominantColor('#9333ea');
        setAccentColor('#c4b5fd');
      });
  }, [song.albumArtUrl]);
  
  // Handle swipe between styles
  const handleDragEnd = (
    event: any,
    info: PanInfo
  ) => {
    const swipeThreshold = 50;
    const currentIndex = cardStyles.findIndex(s => s.type === activeStyle);
    
    if (info.offset.x > swipeThreshold && currentIndex > 0) {
      setActiveStyle(cardStyles[currentIndex - 1].type);
    } else if (info.offset.x < -swipeThreshold && currentIndex < cardStyles.length - 1) {
      setActiveStyle(cardStyles[currentIndex + 1].type);
    }
  };
  
  // Copy background image
  const handleCopyBackground = async () => {
    if (!song.albumArtUrl) {
      showNotification('No background image to copy.', 'error');
      return;
    }
    
    try {
      const response = await fetch(song.albumArtUrl);
      const blob = await response.blob();
      
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
      
      showNotification('Background image copied! 🎨', 'success');
    } catch (err) {
      console.error('Failed to copy image:', err);
      try {
        await navigator.clipboard.writeText(song.albumArtUrl);
        showNotification('Image URL copied instead.', 'info');
      } catch {
        showNotification('Failed to copy.', 'error');
      }
    }
  };
  
  // Download card as PNG
  const handleDownload = async () => {
    if (!cardRef.current) return;
    
    setIsDownloading(true);
    
    try {
      const html2canvas = (await import('html2canvas')).default;
      
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 3,  // High resolution
        useCORS: true,
        allowTaint: true,
      });
      
      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (!blob) return;
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `mwijay-${song.title.replace(/\s+/g, '-')}.png`;
        link.click();
        URL.revokeObjectURL(url);
        
        showNotification('Card saved to downloads! 📥', 'success');
      }, 'image/png');
      
    } catch (error) {
      console.error('Download error:', error);
      showNotification('Failed to download card.', 'error');
    } finally {
      setIsDownloading(false);
    }
  };
  
  // Share with system
  const handleShare = async () => {
    setIsSharing(true);
    
    try {
      await shareService.shareAsImageCard({
        title: song.title,
        artist: song.artist,
        artworkUrl: song.albumArtUrl || 'https://via.placeholder.com/600',
        shareLink: window.location.href,
      });
      
      showNotification('Shared successfully! 🎉', 'success');
    } catch (error) {
      console.error('Error sharing:', error);
      showNotification('Failed to share card.', 'error');
    } finally {
      setIsSharing(false);
    }
  };
  
  // Quick share to specific apps
  const handleQuickShare = async (platform: 'whatsapp' | 'instagram') => {
    const text = `🎵 Listening to "${song.title}" by ${song.artist} on Mwijay`;
    const url = window.location.href;
    
    if (platform === 'whatsapp') {
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text + '\n' + url)}`;
      window.open(whatsappUrl, '_blank');
    } else if (platform === 'instagram') {
      // Instagram doesn't have direct share URL
      // Suggest user to save and share
      await handleDownload();
      showNotification('Open Instagram and share the downloaded image!', 'info');
    }
  };
  
  // Get current card aspect ratio
  const currentStyle = cardStyles.find(s => s.type === activeStyle)!;
  const isStoryFormat = currentStyle.ratio === '9:16';
  
  return (
    <motion.div 
      className="fixed inset-0 z-[90] flex flex-col justify-between overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      {/* Animated background */}
      <motion.div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${song.albumArtUrl})` }}
        animate={{
          scale: [1.1, 1.15, 1.1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <div 
        className="absolute inset-0 backdrop-blur-3xl"
        style={{
          background: `linear-gradient(135deg, 
            ${dominantColor}40 0%, 
            rgba(0,0,0,0.85) 50%, 
            ${accentColor}30 100%)`
        }}
      />

      {/* Card preview area */}
      <div 
        className="relative z-10 w-full flex-1 flex flex-col items-center justify-center p-4 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStyle}
            ref={cardRef}
            className={`relative ${isStoryFormat ? 'aspect-[9/16]' : 'aspect-square'} overflow-hidden rounded-3xl cursor-pointer shadow-2xl`}
            style={{
              width: isStoryFormat ? '280px' : '320px',
              maxHeight: '60vh',
              perspective: '1000px',
            }}
            initial={{ opacity: 0, scale: 0.9, rotateY: -15 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            exit={{ opacity: 0, scale: 0.9, rotateY: 15 }}
            transition={{ duration: 0.4, type: 'spring', damping: 20 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            onClick={() => setIsFlipped(!isFlipped)}
          >
            <motion.div
              className="relative w-full h-full"
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.6 }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Front of card */}
              <div
                className="absolute inset-0 backface-hidden w-full h-full"
                style={{ backfaceVisibility: 'hidden' }}
              >
                {renderCardContent(
                  activeStyle,
                  song,
                  dominantColor,
                  accentColor,
                  currentTimestamp,
                  userAvatar,
                  userName
                )}
              </div>
              
              {/* Back of card */}
              <div
                className="absolute inset-0 backface-hidden bg-gradient-to-br from-purple-900/95 to-indigo-900/95 backdrop-blur-md rounded-3xl p-6 flex flex-col"
                style={{ 
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                }}
              >
                <h3 className="text-xl font-bold mb-4 text-white">
                  Song Details
                </h3>
                <div className="space-y-3 text-white/80 flex-1">
                  <div>
                    <div className="text-xs text-white/50 uppercase tracking-wide">
                      Title
                    </div>
                    <div className="text-base font-semibold">
                      {song.title}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-white/50 uppercase tracking-wide">
                      Artist
                    </div>
                    <div className="text-base">{song.artist}</div>
                  </div>
                  {song.source && (
                    <div>
                      <div className="text-xs text-white/50 uppercase tracking-wide">
                        Source
                      </div>
                      <div className="text-base capitalize">{song.source}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-xs text-white/50 uppercase tracking-wide">
                      Shared
                    </div>
                    <div className="text-base">{currentTimestamp}</div>
                  </div>
                </div>
                <div className="text-center text-white/40 text-sm">
                  Tap to flip back
                </div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
        
        {/* Style indicator dots */}
        <div className="flex gap-1.5 mt-4">
          {cardStyles.map((style) => (
            <button
              key={style.type}
              onClick={() => setActiveStyle(style.type)}
              className="w-1.5 h-1.5 rounded-full transition-all"
              style={{
                background: activeStyle === style.type 
                  ? accentColor 
                  : 'rgba(255,255,255,0.3)',
                width: activeStyle === style.type ? '24px' : '6px',
              }}
              aria-label={`Switch to ${style.name}`}
            />
          ))}
        </div>
        
        {/* Swipe hint */}
        {!isFlipped && (
          <motion.p
            className="text-white/40 text-xs mt-3"
            animate={{ opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            ← Swipe to change style →
          </motion.p>
        )}
      </div>

      {/* Bottom controls */}
      <div 
        className="relative z-20 flex flex-col items-center gap-3 px-4 pb-6 pt-2 w-full"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
      >
        {/* Style selector */}
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-1.5 rounded-full flex items-center gap-1 overflow-x-auto max-w-full">
          {cardStyles.map(style => (
            <button 
              key={style.type}
              onClick={() => setActiveStyle(style.type)}
              className={`py-2 px-4 text-xs font-bold rounded-full transition-all flex items-center gap-1.5 flex-shrink-0 ${
                activeStyle === style.type 
                  ? 'bg-white text-black shadow-lg' 
                  : 'text-white/70 hover:text-white'
              }`}
            >
              {style.icon}
              <span>{style.name}</span>
            </button>
          ))}
        </div>
        
        {/* Quick share row */}
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => handleQuickShare('whatsapp')}
            className="w-11 h-11 bg-[#25D366] rounded-full flex items-center justify-center text-white font-bold text-xl cursor-pointer"
            title="Share to WhatsApp"
          >
            💬
          </motion.button>
          
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => handleQuickShare('instagram')}
            className="w-11 h-11 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-xl cursor-pointer"
            title="Share to Instagram"
          >
            📷
          </motion.button>
          
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={handleCopyBackground}
            className="w-11 h-11 bg-white/15 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center text-white cursor-pointer"
            title="Copy background image"
          >
            <Copy size={18} />
          </motion.button>
          
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={handleDownload}
            disabled={isDownloading}
            className="w-11 h-11 bg-white/15 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center text-white disabled:opacity-50 cursor-pointer"
            title="Download as PNG"
          >
            {isDownloading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                ⟳
              </motion.div>
            ) : (
              <Download size={18} />
            )}
          </motion.button>
        </div>
        
        {/* Main share button */}
        <motion.button 
          whileTap={{ scale: 0.96 }}
          onClick={handleShare}
          disabled={isSharing}
          className="w-full max-w-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-3.5 rounded-full flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30 disabled:opacity-50 cursor-pointer"
          style={{
            boxShadow: `0 10px 30px ${dominantColor}50`,
          }}
        >
          {isSharing ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                ⟳
              </motion.div>
              <span>Sharing...</span>
            </>
          ) : (
            <>
              <Share2 size={20} />
              <span>Share Your Vibe</span>
            </>
          )}
        </motion.button>
      </div>

      {/* Close button */}
      <motion.button 
        whileTap={{ scale: 0.9 }}
        onClick={onClose}
        className="absolute top-6 right-6 text-white bg-black/50 backdrop-blur-md border border-white/10 w-10 h-10 rounded-full z-20 flex items-center justify-center cursor-pointer"
        style={{ top: 'max(24px, env(safe-area-inset-top))' }}
        aria-label="Close modal"
      >
        <X size={22} />
      </motion.button>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────
// CARD CONTENT RENDERER
// ─────────────────────────────────────────────────────────

function renderCardContent(
  cardType: string,
  song: Song,
  dominantColor: string,
  accentColor: string,
  timestamp: string,
  userAvatar?: string,
  userName?: string,
) {
  
  // Watermark component shared across all cards
  const Watermark = ({ position = 'bottom' }: { position?: 'top' | 'bottom' }) => (
    <div className={`absolute ${position === 'top' ? 'top-3' : 'bottom-3'} right-3 flex items-center gap-1.5 text-white/60 text-[10px] font-medium`}>
      <div className="w-4 h-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-md flex items-center justify-center text-white font-black text-[8px]">
        M
      </div>
      <span>Mwijay</span>
    </div>
  );
  
  const UserBadge = () => userName && userAvatar ? (
    <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/30 backdrop-blur-md rounded-full pr-3 pl-1 py-1 z-20">
      <img 
        src={userAvatar} 
        alt={userName}
        className="w-5 h-5 rounded-full object-cover"
      />
      <span className="text-white text-[10px] font-medium">{userName}</span>
    </div>
  ) : null;
  
  switch (cardType) {
    
    // ─────────────────────────────────────────────────────
    // NOW STREAMING CARD
    // ─────────────────────────────────────────────────────
    case 'now_streaming':
      return (
        <div 
          className="w-full h-full rounded-3xl p-6 flex flex-col items-center justify-center relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, 
              ${dominantColor}90 0%, 
              ${accentColor}60 100%)`,
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Decorative blobs */}
          <div 
            className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-50"
            style={{ background: accentColor }}
          />
          <div 
            className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full blur-3xl opacity-50"
            style={{ background: dominantColor }}
          />
          
          <UserBadge />
          
          <div className="flex items-center gap-2 mb-4 self-start z-10">
            <div className="w-7 h-7 bg-black rounded-full flex items-center justify-center">
              <Music2 size={14} className="text-white" />
            </div>
            <span className="font-semibold text-white text-sm">
              Now Streaming
            </span>
          </div>
          
          <div className="relative z-10 flex flex-col items-center">
            <motion.img 
              src={song.albumArtUrl} 
              alt={song.title}
              className="w-44 h-44 rounded-2xl shadow-2xl mb-4 object-cover"
              animate={{
                boxShadow: [
                  '0 20px 40px rgba(0,0,0,0.4)',
                  '0 25px 50px rgba(0,0,0,0.5)',
                  '0 20px 40px rgba(0,0,0,0.4)',
                ],
              }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            <h2 className="text-xl font-bold text-center text-white leading-tight px-2 truncate w-60">
              {song.title}
            </h2>
            <p className="text-sm text-white/80 text-center mt-1 truncate w-60">
              {song.artist}
            </p>
          </div>
          
          <Watermark />
        </div>
      );
    
    // ─────────────────────────────────────────────────────
    // ARTIST CARD
    // ─────────────────────────────────────────────────────
    case 'artist':
      return (
        <div 
          className="w-full h-full rounded-3xl p-6 flex flex-col items-center justify-center relative overflow-hidden"
          style={{
            background: `radial-gradient(circle at center, 
              ${dominantColor}80 0%, 
              ${accentColor}40 50%,
              rgba(0,0,0,0.9) 100%)`,
          }}
        >
          <UserBadge />
          
          <div className="flex items-center gap-2 mb-4 self-start z-10">
            <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center">
              <span className="text-black font-black text-sm">M</span>
            </div>
            <span className="font-semibold text-white text-sm">
              Artist Spotlight
            </span>
          </div>
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="relative mb-4">
              <motion.div
                className="absolute -inset-2 rounded-full opacity-50"
                style={{
                  background: `conic-gradient(from 0deg, ${accentColor}, ${dominantColor}, ${accentColor})`,
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              />
              <img 
                src={song.albumArtUrl} 
                alt={song.artist}
                className="relative w-40 h-40 rounded-full shadow-2xl object-cover border-4 border-white/20"
              />
            </div>
            
            <h2 className="text-2xl font-black text-center text-white tracking-tight truncate w-60">
              {song.artist}
            </h2>
            <p className="text-xs text-white/60 text-center mt-1 uppercase tracking-widest">
              Featured Artist
            </p>
            
            <div className="mt-3 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full max-w-[240px]">
              <p className="text-xs text-white/80 truncate">
                Playing "{song.title}"
              </p>
            </div>
          </div>
          
          <Watermark />
        </div>
      );
    
    // ─────────────────────────────────────────────────────
    // BRAND/MOTTO CARD
    // ─────────────────────────────────────────────────────
    case 'motto':
      return (
        <div 
          className="w-full h-full rounded-3xl p-6 flex flex-col items-center justify-center relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, 
              ${dominantColor} 0%, 
              ${accentColor} 100%)`,
          }}
        >
          {/* Geometric patterns */}
          <div className="absolute inset-0 opacity-20">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full border-2 border-white"
                style={{
                  width: `${(i + 1) * 40}px`,
                  height: `${(i + 1) * 40}px`,
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                }}
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.2, 0.4, 0.2],
                }}
                transition={{
                  duration: 4,
                  delay: i * 0.2,
                  repeat: Infinity,
                }}
              />
            ))}
          </div>
          
          <UserBadge />
          
          <div className="flex items-center gap-2 mb-3 self-start z-10">
            <div className="w-7 h-7 bg-black rounded-full flex items-center justify-center">
              <span className="text-white font-black text-sm">M</span>
            </div>
            <span className="font-semibold text-white text-sm">
              Mwijay Music
            </span>
          </div>
          
          <div className="relative z-10 flex flex-col items-center text-center">
            <p className="text-3xl font-black text-white leading-tight mb-2 tracking-tight">
              Your Music.
            </p>
            <p className="text-3xl font-black text-white leading-tight mb-1 tracking-tight">
              Your Vibe.
            </p>
            <p className="text-3xl font-black text-black/80 leading-tight mb-6 tracking-tight">
              Your Soul.
            </p>
            
            <div className="bg-black/30 backdrop-blur-md rounded-2xl p-3 flex items-center gap-3 w-52">
              <img 
                src={song.albumArtUrl} 
                alt={song.title}
                className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
              />
              <div className="text-left overflow-hidden">
                <p className="text-white font-bold text-xs truncate">
                  {song.title}
                </p>
                <p className="text-white/70 text-[10px] truncate">
                  {song.artist}
                </p>
              </div>
            </div>
          </div>
          
          <Watermark />
        </div>
      );
    
    // ─────────────────────────────────────────────────────
    // STORY MODE (9:16 Instagram Story)
    // ─────────────────────────────────────────────────────
    case 'story':
      return (
        <div 
          className="w-full h-full rounded-3xl flex flex-col relative overflow-hidden"
          style={{
            background: `linear-gradient(180deg, 
              ${dominantColor} 0%, 
              rgba(0,0,0,0.8) 50%,
              ${accentColor} 100%)`,
          }}
        >
          {/* Top section */}
          <div className="p-4 flex items-center justify-between z-10 w-full">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <span className="text-black font-black">M</span>
              </div>
              <div className="text-left">
                <p className="text-white text-xs font-bold">Mwijay</p>
                <p className="text-white/60 text-[10px]">{timestamp}</p>
              </div>
            </div>
            <Heart className="text-white fill-[var(--primary-accent)] border-none" size={20} />
          </div>
          
          {/* Center - Big album art */}
          <div className="flex-1 flex flex-col items-center justify-center px-4 z-10">
            <motion.img 
              src={song.albumArtUrl} 
              alt={song.title}
              className="w-44 h-44 rounded-3xl shadow-2xl mb-6 object-cover"
              animate={{
                rotate: [0, 1, -1, 0],
              }}
              transition={{ duration: 6, repeat: Infinity }}
            />
            
            <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-4 w-full">
              <p className="text-white/60 text-[10px] uppercase tracking-widest text-center mb-1">
                Now Playing
              </p>
              <h2 className="text-lg font-black text-white text-center mb-1 truncate w-48 mx-auto">
                {song.title}
              </h2>
              <p className="text-white/80 text-xs text-center truncate w-48 mx-auto">
                {song.artist}
              </p>
              
              {/* Fake progress bar */}
              <div className="mt-3 h-1 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-[var(--primary-accent)] rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: '40%' }}
                  transition={{ duration: 2 }}
                />
              </div>
            </div>
          </div>
          
          {/* Bottom CTA */}
          <div className="p-4 z-10 w-full">
            <div className="bg-white rounded-full py-3 text-center cursor-pointer shadow-lg hover:scale-105 active:scale-95 transition-transform">
              <p className="text-black font-black text-sm">
                Listen on Mwijay 🎵
              </p>
            </div>
          </div>
        </div>
      );
    
    // ─────────────────────────────────────────────────────
    // VINYL RECORD CARD (Animated)
    // ─────────────────────────────────────────────────────
    case 'vinyl':
      return (
        <div 
          className="w-full h-full rounded-3xl p-6 flex flex-col items-center justify-center relative overflow-hidden"
          style={{
            background: `radial-gradient(circle at center, 
              ${dominantColor}60 0%, 
              rgba(0,0,0,0.95) 70%)`,
          }}
        >
          <UserBadge />
          
          <div className="flex items-center gap-2 mb-4 self-start z-10">
            <Disc3 size={20} className="text-white animate-spin-slow text-[var(--primary-accent)]" />
            <span className="font-semibold text-white text-sm">
              On The Record
            </span>
          </div>
          
          <div className="relative z-10 flex flex-col items-center">
            {/* Vinyl record */}
            <div className="relative">
              <motion.div
                className="w-44 h-44 rounded-full bg-black flex items-center justify-center relative"
                style={{
                  background: `repeating-radial-gradient(
                    circle at center,
                    #1a1a1a 0px,
                    #1a1a1a 2px,
                    #2a2a2a 2px,
                    #2a2a2a 4px
                  )`,
                  boxShadow: `0 15px 45px ${dominantColor}80`,
                }}
                animate={{ rotate: 360 }}
                transition={{ 
                  duration: 8, 
                  repeat: Infinity, 
                  ease: 'linear' 
                }}
              >
                {/* Album art in center */}
                <img 
                  src={song.albumArtUrl} 
                  alt={song.title}
                  className="w-14 h-14 rounded-full object-cover border-2 border-white/20"
                />
                
                {/* Highlight */}
                <div 
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `linear-gradient(135deg, 
                      transparent 30%, 
                      ${accentColor}20 50%, 
                      transparent 70%)`,
                  }}
                />
              </motion.div>
              
              {/* Tonearm (decorative) */}
              <div 
                className="absolute top-4 -right-4 w-20 h-1 origin-right"
                style={{ 
                  background: 'linear-gradient(90deg, #888, #ccc)',
                  transform: 'rotate(-25deg)',
                  borderRadius: '0 4px 4px 0',
                }}
              />
            </div>
            
            <h2 className="text-xl font-bold text-center text-white mt-6 truncate w-60">
              {song.title}
            </h2>
            <p className="text-sm text-white/70 text-center mt-1 truncate w-60">
              {song.artist}
            </p>
            
            <div className="mt-3 flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-white/60 text-xs uppercase tracking-widest">
                Spinning Now
              </span>
            </div>
          </div>
          
          <Watermark />
        </div>
      );
    
    default:
      return null;
  }
}

// ─────────────────────────────────────────────────────────
// COLOR EXTRACTION UTILITY
// ─────────────────────────────────────────────────────────

async function extractDominantColor(imageUrl: string): Promise<{
  dominant: string;
  accent: string;
}> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 50;
        canvas.height = 50;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ dominant: '#9333ea', accent: '#c4b5fd' });
          return;
        }
        
        ctx.drawImage(img, 0, 0, 50, 50);
        const data = ctx.getImageData(0, 0, 50, 50).data;
        
        let r = 0, g = 0, b = 0, count = 0;
        
        // Sample pixels
        for (let i = 0; i < data.length; i += 16) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }
        
        r = Math.floor(r / count);
        g = Math.floor(g / count);
        b = Math.floor(b / count);
        
        const dominant = rgbToHex(r, g, b);
        
        // Generate complementary accent
        const accent = rgbToHex(
          Math.min(255, r + 60),
          Math.min(255, g + 60),
          Math.min(255, b + 60)
        );
        
        resolve({ dominant, accent });
      } catch (err) {
        reject(err);
      }
    };
    
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = imageUrl;
  });
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b]
    .map(x => x.toString(16).padStart(2, '0'))
    .join('');
}

export default ShareablePreviewModal;
