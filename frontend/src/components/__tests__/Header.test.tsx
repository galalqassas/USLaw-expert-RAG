import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from '@/components/Header';
import { APP_NAME } from '@/lib/constants';

// Mock next-themes
const mockSetTheme = jest.fn();
jest.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: mockSetTheme,
  }),
}));

describe('Header', () => {
  beforeEach(() => {
    mockSetTheme.mockClear();
  });

  it('renders app title from constants', () => {
    render(<Header />);
    
    const title = screen.getByTestId('app-title');
    expect(title).toHaveTextContent(APP_NAME);
  });

  it('renders dark mode toggle button', () => {
    render(<Header />);
    
    expect(screen.getByTestId('dark-mode-toggle')).toBeInTheDocument();
  });

  it('calls setTheme when toggle is clicked', () => {
    render(<Header />);
    
    fireEvent.click(screen.getByTestId('dark-mode-toggle'));
    
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });

  it('renders new chat button when onNewChat is provided', () => {
    const mockNewChat = jest.fn();
    render(<Header onNewChat={mockNewChat} />);
    
    const newChatBtn = screen.getByTitle('Start a new chat');
    expect(newChatBtn).toBeInTheDocument();
    
    fireEvent.click(newChatBtn);
    expect(mockNewChat).toHaveBeenCalled();
  });

  it('has correct accessibility labels', () => {
    render(<Header />);
    
    expect(screen.getByLabelText('Toggle dark mode')).toBeInTheDocument();
  });

  it('renders modelSelector when provided', () => {
    const ModelSelectorMock = () => <div data-testid="model-selector-slot">Model Selector</div>;
    render(<Header modelSelector={<ModelSelectorMock />} />);
    
    expect(screen.getByTestId('model-selector-slot')).toBeInTheDocument();
  });
});
