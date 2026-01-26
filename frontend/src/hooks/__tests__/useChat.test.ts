import { renderHook, act } from '@testing-library/react';
import { useChat } from '@/hooks/useChat';
import { sendQuery, ApiError } from '@/lib/api';

jest.mock('@/lib/api');
jest.mock('@/lib/utils', () => ({
  generateId: () => 'mock-id',
}));

describe('useChat', () => {
  const mockSendQuery = sendQuery as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with empty state', () => {
    const { result } = renderHook(() => useChat());

    expect(result.current.messages).toEqual([]);
    expect(result.current.chunks).toEqual([]);
    expect(result.current.metrics).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('adds user message and sets loading state', () => {
    mockSendQuery.mockResolvedValue({
      answer: 'Test',
      chunks: [],
      metrics: { retrievalTimeMs: 100, synthesisTimeMs: 200 },
    });

    const { result } = renderHook(() => useChat());

    act(() => {
      result.current.send('Hello');
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].content).toBe('Hello');
    expect(result.current.isLoading).toBe(true);
  });

  it('resets state on reset()', () => {
    const { result } = renderHook(() => useChat());

    act(() => {
      result.current.reset();
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.chunks).toEqual([]);
  });
});
