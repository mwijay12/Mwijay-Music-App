/**
 * QuickNotes.tsx
 *
 * Quick notes panel — slides in from right.
 * Can be opened from the video player, music player, or main nav.
 *
 * FEATURES:
 * - Create, edit, delete notes
 * - Color coding
 * - Categories: general, music, video, idea, lyrics, todo
 * - Priority: low, normal, high
 * - Pin notes to top
 * - Tags
 * - Optional link to current media
 * - Search notes
 * - Auto-save (no save button needed)
 * - IndexedDB persistence
 */

import React, {
  useState, useCallback, useEffect, useRef, memo
} from 'react';
import { useNotes } from '../../hooks/useNotes';
import type { QuickNote, NoteCategory, NotePriority } from '../../types/media';
import './QuickNotes.css';

// ─── Constants ────────────────────────────────────────────────────────────────

const NOTE_COLORS = [
  '#2C2C2E', // Dark (default)
  '#1C3A2E', // Dark green
  '#1A2A3A', // Dark blue
  '#3A1A2E', // Dark purple
  '#3A2A1A', // Dark amber
  '#3A1A1A', // Dark red
];

const CATEGORY_EMOJIS: Record<NoteCategory, string> = {
  general: '📝',
  music: '🎵',
  video: '🎬',
  idea: '💡',
  lyrics: '🎤',
  todo: '✅',
};

const PRIORITY_COLORS: Record<NotePriority, string> = {
  low: '#6C757D',
  normal: '#0D6EFD',
  high: '#DC3545',
};

// ─── Note Card ────────────────────────────────────────────────────────────────

interface NoteCardProps {
  note: QuickNote;
  onEdit: (note: QuickNote) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
}

const NoteCard = memo(function NoteCard({
  note,
  onEdit,
  onDelete,
  onTogglePin,
}: NoteCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className="note-card"
      style={{ backgroundColor: note.color }}
      onClick={() => onEdit(note)}
    >
      {/* Priority indicator */}
      <div
        className="note-priority-bar"
        style={{ backgroundColor: PRIORITY_COLORS[note.priority] }}
      />

      {/* Header */}
      <div className="note-card-header">
        <span className="note-category-badge">
          {CATEGORY_EMOJIS[note.category]}
        </span>
        {note.isPinned && (
          <span className="note-pin-icon" title="Pinned">📌</span>
        )}
        <button
          className="note-menu-btn"
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(p => !p);
          }}
          aria-label="Note options"
        >
          ⋯
        </button>
      </div>

      {/* Context menu */}
      {showMenu && (
        <div className="note-menu" onClick={e => e.stopPropagation()}>
          <button onClick={() => { onEdit(note); setShowMenu(false); }}>
            ✏️ Edit
          </button>
          <button onClick={() => { onTogglePin(note.id); setShowMenu(false); }}>
            {note.isPinned ? '📌 Unpin' : '📌 Pin'}
          </button>
          <button
            className="note-menu-danger"
            onClick={() => { onDelete(note.id); setShowMenu(false); }}
          >
            🗑️ Delete
          </button>
        </div>
      )}

      {/* Title */}
      {note.title && (
        <h4 className="note-card-title">{note.title}</h4>
      )}

      {/* Content preview */}
      <p className="note-card-content">
        {note.content.length > 120
          ? note.content.slice(0, 120) + '…'
          : note.content || <em>Empty note</em>
        }
      </p>

      {/* Tags */}
      {note.tags.length > 0 && (
        <div className="note-tags">
          {note.tags.slice(0, 3).map(tag => (
            <span key={tag} className="note-tag">#{tag}</span>
          ))}
        </div>
      )}

      {/* Linked media */}
      {note.linkedMediaTitle && (
        <div className="note-linked-media">
          🔗 {note.linkedMediaTitle}
        </div>
      )}

      {/* Timestamp */}
      <div className="note-timestamp">
        {new Date(note.updatedAt).toLocaleDateString()}
      </div>
    </div>
  );
});

// ─── Note Editor ──────────────────────────────────────────────────────────────

interface NoteEditorProps {
  note: Partial<QuickNote> | null;
  onSave: (note: Partial<QuickNote>) => void;
  onCancel: () => void;
  linkedMediaId?: string;
  linkedMediaTitle?: string;
}

