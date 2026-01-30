import { render, screen } from '@testing-library/react';
import Home from '@/app/page';

// Mock the hooks
jest.mock('@/hooks', () => ({
  useChat: () => ({
    messages: [],
    chunks: [],
    metrics: null,
    isLoading: false,
    error: null,
    send: jest.fn(),
    reset: jest.fn(),
  }),
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

describe('Home Page', () => {
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

  it('renders new chat button', () => {
    render(<Home />);
    
    expect(screen.getByTitle('Start a new chat')).toBeInTheDocument();
  });
});
