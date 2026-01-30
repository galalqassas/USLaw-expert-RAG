import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from '@/components/Header';
import { APP_NAME } from '@/lib/constants';

describe('Header', () => {
  const mockToggle = jest.fn();

  beforeEach(() => {
    mockToggle.mockClear();
  });

  it('renders app title from constants', () => {
    render(<Header darkMode={false} onToggleDarkMode={mockToggle} />);
    
    const title = screen.getByTestId('app-title');
    expect(title).toHaveTextContent(APP_NAME);
  });

  it('renders dark mode toggle button', () => {
    render(<Header darkMode={false} onToggleDarkMode={mockToggle} />);
    
    expect(screen.getByTestId('dark-mode-toggle')).toBeInTheDocument();
  });

  it('calls onToggleDarkMode when toggle is clicked', () => {
    render(<Header darkMode={false} onToggleDarkMode={mockToggle} />);
    
    fireEvent.click(screen.getByTestId('dark-mode-toggle'));
    
    expect(mockToggle).toHaveBeenCalledTimes(1);
  });

  it('renders new chat button when onNewChat is provided', () => {
    const mockNewChat = jest.fn();
    render(<Header darkMode={false} onToggleDarkMode={mockToggle} onNewChat={mockNewChat} />);
    
    const newChatBtn = screen.getByTitle('Start a new chat');
    expect(newChatBtn).toBeInTheDocument();
    
    fireEvent.click(newChatBtn);
    expect(mockNewChat).toHaveBeenCalled();
  });

  it('has correct accessibility labels', () => {
    render(<Header darkMode={false} onToggleDarkMode={mockToggle} />);
    
    expect(screen.getByLabelText('Toggle dark mode')).toBeInTheDocument();
  });
});
