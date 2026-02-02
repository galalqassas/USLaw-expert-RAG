import { render, screen, fireEvent } from '@testing-library/react';
import { ChatHistorySidebar } from '../ChatHistorySidebar';

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  MessageSquare: () => <svg data-testid="icon-message-square" />,
  Trash2: () => <svg data-testid="icon-trash-2" />,
  Plus: () => <svg data-testid="icon-plus" />,
  X: () => <svg data-testid="icon-x" />,
}));


describe('ChatHistorySidebar', () => {
  const mockProps = {
    sessions: [
      { id: '1', title: 'Today Chat', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), messageCount: 2 },
      { id: '2', title: 'Yesterday Chat', createdAt: new Date(Date.now() - 86400000).toISOString(), updatedAt: new Date(Date.now() - 86400000).toISOString(), messageCount: 5 }
    ],
    activeSessionId: null,
    onSelectSession: jest.fn(),
    onDeleteSession: jest.fn(),
    onNewChat: jest.fn(),
  };

  it('renders correctly', () => {
    render(<ChatHistorySidebar {...mockProps} />);
    expect(screen.getByText('New Chat')).toBeInTheDocument();
    expect(screen.getByText('Today Chat')).toBeInTheDocument();
  });

  it('groups chats correctly', () => {
    render(<ChatHistorySidebar {...mockProps} />);
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Yesterday')).toBeInTheDocument();
  });

  it('selects a session', () => {
    render(<ChatHistorySidebar {...mockProps} />);
    fireEvent.click(screen.getByText('Today Chat'));
    expect(mockProps.onSelectSession).toHaveBeenCalledWith('1');
  });

  it('triggers delete', () => {
    render(<ChatHistorySidebar {...mockProps} />);
    // Find delete button within the item
    const deleteBtn = screen.getAllByLabelText('Delete chat')[0];
    fireEvent.click(deleteBtn);
    expect(mockProps.onDeleteSession).toHaveBeenCalledWith('1');
  });

  it('triggers new chat', () => {
    render(<ChatHistorySidebar {...mockProps} />);
    fireEvent.click(screen.getByText('New Chat'));
    expect(mockProps.onNewChat).toHaveBeenCalled();
  });

  it('renders collapsed state', () => {
    render(<ChatHistorySidebar {...mockProps} isCollapsed={true} />);
    expect(screen.getByLabelText('New chat')).toBeInTheDocument();
    expect(screen.queryByText('Today Chat')).not.toBeInTheDocument();
  });
});
