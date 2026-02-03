'use client';

/**
 * useChatHistory Hook
 * 
 * Manages chat history state with localStorage persistence.
 * Provides CRUD operations for chat sessions.
 */

import { useState, useCallback, useEffect } from 'react';
import { ChatSession, ChatSessionSummary } from '@/types/chat-history';
import { Message, RetrievedChunk, MetricsData } from '@/types';
import * as storage from '@/lib/storage';

interface UseChatHistoryReturn {
  /** List of chat session summaries for sidebar display */
  sessions: ChatSessionSummary[];
  /** Currently active session ID */
  activeSessionId: string | null;
  /** Load a session by ID and return its messages, chunks, and metrics */
  loadSession: (id: string) => { messages: Message[]; chunks: RetrievedChunk[]; metrics: MetricsData | null };
  /** Save or update the current session */
  saveSession: (id: string, messages: Message[], chunks: RetrievedChunk[], metrics: MetricsData | null, title?: string) => void;
  /** Delete a session by ID */
  deleteSession: (id: string) => void;
  /** Create a new session and return its ID */
  createSession: () => string;
  /** Set the active session ID */
  setActiveSessionId: (id: string | null) => void;
  /** Refresh sessions from storage */
  refresh: () => void;
}

export function useChatHistory(): UseChatHistoryReturn {
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Load sessions from storage on mount
  const refresh = useCallback(() => {
    setSessions(storage.getSessionSummaries());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const loadSession = useCallback((id: string) => {
    const session = storage.getSession(id);
    if (session) {
      setActiveSessionId(id);
      return { messages: session.messages, chunks: session.chunks || [], metrics: session.metrics || null };
    }
    return { messages: [], chunks: [], metrics: null };
  }, []);

  const saveSession = useCallback(
    (id: string, messages: Message[], chunks: RetrievedChunk[], metrics: MetricsData | null, title?: string) => {
      const existing = storage.getSession(id);
      const session: ChatSession = {
        id,
        title: title || existing?.title || '',
        messages,
        chunks,
        metrics: metrics || undefined,
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      storage.saveSession(session);
      refresh();
    },
    [refresh]
  );

  const deleteSession = useCallback(
    (id: string) => {
      storage.deleteSession(id);
      if (activeSessionId === id) {
        setActiveSessionId(null);
      }
      refresh();
    },
    [activeSessionId, refresh]
  );

  const createSession = useCallback((): string => {
    const id = storage.generateSessionId();
    setActiveSessionId(id);
    return id;
  }, []);

  return {
    sessions,
    activeSessionId,
    loadSession,
    saveSession,
    deleteSession,
    createSession,
    setActiveSessionId,
    refresh,
  };
}
