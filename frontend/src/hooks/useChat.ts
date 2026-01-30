'use client';

/**
 * useChat - Custom hook for streaming chat with RAG sources.
 * Handles Vercel AI SDK Data Stream Protocol:
 *   - `0:` text delta events (streamed to UI)
 *   - `2:` data events (sources + retrieval metrics)
 */

import { useState, useCallback, useRef } from 'react';
import { Message, RetrievedChunk, MetricsData, FileType } from '@/types';

// --- Types ---

interface UseChatReturn {
  messages: Message[];
  chunks: RetrievedChunk[];
  metrics: MetricsData | null;
  isLoading: boolean;
  error: string | null;
  send: (content: string) => void;
  reset: () => void;
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

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chunks, setChunks] = useState<RetrievedChunk[]>([]);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef(0);
  const retrievalMsRef = useRef(0);

  const send = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();

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
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(`Server error: ${await res.text()}`);
      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const updateContent = (token: string) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + token } : m))
        );
      };

      const processLine = (line: string) => {
        const colonIdx = line.indexOf(':');
        if (colonIdx === -1) return;

        const type = line.slice(0, colonIdx);
        const payload = line.slice(colonIdx + 1);

        try {
          if (type === '0') {
            updateContent(JSON.parse(payload));
          } else if (type === '2') {
            const data = JSON.parse(payload);
            const sources = Array.isArray(data) ? data : data.sources || [];
            if (data.retrieval_time) {
              retrievalMsRef.current = Math.round(data.retrieval_time * 1000);
              setMetrics({ retrievalTimeMs: retrievalMsRef.current, synthesisTimeMs: 0 });
            }
            setChunks(mapSources(sources));
          }
        } catch { /* ignore parse errors */ }
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

      const synthesisMs = Math.max(0, Date.now() - startTimeRef.current - retrievalMsRef.current);
      setMetrics({ retrievalTimeMs: retrievalMsRef.current, synthesisTimeMs: synthesisMs });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setChunks([]);
    setMetrics(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { messages, chunks, metrics, isLoading, error, send, reset };
}
