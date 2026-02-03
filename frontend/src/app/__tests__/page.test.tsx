import { render, screen, fireEvent } from '@testing-library/react';
import Home from '@/app/page';

const mockChatState = {
  messages: [] as { id: string; role: string; content: string }[],
  chunks: [],
  metrics: null,
  isLoading: false,
  error: null,
};

jest.mock('@/hooks', () => ({
  useChat: () => ({
    ...mockChatState,
    send: jest.fn(),
    reset: jest.fn(),
    loadState: jest.fn(),
    currentSessionId: 'test-session-id',
  }),
  useChatHistory: jest.fn(() => ({
    sessions: [],
    activeSessionId: 'test-session-id',
    loadSession: jest.fn(() => ({ messages: [], chunks: [], metrics: null })),
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

// Mock lucide-react
jest.mock('lucide-react', () => ({
  X: () => <svg data-testid="icon-x" />,
  Send: () => <svg data-testid="icon-send" />,
  AlertTriangle: () => <svg data-testid="icon-alert-triangle" />,
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
  ChatHistorySidebar: ({ onNewChat, onClose }: { onNewChat: () => void; onClose?: () => void }) => (
    <aside data-testid="chat-history-sidebar">
      <button onClick={onNewChat}>New Chat</button>
      {onClose && <button onClick={onClose}>Close</button>}
    </aside>
  ),
}));

// Mock Header component to avoid lucide-react import issues
jest.mock('@/components/Header', () => ({
  Header: ({ onNewChat, modelSelector, onMenuClick, onSourcesClick }: { onNewChat: () => void; modelSelector: React.ReactNode; onMenuClick: () => void; onSourcesClick: () => void; }) => (
    <header data-testid="header">
      <h1 data-testid="app-title">US Law Expert</h1>
      {modelSelector}
      <button data-testid="menu-toggle" onClick={onMenuClick}>Toggle Menu</button>
      <button data-testid="sources-toggle" onClick={onSourcesClick}>Toggle Sources</button>
      {onNewChat && <button title="Start a new chat" onClick={onNewChat}>New Chat</button>}
    </header>
  ),
}));

const resizeWindow = (width: number) => {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
  window.dispatchEvent(new Event('resize'));
};

describe('Home Page', () => {
  beforeEach(() => {
    mockChatState.messages = [];
    mockChatState.chunks = [];
    mockChatState.metrics = null;
    mockChatState.isLoading = false;
    mockChatState.error = null;
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
    mockChatState.messages = [];
    render(<Home />);
    
    // Check for a known suggested action text from SuggestedActions component
    expect(screen.getByText('What works are eligible for copyright protection?')).toBeInTheDocument();
  });

  it('does not render SuggestedActions when messages exist', () => {
    mockChatState.messages = [{ id: '1', role: 'user', content: 'Hello' }];
    render(<Home />);
    
    expect(screen.queryByText('What works are eligible for copyright protection?')).not.toBeInTheDocument();
  });

  it('renders error message when present', () => {
    mockChatState.error = 'Too many requests. Please wait a moment.';
    render(<Home />);
    
    expect(screen.getByText('Too many requests. Please wait a moment.')).toBeInTheDocument();
  });

  describe('Responsive Layout', () => {
    it('toggles history sidebar collapse on desktop', () => {
      resizeWindow(1280); // Desktop
      render(<Home />);
      
      const sidebar = screen.getByTestId('chat-history-sidebar').parentElement;
      // Initial state: expanded (w-64)
      expect(sidebar).toHaveClass('md:w-64');

      // Click toggle
      const toggleBtn = screen.getByTestId('menu-toggle');
      fireEvent.click(toggleBtn);

      // Collapsed state: w-12
      expect(sidebar).toHaveClass('md:w-12');
    });

    it('toggles sources panel visibility on desktop', () => {
      resizeWindow(1280); // Desktop
      render(<Home />);
      
      const sourcesPanel = screen.getByText('Sources').closest('aside');
      
      // Initial state: visible
      expect(sourcesPanel).toHaveClass('lg:w-[400px]');
      
      // Click toggle
      const toggleBtn = screen.getByTestId('sources-toggle');
      fireEvent.click(toggleBtn);
      
      // Hidden state
      expect(sourcesPanel).toHaveClass('lg:w-0');
    });

    it('opens and closes history drawer on mobile', () => {
      resizeWindow(375); // Mobile
      render(<Home />);
      
      const sidebarContainer = screen.getByTestId('chat-history-sidebar').parentElement;
      
      // Initial state: hidden off-screen
      expect(sidebarContainer).toHaveClass('-translate-x-full');

      // Click toggle
      fireEvent.click(screen.getByTestId('menu-toggle'));
      
      // Open state
      expect(sidebarContainer).toHaveClass('translate-x-0');
      
      // Close via overlay
      const overlay = screen.getByTestId('mobile-overlay');
      expect(overlay).toBeInTheDocument();
      fireEvent.click(overlay);
      
      // Back to hidden
      expect(sidebarContainer).toHaveClass('-translate-x-full');
    });

    it('opens and closes sources drawer on mobile', () => {
      resizeWindow(375); // Mobile
      render(<Home />);
      
      const sourcesPanel = screen.getByText('Sources').closest('aside');
      
      // Initial: not fixed (because hidden logic applies via class, but effectively off-screen or handled via layout)
      // Actually, mobile logic: 
      // sourcesOpen && 'fixed inset-y-0 right-0 w-full ...'
      // If not open, it's hidden via styling or standard desktop classes if they leak?
      // Wait, sources panel has `hidden lg:block`.
      // So on mobile, it is HIDDEN by default.
      
      expect(sourcesPanel).toHaveClass('hidden');

      // Click toggle
      fireEvent.click(screen.getByTestId('sources-toggle'));
      
      // Now it should be block and fixed
      expect(sourcesPanel).not.toHaveClass('hidden');
      expect(sourcesPanel).toHaveClass('fixed');
      
      // Close via overlay
      const overlay = screen.getByTestId('mobile-overlay');
      fireEvent.click(overlay);
      
      // Back to hidden
      expect(screen.queryByTestId('mobile-overlay')).not.toBeInTheDocument();
      expect(sourcesPanel).toHaveClass('hidden');
    });
  });
});
