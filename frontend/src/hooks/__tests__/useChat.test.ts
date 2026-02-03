
// Polyfill for TextEncoder/TextDecoder in Jest environment
import { TextEncoder, TextDecoder } from 'util';
Object.assign(global, { TextEncoder, TextDecoder });

import { renderHook, act } from '@testing-library/react';
import { useChat } from '@/hooks/useChat';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('useChat', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Headers(),
      body: {
        getReader: () => ({
          read: jest.fn()
            .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('0:"Hello"\n') })
            .mockResolvedValueOnce({ done: true }),
        }),
      },
    });
  });

  it('initializes with empty state', () => {
    const { result } = renderHook(() => useChat());

    expect(result.current.messages).toEqual([]);
    expect(result.current.chunks).toEqual([]);
    expect(result.current.metrics).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sends a message with session ID', async () => {
    const { result } = renderHook(() => useChat());

    await act(async () => {
      result.current.send('Hello world', 'session-123');
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith('/api/chat', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"content":"Hello world"'),
    }));
  });

  it('updates messages with user input', async () => {
    const { result } = renderHook(() => useChat());

    await act(async () => {
      result.current.send('User question', 'session-123');
    });

    expect(result.current.messages).toEqual(expect.arrayContaining([
      expect.objectContaining({ role: 'user', content: 'User question' }),
      expect.objectContaining({ role: 'assistant' }),
    ]));
  });

  it('resets state correctly', async () => {
    const { result } = renderHook(() => useChat());

    await act(async () => {
      result.current.send('Test', 'session-123');
    });

    await act(async () => {
      result.current.reset();
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.chunks).toEqual([]);
    expect(result.current.metrics).toBeNull();
  });

  it('loadState sets messages, chunks, and metrics', () => {
    const { result } = renderHook(() => useChat());

    const messages = [{ id: '1', role: 'user' as const, content: 'Test' }];
    const chunks = [{ id: 'c1', title: 'Doc', type: 'pdf' as const, snippet: 'text', relevance: 80 }];
    const metrics = { retrievalTimeMs: 100, synthesisTimeMs: 200 };

    act(() => {
      result.current.loadState(messages, chunks, metrics);
    });

    expect(result.current.messages).toEqual(messages);
    expect(result.current.chunks).toEqual(chunks);
    expect(result.current.metrics).toEqual(metrics);
    expect(result.current.isLoading).toBe(false);
  });

  it('loadState clears error state', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    const { result } = renderHook(() => useChat());

    await act(async () => {
      result.current.send('Fail', 'session-123');
    });
    
    // Error should be set
    expect(result.current.error).toBeTruthy();

    act(() => {
      result.current.loadState([], [], null);
    });

    expect(result.current.error).toBeNull();
  });
  it('reload removes last assistant message and resends user prompt', async () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useChat());

    // Setup initial state: User message -> Assistant message
    await act(async () => {
      // Direct state manipulation isn't exposed, so we simulate the flow
      // 1. Send user message
      result.current.send('User Question', 'session-123');
    });

    // Simulate completion of first request/response
    await act(async () => {
       // Ideally we'd wait for mocks, but for this test we're simulating state via send's effects
       // Check state after send
    });

    expect(result.current.messages).toHaveLength(2); // User + Assistant

    // 2. Trigger reload
    await act(async () => {
      result.current.reload('session-123');
    });

    // Should remove the assistant message AND the user message (to avoid duplication when send() adds it back)
    expect(result.current.messages).toHaveLength(0);

    // Should trigger send after timeout
    await act(async () => {
      jest.runAllTimers();
    });

    // Should have added a new assistant message (loading state)
    expect(result.current.messages).toHaveLength(2);
    expect(mockFetch).toHaveBeenCalledTimes(2); // Initial send + reload send
    
    jest.useRealTimers();
  });

  it('detects and handles masked backend errors in stream', async () => {
    // Mock backend sending 200 OK but with error text
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers(),
      body: {
        getReader: () => ({
          read: jest.fn()
            // Simulate chunk with error pattern
            .mockResolvedValueOnce({ 
              done: false, 
              value: new TextEncoder().encode(`0:${JSON.stringify("\n\n**⚠️ Error:** Rate limit reached")}`) 
            })
            .mockResolvedValueOnce({ done: true }),
        }),
      },
    });

    const { result } = renderHook(() => useChat());

    await act(async () => {
      result.current.send('Trigger Error', 'session-123');
    });

    expect(result.current.error).toBe('Too many requests. Please wait a moment and try again.');
    // Should NOT have added the error text to messages
    const lastMsg = result.current.messages[result.current.messages.length - 1];
    expect(lastMsg.content).toBe('');
  });
});
