import { renderHook, act } from '@testing-library/react';
import { useChatHistory } from '../useChatHistory';
import * as storage from '@/lib/storage';

// Mock the storage library
jest.mock('@/lib/storage', () => ({
  getSessionSummaries: jest.fn(),
  getSession: jest.fn(),
  saveSession: jest.fn(),
  deleteSession: jest.fn(),
  generateSessionId: jest.fn(),
}));

describe('useChatHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads sessions on mount', () => {
    (storage.getSessionSummaries as jest.Mock).mockReturnValue([
      { id: '1', title: 'Test 1', messageCount: 5 }
    ]);
    
    const { result } = renderHook(() => useChatHistory());
    
    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.sessions[0].id).toBe('1');
    expect(storage.getSessionSummaries).toHaveBeenCalledTimes(1);
  });

  it('creates new session', () => {
    (storage.generateSessionId as jest.Mock).mockReturnValue('new-id');
    
    const { result } = renderHook(() => useChatHistory());
    
    act(() => {
      const id = result.current.createSession();
      expect(id).toBe('new-id');
    });
    
    expect(result.current.activeSessionId).toBe('new-id');
  });

  it('loads specific session', () => {
    const mockMessages = [{ id: '1', role: 'user', content: 'Hi' }];
    (storage.getSession as jest.Mock).mockReturnValue({
      id: '1',
      messages: mockMessages
    });

    const { result } = renderHook(() => useChatHistory());

    act(() => {
      const msgs = result.current.loadSession('1');
      expect(msgs).toEqual(mockMessages);
    });

    expect(result.current.activeSessionId).toBe('1');
  });

  it('saves session and refreshes list', () => {
    const { result } = renderHook(() => useChatHistory());
    
    act(() => {
      result.current.saveSession('1', []);
    });
    
    expect(storage.saveSession).toHaveBeenCalled();
    expect(storage.getSessionSummaries).toHaveBeenCalled(); // Refreshes list
  });

  it('deletes session', () => {
    const { result } = renderHook(() => useChatHistory());
    
    act(() => {
      result.current.setActiveSessionId('1');
    });

    act(() => {
      result.current.deleteSession('1');
    });
    
    expect(storage.deleteSession).toHaveBeenCalledWith('1');
    expect(result.current.activeSessionId).toBeNull(); // Should clear active session
  });
});
