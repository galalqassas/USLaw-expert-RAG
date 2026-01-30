import { renderHook, act } from '@testing-library/react';
import { useChat } from '@/hooks/useChat';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('useChat', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    // Default mock implementation for fetch
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

  it('sends a message and updates state', async () => {
    const { result } = renderHook(() => useChat());

    await act(async () => {
      result.current.send('Hello world');
    });

    // Check loading state (it might be false by now if the stream finished quickly in the mock)
    // But we can check if fetch was called
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith('/api/chat', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"content":"Hello world"'),
    }));
  });

  it('updates messages with user input', async () => {
    const { result } = renderHook(() => useChat());

    await act(async () => {
      result.current.send('User question');
    });

    expect(result.current.messages).toEqual(expect.arrayContaining([
      expect.objectContaining({ role: 'user', content: 'User question' }),
      expect.objectContaining({ role: 'assistant' }),
    ]));
  });

  it('resets state correctly', async () => {
    const { result } = renderHook(() => useChat());

    // Send a message first to change state
    await act(async () => {
      result.current.send('Test');
    });

    await act(async () => {
      result.current.reset();
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.chunks).toEqual([]);
    expect(result.current.metrics).toBeNull();
  });
});
