/**
 * useNotes.ts — Notes CRUD hook with IndexedDB persistence
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { QuickNote, NoteCategory, NotePriority } from '../types/media';

const NOTES_DB = 'MwijayNotesDB';
const NOTES_STORE = 'notes';
const DB_VERSION = 1;

function generateNoteId(): string {
  return `note_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function openNotesDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(NOTES_DB, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(NOTES_STORE)) {
        const store = db.createObjectStore(NOTES_STORE, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt');
        store.createIndex('category', 'category');
        store.createIndex('isPinned', 'isPinned');
        store.createIndex('isArchived', 'isArchived');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbGetAll(): Promise<QuickNote[]> {
  const db = await openNotesDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(NOTES_STORE, 'readonly');
    const req = tx.objectStore(NOTES_STORE).getAll();
    req.onsuccess = () => { db.close(); resolve(req.result || []); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

async function dbPut(note: QuickNote): Promise<void> {
  const db = await openNotesDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(NOTES_STORE, 'readwrite');
    const req = tx.objectStore(NOTES_STORE).put(note);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

async function dbDelete(id: string): Promise<void> {
  const db = await openNotesDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(NOTES_STORE, 'readwrite');
    tx.objectStore(NOTES_STORE).delete(id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export function useNotes() {
  const [notes, setNotes] = useState<QuickNote[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Load from DB on mount
  useEffect(() => {
    dbGetAll()
      .then(loaded => {
        // Sort: pinned first, then by updatedAt desc
        const sorted = loaded.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return b.updatedAt - a.updatedAt;
        });
        setNotes(sorted);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const createNote = useCallback((data: Partial<QuickNote>) => {
    const now = Date.now();
    const newNote: QuickNote = {
      id: generateNoteId(),
      title: data.title ?? '',
      content: data.content ?? '',
      category: data.category ?? 'general',
      priority: data.priority ?? 'normal',
      color: data.color ?? '#2C2C2E',
      tags: data.tags ?? [],
      isPinned: false,
      isArchived: false,
      linkedMediaId: data.linkedMediaId,
      linkedMediaTitle: data.linkedMediaTitle,
      createdAt: now,
      updatedAt: now,
    };

    setNotes(prev => [newNote, ...prev]);
    dbPut(newNote).catch(console.error);
    return newNote;
  }, []);

  const updateNote = useCallback((id: string, changes: Partial<QuickNote>) => {
    setNotes(prev => prev.map(n => {
      if (n.id !== id) return n;
      const updated = { ...n, ...changes, id, updatedAt: Date.now() };
      dbPut(updated).catch(console.error);
      return updated;
    }));
  }, []);

  const deleteNote = useCallback((id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    dbDelete(id).catch(console.error);
  }, []);

  const togglePin = useCallback((id: string) => {
    setNotes(prev => prev.map(n => {
      if (n.id !== id) return n;
      const updated = { ...n, isPinned: !n.isPinned, updatedAt: Date.now() };
      dbPut(updated).catch(console.error);
      return updated;
    }));
  }, []);

  const pinnedNotes = useMemo(() => notes.filter(n => n.isPinned), [notes]);

  const filteredNotes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return notes.filter(n => !n.isArchived);

    return notes.filter(n => {
      if (n.isArchived) return false;
      return (
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some(t => t.toLowerCase().includes(q)) ||
        n.category.includes(q) ||
        (n.linkedMediaTitle?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [notes, searchQuery]);

  return {
    notes,
    pinnedNotes,
    filteredNotes,
    isLoading,
    createNote,
    updateNote,
    deleteNote,
    togglePin,
    searchQuery,
    setSearchQuery,
  };
}
