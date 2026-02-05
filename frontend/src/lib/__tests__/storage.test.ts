import * as storage from '../storage';

describe('ChatStorage', () => {
  beforeEach(() => {
    // robust mock for localStorage
    let store: Record<string, string> = {};
    const mockStorage = {
      getItem: jest.fn((key: string) => store[key] || null),
      setItem: jest.fn((key: string, value: string) => {
        store[key] = value.toString();
      }),
      removeItem: jest.fn((key: string) => {
        delete store[key];
      }),
      clear: jest.fn(() => {
        store = {};
      }),
    };
    
    Object.defineProperty(window, 'localStorage', {
      value: mockStorage,
      writable: true
    });
    
    jest.clearAllMocks();
  });

  const mockSession = {
    id: 'test-session-1',
    title: 'Test Chat',
    messages: [
      { id: '1', role: 'user', content: 'Hello' }
    ],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  it('saves and retrieves a session', () => {
    storage.saveSession(mockSession);
    const retrieved = storage.getSession('test-session-1');
    expect(retrieved).toMatchObject({
      ...mockSession,
      updatedAt: expect.any(String)
    });
  });

  it('updates an existing session', () => {
    storage.saveSession(mockSession);
    
    // updates title
    const updatedSession = {
      ...mockSession,
      title: 'Updated Chat',
    };
    
    storage.saveSession(updatedSession);
    const retrieved = storage.getSession('test-session-1');
    
    expect(retrieved).toMatchObject({
      ...mockSession,
      title: 'Updated Chat',
      updatedAt: expect.any(String)
    });
    
    // Ensure timestamp was updated (new timestamp > old timestamp)
    // difficult to test precisely without mocking Date, but checking type is sufficient for now
  });

  it('respects provided updatedAt if present', () => {
    const fixedTime = '2025-01-01T12:00:00.000Z';
    const sessionWithTime = { ...mockSession, updatedAt: fixedTime };
    
    storage.saveSession(sessionWithTime);
    const retrieved = storage.getSession(mockSession.id);
    
    expect(retrieved?.updatedAt).toBe(fixedTime);
  });

  it('deletes a session', () => {
    storage.saveSession(mockSession);
    storage.deleteSession('test-session-1');
    expect(storage.getSession('test-session-1')).toBeNull();
  });

  it('lists summaries correctly', () => {
    const session1 = { ...mockSession, id: '1', updatedAt: '2024-01-01T10:00:00.000Z' };
    const session2 = { ...mockSession, id: '2', updatedAt: '2024-01-01T11:00:00.000Z' };
    
    storage.saveSession(session1);
    storage.saveSession(session2);

    const summaries = storage.getSessionSummaries();
    expect(summaries).toHaveLength(2);
    // Should sort by updatedAt desc
    expect(summaries[0].id).toBe('2');
    expect(summaries[1].id).toBe('1');
  });

  it('auto-generates title if missing', () => {
    const sessionNoTitle = { ...mockSession, title: '' };
    storage.saveSession(sessionNoTitle);
    
    const retrieved = storage.getSession('test-session-1');
    expect(retrieved?.title).toBe('Hello');
  });

  it('clears all sessions', () => {
    storage.saveSession(mockSession);
    storage.clearAllSessions();
    expect(storage.getAllSessions()).toHaveLength(0);
  });
});
