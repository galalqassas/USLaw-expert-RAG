'use client';

/**
 * useChat - Streaming chat hook with session-bound updates.
 * 
 * Each stream is bound to the session ID where it was started.
 * Updates only apply to that session, preventing cross-chat contamination.
 */

import { useState, useCallback, useRef } from 'react';
import { Message, RetrievedChunk, MetricsData, FileType } from '@/types';
import { getFriendlyErrorMessage } from '@/lib/utils';

// --- Types ---

export interface UseChatReturn {
  messages: Message[];
  chunks: RetrievedChunk[];
  metrics: MetricsData | null;
  isLoading: boolean;
  error: string | null;
  send: (content: string, sessionId: string) => void;
  loadState: (messages: Message[], chunks: RetrievedChunk[], metrics: MetricsData | null) => void;
  reset: () => void;
  reload: (sessionId: string) => void;
  currentSessionId: string | null;
}

interface BackendSource {
  rank: number;
  score: number | null;
  file_path: string;
  text: string;
}

// --- Helpers ---

const generateId = (): string =>
  `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const getFileType = (path: string): FileType =>
  path.endsWith('.pdf') ? 'pdf' : path.endsWith('.docx') || path.endsWith('.doc') ? 'docx' : 'web';

const mapSources = (sources: BackendSource[]): RetrievedChunk[] =>
  sources.map((s, i) => ({
    id: `chunk-${i}-${Date.now()}`,
    title: s.file_path.split(/[/\\]/).pop() || 'Unknown',
    type: getFileType(s.file_path),
    snippet: s.text,
    relevance: s.score ? Math.round(s.score * 100) : 0,
    sourceUrl: s.file_path,
  }));

// --- Hook ---

export function useChat({ model }: { model?: string } = {}): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chunks, setChunks] = useState<RetrievedChunk[]>([]);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const startTimeRef = useRef(0);
  const retrievalMsRef = useRef(0);

  // Load state from a persisted session
  const loadState = useCallback((
    loadedMessages: Message[],
    loadedChunks: RetrievedChunk[],
    loadedMetrics: MetricsData | null
  ) => {
    // Abort any ongoing stream before loading new state
    abortRef.current?.abort();
    setIsLoading(false);
    setMessages(loadedMessages);
    setChunks(loadedChunks);
    setMetrics(loadedMetrics);
    setError(null);
  }, []);

  const send = useCallback(async (content: string, sessionId: string) => {
    if (!content.trim() || isLoading) return;

    // Abort previous request
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    
    // Bind this stream to the session
    sessionIdRef.current = sessionId;
    const boundSessionId = sessionId;

    setError(null);
    setChunks([]);
    setMetrics(null);
    setIsLoading(true);
    startTimeRef.current = Date.now();
    retrievalMsRef.current = 0;

    const userMsg: Message = { id: generateId(), role: 'user', content };
    const assistantId = generateId();
    const assistantMsg: Message = { id: assistantId, role: 'assistant', content: '' };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(({ role, content }) => ({ role, content })),
          model,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(`Server error: ${await res.text()}`);
      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let tokenBuffer = '';
      let lastUpdateTime = Date.now();

      // Only update if still on the same session
      const isBound = () => sessionIdRef.current === boundSessionId;

      const flushTokens = (force = false) => {
        const now = Date.now();
        if (force || now - lastUpdateTime > 50) {
          const chunk = tokenBuffer;
          tokenBuffer = '';
          lastUpdateTime = now;
          if (chunk && isBound()) {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m))
            );
          }
        }
      };

      const processLine = (line: string) => {
        const colonIdx = line.indexOf(':');
        if (colonIdx === -1) return;

        const type = line.slice(0, colonIdx);
        const payload = line.slice(colonIdx + 1);

        let data;
        try {
          data = JSON.parse(payload);
        } catch {
          return; // Ignore malformed lines
        }

        if (type === '0') {
          // Check if this is a masked backend error
          if (typeof data === 'string' && data.includes('Error:**')) {
            // Extract the raw error message (remove the markdown prefix)
            const cleanError = data.replace(/.*\*\*.*Error:\*\*\s*/, '').trim();
            throw new Error(cleanError);
          }
          tokenBuffer += data;
          flushTokens();
        } else if (type === '2' && isBound()) {
          const sources = Array.isArray(data) ? data : data.sources || [];
          if (data.retrieval_time) {
            retrievalMsRef.current = Math.round(data.retrieval_time * 1000);
            setMetrics({ retrievalTimeMs: retrievalMsRef.current, synthesisTimeMs: 0 });
          }
          setChunks(mapSources(sources));
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        lines.forEach((l) => l.trim() && processLine(l));
      }
      if (buffer.trim()) processLine(buffer);
      flushTokens(true);

      const synthesisMs = Math.max(0, Date.now() - startTimeRef.current - retrievalMsRef.current);
      if (isBound()) {
        setMetrics({ retrievalTimeMs: retrievalMsRef.current, synthesisTimeMs: synthesisMs });
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      if (sessionIdRef.current === boundSessionId) {
        setError(getFriendlyErrorMessage(err));
      }
    } finally {
      if (sessionIdRef.current === boundSessionId) {
        setIsLoading(false);
      }
    }
  }, [messages, isLoading, model]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    sessionIdRef.current = null;
    setMessages([]);
    setChunks([]);
    setMetrics(null);
    setError(null);
    setIsLoading(false);
  }, []);

  /**
   * Reload (regenerate) the last assistant response.
   * Removes the last assistant message and re-sends the last user prompt.
   */
  const reload = useCallback((sessionId: string) => {
    // Find the last user message
    const lastUserIdx = [...messages].reverse().findIndex((m) => m.role === 'user');
    if (lastUserIdx === -1) return;

    const userIdx = messages.length - 1 - lastUserIdx;
    const lastUserContent = messages[userIdx].content;

    // Remove messages after and including the last user message
    setMessages((prev) => prev.slice(0, userIdx));

    // Re-send the last user prompt (send will add it back)
    setTimeout(() => send(lastUserContent, sessionId), 0);
  }, [messages, send]);

  return {
    messages,
    chunks,
    metrics,
    isLoading,
    error,
    send,
    loadState,
    reset,
    reload,
    currentSessionId: sessionIdRef.current,
  };
}
