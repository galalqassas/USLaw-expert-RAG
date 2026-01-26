'use client';

import { useState, useCallback, useRef } from 'react';
import { Message, RetrievedChunk, MetricsData } from '@/types';
import { sendQuery, ApiError } from '@/lib/api';
import { generateId } from '@/lib/utils';

interface ChatState {
  messages: Message[];
  chunks: RetrievedChunk[];
  metrics: MetricsData | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: ChatState = {
  messages: [],
  chunks: [],
  metrics: null,
  isLoading: false,
  error: null,
};

export function useChat() {
  const [state, setState] = useState<ChatState>(initialState);
  // Use ref to always have current messages without stale closure
  const messagesRef = useRef<Message[]>([]);
  messagesRef.current = state.messages;

  const send = useCallback(async (content: string) => {
    const userMessage: Message = { id: generateId(), role: 'user', content };
    const updatedMessages = [...messagesRef.current, userMessage];

    setState((s) => ({
      ...s,
      messages: updatedMessages,
      isLoading: true,
      error: null,
    }));

    try {
      const result = await sendQuery(updatedMessages);
      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: result.answer,
      };

      setState((s) => ({
        ...s,
        messages: [...s.messages, assistantMessage],
        chunks: result.chunks,
        metrics: result.metrics,
        isLoading: false,
      }));
    } catch (err) {
      const errorMsg =
        err instanceof ApiError
          ? err.message
          : 'An unexpected error occurred. Please try again.';

      const errorMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: errorMsg,
      };

      setState((s) => ({
        ...s,
        messages: [...s.messages, errorMessage],
        isLoading: false,
        error: errorMsg,
      }));
    }
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    ...state,
    send,
    reset,
  };
}
