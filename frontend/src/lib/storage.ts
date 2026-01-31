/**
 * LocalStorage Service
 * 
 * A typed, safe abstraction over browser localStorage for chat history persistence.
 * Handles serialization, error recovery, and storage quota management.
 */

import { ChatSession, ChatSessionSummary } from '@/types/chat-history';

// --- Constants ---
const STORAGE_KEY = 'chat-history';
const MAX_SESSIONS = 50; // Limit to prevent storage bloat

// --- Helpers ---

/**
 * Safely parse JSON with fallback
 */
function safeJsonParse<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    console.warn('[ChatStorage] Failed to parse stored data, returning fallback');
    return fallback;
  }
}

/**
 * Check if localStorage is available
 */
function isStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const test = '__storage_test__';
    window.localStorage.setItem(test, test);
    window.localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a title from the first user message
 */
function generateTitle(messages: ChatSession['messages']): string {
  const firstUserMessage = messages.find((m) => m.role === 'user');
  if (!firstUserMessage) return 'New Chat';
  
  const content = firstUserMessage.content.trim();
  return content.length > 50 ? content.slice(0, 47) + '...' : content;
}

// --- Storage API ---

/**
 * Get all chat sessions from localStorage
 */
export function getAllSessions(): ChatSession[] {
  if (!isStorageAvailable()) return [];
  const data = window.localStorage.getItem(STORAGE_KEY);
  return safeJsonParse<ChatSession[]>(data, []);
}

/**
 * Get chat session summaries (for sidebar display)
 */
export function getSessionSummaries(): ChatSessionSummary[] {
  return getAllSessions()
    .map(({ id, title, createdAt, updatedAt, messages }) => ({
      id,
      title,
      createdAt,
      updatedAt,
      messageCount: messages.length,
    }))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

/**
 * Get a specific chat session by ID
 */
export function getSession(id: string): ChatSession | null {
  const sessions = getAllSessions();
  return sessions.find((s) => s.id === id) || null;
}

/**
 * Save or update a chat session
 */
export function saveSession(session: ChatSession): void {
  if (!isStorageAvailable()) return;

  const sessions = getAllSessions();
  const existingIndex = sessions.findIndex((s) => s.id === session.id);

  // Auto-generate title if not provided
  const sessionToSave: ChatSession = {
    ...session,
    title: session.title || generateTitle(session.messages),
    updatedAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    sessions[existingIndex] = sessionToSave;
  } else {
    sessions.unshift(sessionToSave);
  }

  // Enforce max sessions limit
  const trimmedSessions = sessions.slice(0, MAX_SESSIONS);

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedSessions));
  } catch (e) {
    if (e instanceof Error && e.name === 'QuotaExceededError') {
      console.warn('[ChatStorage] Storage quota exceeded, removing oldest sessions');
      // Remove oldest half and retry
      const reduced = trimmedSessions.slice(0, Math.floor(trimmedSessions.length / 2));
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reduced));
    }
  }
}

/**
 * Delete a chat session by ID
 */
export function deleteSession(id: string): void {
  if (!isStorageAvailable()) return;
  
  const sessions = getAllSessions().filter((s) => s.id !== id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

/**
 * Clear all chat history
 */
export function clearAllSessions(): void {
  if (!isStorageAvailable()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
