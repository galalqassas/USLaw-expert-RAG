import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
  useDarkMode: () => ({
    isDark: false,
    toggle: jest.fn(),
  }),
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