function NoteEditor({
  note,
  onSave,
  onCancel,
  linkedMediaId,
  linkedMediaTitle,
}: NoteEditorProps) {
  const [title, setTitle] = useState(note?.title ?? '');
  const [content, setContent] = useState(note?.content ?? '');
  const [category, setCategory] = useState<NoteCategory>(note?.category ?? 'general');
  const [priority, setPriority] = useState<NotePriority>(note?.priority ?? 'normal');
  const [color, setColor] = useState(note?.color ?? NOTE_COLORS[0]);
  const [tags, setTags] = useState(note?.tags?.join(', ') ?? '');

  const contentRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus content on mount
  useEffect(() => {
    contentRef.current?.focus();
  }, []);

  // Auto-save on content change (debounced)
  const saveTimerRef = useRef<number | null>(null);

  const triggerAutoSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      onSave({
        ...note,
        title: title.trim(),
        content,
        category,
        priority,
        color,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        linkedMediaId,
        linkedMediaTitle,
      });
    }, 800); // Auto-save after 800ms idle
  }, [note, title, content, category, priority, color, tags,
      linkedMediaId, linkedMediaTitle, onSave]);

  // Trigger auto-save on any change
  useEffect(() => {
    if (content || title) triggerAutoSave();
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [content, title, category, priority, color, tags, triggerAutoSave]);

  return (
    <div className="note-editor">
      {/* Editor header */}
      <div className="note-editor-header">
        <button className="note-editor-back" onClick={onCancel} aria-label="Back">
          ← Back
        </button>
        <button
          className="note-editor-save"
          onClick={() => {
            onSave({
              ...note,
              title: title.trim(),
              content,
              category,
              priority,
              color,
              tags: tags.split(',').map(t => t.trim()).filter(Boolean),
              linkedMediaId,
              linkedMediaTitle,
            });
            onCancel();
          }}
          aria-label="Save note"
        >
          Save ✓
        </button>
      </div>

      {/* Color picker */}
      <div className="note-color-row">
        {NOTE_COLORS.map(c => (
          <button
            key={c}
            className={`note-color-dot ${c === color ? 'selected' : ''}`}
            style={{ backgroundColor: c }}
            onClick={() => setColor(c)}
            aria-label={`Color ${c}`}
          />
        ))}
      </div>

      {/* Category tabs */}
      <div className="note-category-row">
        {(Object.keys(CATEGORY_EMOJIS) as NoteCategory[]).map(cat => (
          <button
            key={cat}
            className={`note-cat-btn ${cat === category ? 'active' : ''}`}
            onClick={() => setCategory(cat)}
            title={cat}
          >
            {CATEGORY_EMOJIS[cat]} <span>{cat}</span>
          </button>
        ))}
      </div>

      {/* Title */}
      <input
        type="text"
        className="note-title-input"
        placeholder="Note title (optional)"
        value={title}
        onChange={e => setTitle(e.target.value)}
        maxLength={100}
      />

      {/* Content */}
      <textarea
        ref={contentRef}
        className="note-content-input"
        placeholder="Start writing… (auto-saved)"
        value={content}
        onChange={e => setContent(e.target.value)}
        rows={10}
      />

      {/* Tags */}
      <input
        type="text"
        className="note-tags-input"
        placeholder="Tags (comma separated): bongo, lyrics, idea"
        value={tags}
        onChange={e => setTags(e.target.value)}
      />

      {/* Priority */}
      <div className="note-priority-row">
        <span className="note-field-label">Priority:</span>
        {(['low', 'normal', 'high'] as NotePriority[]).map(p => (
          <button
            key={p}
            className={`note-priority-btn ${p === priority ? 'active' : ''}`}
            style={{
              borderColor: p === priority ? PRIORITY_COLORS[p] : 'transparent',
              color: p === priority ? PRIORITY_COLORS[p] : 'inherit',
            }}
            onClick={() => setPriority(p)}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Linked media */}
      {linkedMediaTitle && (
        <div className="note-linked-preview">
          🔗 Linked to: <strong>{linkedMediaTitle}</strong>
        </div>
      )}

      {/* Character count */}
      <div className="note-char-count">
        {content.length} characters
      </div>
    </div>
  );
}

// ─── Main QuickNotes Component ────────────────────────────────────────────────

interface QuickNotesProps {
  isOpen: boolean;
  onClose: () => void;
  linkedMediaId?: string;
  linkedMediaTitle?: string;
}

export function QuickNotes({
  isOpen,
  onClose,
  linkedMediaId,
  linkedMediaTitle,
}: QuickNotesProps) {
  const {
    createNote,
    updateNote,
    deleteNote,
    togglePin,
    searchQuery,
    setSearchQuery,
    filteredNotes,
  } = useNotes();

  const [editingNote, setEditingNote] = useState<Partial<QuickNote> | null>(null);

  const handleSaveNote = useCallback((noteData: Partial<QuickNote>) => {
    if (noteData.id) {
      updateNote(noteData.id, noteData);
    } else {
      createNote(noteData);
    }
  }, [createNote, updateNote]);

  const handleNewNote = useCallback(() => {
    setEditingNote({
      category: 'general',
      priority: 'normal',
      color: NOTE_COLORS[0],
      tags: [],
      isPinned: false,
      isArchived: false,
      linkedMediaId,
      linkedMediaTitle,
    });
  }, [linkedMediaId, linkedMediaTitle]);

  const handleEditNote = useCallback((note: QuickNote) => {
    setEditingNote(note);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingNote(null);
  }, []);

  if (!isOpen) return null;

  return (
    <div className={`quick-notes-panel ${isOpen ? 'open' : ''}`}>
      {editingNote ? (
        <NoteEditor
          note={editingNote}
          onSave={handleSaveNote}
          onCancel={handleCancelEdit}
          linkedMediaId={linkedMediaId}
          linkedMediaTitle={linkedMediaTitle}
        />
      ) : (
        <>
          {/* Panel header */}
          <div className="quick-notes-header">
            <h2 className="quick-notes-title">📝 Notes</h2>
            <div className="quick-notes-header-actions">
              <button
                className="notes-add-btn"
                onClick={handleNewNote}
                aria-label="New note"
              >
                + New
              </button>
              <button
                className="notes-close-btn"
                onClick={onClose}
                aria-label="Close notes"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="notes-search-row">
            <input
              type="search"
              className="notes-search-input"
              placeholder="🔍 Search notes…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Notes count */}
          <div className="notes-count">
            {filteredNotes.length} note{filteredNotes.length !== 1 ? 's' : ''}
            {searchQuery && ` matching "${searchQuery}"`}
          </div>

          {/* Notes grid */}
          <div className="notes-grid">
            {filteredNotes.length === 0 ? (
              <div className="notes-empty">
                <span>📝</span>
                <p>
                  {searchQuery
                    ? 'No notes match your search'
                    : 'No notes yet. Tap + New to create one.'
                  }
                </p>
              </div>
            ) : (
              filteredNotes.map(note => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onEdit={handleEditNote}
                  onDelete={deleteNote}
                  onTogglePin={togglePin}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
