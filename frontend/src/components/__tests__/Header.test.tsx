import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from '@/components/Header';
import { APP_NAME } from '@/lib/constants';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Sun: () => <svg data-testid="icon-sun" />,
  Moon: () => <svg data-testid="icon-moon" />,
  PlusCircle: () => <svg data-testid="icon-plus-circle" />,
  PanelLeft: () => <svg data-testid="icon-panel-left" />,
  PanelRight: () => <svg data-testid="icon-panel-right" />,
}));

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

  it('renders menu toggle button and calls onMenuClick', () => {
    const mockMenuClick = jest.fn();
    render(<Header onMenuClick={mockMenuClick} />);
    
    const menuBtn = screen.getByTestId('menu-toggle');
    expect(menuBtn).toBeInTheDocument();
    
    fireEvent.click(menuBtn);
    expect(mockMenuClick).toHaveBeenCalled();
  });

  it('renders sources toggle button and calls onSourcesClick', () => {
    const mockSourcesClick = jest.fn();
    render(<Header onSourcesClick={mockSourcesClick} />);
    
    const sourcesBtn = screen.getByTestId('sources-toggle');
    expect(sourcesBtn).toBeInTheDocument();
    
    fireEvent.click(sourcesBtn);
    expect(mockSourcesClick).toHaveBeenCalled();
  });

  it('shows notification dot when hasChunks is true', () => {
    render(<Header hasChunks={true} onSourcesClick={() => {}} />);
    
    const sourcesBtn = screen.getByTestId('sources-toggle');
    // Check that there's a span with the notification dot class inside the button
    const notificationDot = sourcesBtn.querySelector('span.bg-primary');
    expect(notificationDot).toBeInTheDocument();
  });
});

