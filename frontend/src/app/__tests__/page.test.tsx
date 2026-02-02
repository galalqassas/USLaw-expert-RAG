import { render, screen } from '@testing-library/react';
import Home from '@/app/page';

const mockUseChat = jest.fn();

jest.mock('@/hooks', () => ({
  useChat: () => mockUseChat(),
  useChatHistory: jest.fn(() => ({
    sessions: [],
    activeSessionId: 'test-session-id',
    loadSession: jest.fn(() => []),
    saveSession: jest.fn(),
    deleteSession: jest.fn(),
    createSession: jest.fn(() => 'new-session-id'),
    setActiveSessionId: jest.fn(),
    refresh: jest.fn(),
  })),
}));

// Mock next-themes
jest.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: jest.fn(),
  }),
}));

// Mock ChatBubble to avoid ESM issues with react-markdown
jest.mock('@/components/ChatBubble', () => ({
  ChatBubble: () => <div data-testid="chat-bubble-mock">ChatBubble</div>,
}));

// Mock ModelSelector
jest.mock('@/components/ModelSelector', () => ({
  ModelSelector: ({ value, onValueChange }: { value: string; onValueChange: (v: string) => void }) => (
    <button data-testid="model-selector-mock" onClick={() => onValueChange('test-model')}>
      {value}
    </button>
  ),
}));

// Mock ChatHistorySidebar
jest.mock('@/components/ChatHistorySidebar', () => ({
  ChatHistorySidebar: ({ onNewChat }: { onNewChat: () => void }) => (
    <aside data-testid="chat-history-sidebar">
      <button onClick={onNewChat}>New Chat</button>
    </aside>
  ),
}));

describe('Home Page', () => {
  beforeEach(() => {
    mockUseChat.mockReturnValue({
      messages: [],
      chunks: [],
      metrics: null,
      isLoading: false,
      error: null,
      send: jest.fn(),
      reset: jest.fn(),
      setMessages: jest.fn(),
    });
  });

  it('renders empty state initially', () => {
    render(<Home />);
    
    expect(screen.getByText('Ask a question about US Copyright Law to get started.')).toBeInTheDocument();
    expect(screen.getByTestId('app-title')).toBeInTheDocument();
  });

  it('renders sources panel', () => {
    render(<Home />);
    
    expect(screen.getByText('Sources')).toBeInTheDocument();
    expect(screen.getByText('No sources retrieved yet.')).toBeInTheDocument();
  });

  it('renders new chat button in header', () => {
    render(<Home />);
    
    expect(screen.getByTitle('Start a new chat')).toBeInTheDocument();
  });

  it('renders model selector', () => {
    render(<Home />);
    
    expect(screen.getByTestId('model-selector-mock')).toBeInTheDocument();
  });

  it('renders chat history sidebar', () => {
    render(<Home />);
    
    expect(screen.getByTestId('chat-history-sidebar')).toBeInTheDocument();
  });

  it('renders SuggestedActions when messages are empty', () => {
    mockUseChat.mockReturnValue({
      messages: [],
      chunks: [],
      metrics: null,
      isLoading: false,
      error: null,
      send: jest.fn(),
      reset: jest.fn(),
      setMessages: jest.fn(),
    });

    render(<Home />);
    
    // Check for a known suggested action text from SuggestedActions component
    expect(screen.getByText('What works are eligible for copyright protection?')).toBeInTheDocument();
  });

  it('does not render SuggestedActions when messages exist', () => {
    mockUseChat.mockReturnValue({
      messages: [{ id: '1', role: 'user', content: 'Hello' }],
      chunks: [],
      metrics: null,
      isLoading: false,
      error: null,
      send: jest.fn(),
      reset: jest.fn(),
      setMessages: jest.fn(),
    });

    render(<Home />);
    
    expect(screen.queryByText('What works are eligible for copyright protection?')).not.toBeInTheDocument();
  });
});
