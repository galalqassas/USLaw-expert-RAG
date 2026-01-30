import { renderHook, act, waitFor } from '@testing-library/react';
import { useChat } from '@/hooks/useChat';

// Mock the Vercel AI SDK
const mockSendMessage = jest.fn();
const mockSetMessages = jest.fn();

jest.mock('@ai-sdk/react', () => ({
  useChat: jest.fn(() => ({
    messages: [],
    sendMessage: mockSendMessage,
    status: 'ready',
    error: null,
    setMessages: mockSetMessages,
  })),
}));

jest.mock('ai', () => ({
  DefaultChatTransport: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('@/lib/api', () => ({
  sendQuery: jest.fn().mockResolvedValue({
    answer: 'Test answer',
    chunks: [],
    metrics: { retrievalTimeMs: 100, synthesisTimeMs: 200 },
  }),
}));

describe('useChat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with empty state', () => {
    const { result } = renderHook(() => useChat());

    expect(result.current.messages).toEqual([]);
    expect(result.current.chunks).toEqual([]);
    expect(result.current.metrics).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('has send and reset functions', () => {
    const { result } = renderHook(() => useChat());

    expect(typeof result.current.send).toBe('function');
    expect(typeof result.current.reset).toBe('function');
  });

  it('calls sendMessage when send() is called with content', () => {
    const { result } = renderHook(() => useChat());

    act(() => {
      result.current.send('Hello');
    });

    expect(mockSendMessage).toHaveBeenCalledWith({ text: 'Hello' });
  });

  it('does not call sendMessage for empty content', () => {
    const { result } = renderHook(() => useChat());

    act(() => {
      result.current.send('');
    });

    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it('does not call sendMessage for whitespace-only content', () => {
    const { result } = renderHook(() => useChat());

    act(() => {
      result.current.send('   ');
    });

    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it('calls setMessages with empty array when reset() is called', () => {
    const { result } = renderHook(() => useChat());

    act(() => {
      result.current.reset();
    });

    expect(mockSetMessages).toHaveBeenCalledWith([]);
  });

  it('resets chunks and metrics on reset()', () => {
    const { result } = renderHook(() => useChat());

    act(() => {
      result.current.reset();
    });

    expect(result.current.chunks).toEqual([]);
    expect(result.current.metrics).toBeNull();
  });
});
