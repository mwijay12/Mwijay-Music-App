/**
 * media.ts — Shared media type definitions
 * Used across scanner, reels player, video player, and music player
 */

// ─── Orientation / Format Types ───────────────────────────────────────────────

export type MediaOrientation = 'portrait' | 'landscape' | 'square' | 'unknown';
export type MediaType = 'audio' | 'video' | 'reel';
export type VideoFormat = 'mp4' | 'mkv' | 'avi' | 'mov' | 'webm' | '3gp' | 'ts' | 'wmv' | 'flv' | 'other';
export type AudioFormat = 'mp3' | 'aac' | 'm4a' | 'flac' | 'ogg' | 'wav' | 'opus' | 'wma' | 'other';

// ─── Scanned Media Item ───────────────────────────────────────────────────────

export interface ScannedMedia {
  id: string;
  type: MediaType;
  path: string;             // Raw native path (file://)
  playableSrc: string;      // Safe converted URL for <video>/<audio> src
  title: string;
  artist?: string;
  album?: string;
  duration: number;         // Seconds
  size: number;             // Bytes
  format: string;
  thumbnailPath?: string;   // Video thumbnail (generated)
  artworkPath?: string;     // Audio artwork
  width?: number;           // Video width (px)
  height?: number;          // Video height (px)
  orientation: MediaOrientation;
  isReel: boolean;          // True if portrait video (height > width)
  folderPath: string;       // Parent directory path
  folderName: string;       // Parent directory name
  dateAdded: number;        // Timestamp ms
  scannedAt: number;
}

// ─── Folder ───────────────────────────────────────────────────────────────────

export interface MediaFolder {
  id: string;
  path: string;
  name: string;
  itemCount: number;
  totalSize: number;
  types: MediaType[];       // What types of media are in this folder
  thumbnailPath?: string;   // First video thumbnail as folder cover
}

// ─── Playlist ─────────────────────────────────────────────────────────────────

export interface MediaPlaylist {
  id: string;
  name: string;
  description?: string;
  items: string[];          // Array of ScannedMedia IDs
  createdAt: number;
  updatedAt: number;
  coverPath?: string;
}

// ─── Note ─────────────────────────────────────────────────────────────────────

export type NoteCategory = 'general' | 'music' | 'video' | 'idea' | 'lyrics' | 'todo';
export type NotePriority = 'low' | 'normal' | 'high';

export interface QuickNote {
  id: string;
  title: string;
  content: string;
  category: NoteCategory;
  priority: NotePriority;
  color: string;            // Hex color for card background tint
  tags: string[];
  isPinned: boolean;
  isArchived: boolean;
  linkedMediaId?: string;   // Optional link to a song/video
  linkedMediaTitle?: string;
  createdAt: number;
  updatedAt: number;
}

// ─── Scanner State ────────────────────────────────────────────────────────────

export interface ScannerProgress {
  phase: 'idle' | 'collecting' | 'processing' | 'complete' | 'cancelled' | 'error';
  totalFound: number;
  processed: number;
  audioCount: number;
  videoCount: number;
  reelCount: number;
  percent: number;
  currentFile: string;
  error?: string;
}

// ─── Player State ─────────────────────────────────────────────────────────────

export interface VideoPlayerState {
  currentItem: ScannedMedia | null;
  isPlaying: boolean;
  isFullscreen: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  isBuffering: boolean;
  error: string | null;
}

export interface ReelsPlayerState {
  currentIndex: number;
  items: ScannedMedia[];
  isPlaying: boolean;
  isMuted: boolean;
  isLiked: boolean;
}
