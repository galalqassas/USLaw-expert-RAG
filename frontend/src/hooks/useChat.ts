'use client';

/**
 * Custom useChat hook with Vercel AI SDK streaming support.
 * 
 * Wraps the Vercel AI SDK's useChat hook to provide:
 * - Streaming text responses from the backend
 * - Conversation history management
 * - Compatible interface with existing components
 * - Retrieved chunks and metrics (fetched separately after streaming)
 */

import { useChat as useVercelChat } from '@ai-sdk/react';
import { TextStreamChatTransport } from 'ai';
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Message, RetrievedChunk, MetricsData } from '@/types';
import { sendQuery } from '@/lib/api';

interface UseChatReturn {
  messages: Message[];
  chunks: RetrievedChunk[];
  metrics: MetricsData | null;
  isLoading: boolean;
  error: string | null;
  send: (content: string) => void;
  reset: () => void;
}

export function useChat(): UseChatReturn {
  // Retrieval data (fetched after streaming completes)
  const [chunks, setChunks] = useState<RetrievedChunk[]>([]);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  
  // Track the last processed message count to detect new completions
  const lastProcessedCount = useRef(0);

  // Use TextStreamChatTransport for plain text streaming from our backend
  const transport = useMemo(
    () => new TextStreamChatTransport({ api: '/api/chat' }),
    []
  );

  // Vercel AI SDK hook for streaming
  const {
    messages: rawMessages,
    sendMessage,
    status,
    error,
    setMessages,
  } = useVercelChat({ transport });

  const isLoading = status === 'streaming' || status === 'submitted';

  // Transform messages to our format
  // AI SDK v6 uses 'parts' array instead of 'content' string
  const messages: Message[] = rawMessages.map((m, i) => {
    // Extract text content from parts or fall back to content field
    let content = '';
    if (m.parts && Array.isArray(m.parts)) {
      content = m.parts
        .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
        .map(part => part.text)
        .join('');
    } else if (typeof (m as unknown as { content?: string }).content === 'string') {
      content = (m as unknown as { content: string }).content;
    }

    return {
      id: m.id || `msg-${i}`,
      role: m.role as 'user' | 'assistant',
      content,
    };
  });

  // Fetch sources after a response completes
  useEffect(() => {
    const messageCount = messages.length;
    const lastMessage = messages[messageCount - 1];
    
    // Only fetch sources when:
    // 1. Not loading (streaming complete)
    // 2. New messages since last check
    // 3. Last message is from assistant
    if (
      !isLoading &&
      messageCount > lastProcessedCount.current &&
      lastMessage?.role === 'assistant' &&
      lastMessage?.content
    ) {
      lastProcessedCount.current = messageCount;

      // Fetch sources using the existing /query endpoint
      sendQuery(messages)
        .then((result) => {
          setChunks(result.chunks);
          setMetrics(result.metrics);
        })
        .catch((err) => {
          console.error('Failed to fetch sources:', err);
        });
    }
  }, [messages, isLoading]);

  // Send a message
  const send = useCallback(
    (content: string) => {
      if (!content.trim()) return;
      
      // AI SDK v6 uses sendMessage with text property
      sendMessage({ text: content });
    },
    [sendMessage]
  );

  // Reset conversation
  const reset = useCallback(() => {
    setMessages([]);
    setChunks([]);
    setMetrics(null);
    lastProcessedCount.current = 0;
  }, [setMessages]);

  return {
    messages,
    chunks,
    metrics,
    isLoading,
    error: error?.message || null,
    send,
    reset,
  };
}
