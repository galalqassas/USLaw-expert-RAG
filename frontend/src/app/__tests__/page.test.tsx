import { render, screen } from '@testing-library/react';
import Home from '@/app/page';

// Mock the hooks - updated for new useChat signature
jest.mock('@/hooks', () => ({
  useChat: jest.fn(() => ({
    messages: [],
    chunks: [],
    metrics: null,
    isLoading: false,
    error: null,
    send: jest.fn(),
    reset: jest.fn(),
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

  it('renders model selector', () => {
    render(<Home />);
    
    expect(screen.getByTestId('model-selector-mock')).toBeInTheDocument();
  });
});
