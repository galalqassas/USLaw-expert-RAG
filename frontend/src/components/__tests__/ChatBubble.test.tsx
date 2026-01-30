import { render, screen } from '@testing-library/react';
import { ChatBubble } from '@/components/ChatBubble';
import { Message } from '@/types';

// Mock react-markdown and remark-gfm to avoid ESM issues
jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="markdown">{children}</div>,
}));

jest.mock('remark-gfm', () => ({
  __esModule: true,
  default: () => {},
}));

describe('ChatBubble', () => {
  const userMessage: Message = {
    id: 'user-1',
    role: 'user',
    content: 'This is a user message',
  };

  const assistantMessage: Message = {
    id: 'assistant-1',
    role: 'assistant',
    content: 'This is an assistant response',
  };

  it('renders user message content', () => {
    render(<ChatBubble message={userMessage} />);
    
    expect(screen.getByText(userMessage.content)).toBeInTheDocument();
  });

  it('renders assistant message content', () => {
    render(<ChatBubble message={assistantMessage} />);
    
    expect(screen.getByText(assistantMessage.content)).toBeInTheDocument();
  });

  it('applies user styling for user messages', () => {
    render(<ChatBubble message={userMessage} />);
    
    const bubble = screen.getByTestId('chat-bubble-user');
    expect(bubble).toBeInTheDocument();
  });

  it('applies assistant styling for assistant messages', () => {
    render(<ChatBubble message={assistantMessage} />);
    
    const bubble = screen.getByTestId('chat-bubble-assistant');
    expect(bubble).toBeInTheDocument();
  });

  it('handles long messages', () => {
    const longMessage: Message = {
      id: 'long-1',
      role: 'user',
      content: 'A'.repeat(500),
    };
    
    render(<ChatBubble message={longMessage} />);
    
    expect(screen.getByText(longMessage.content)).toBeInTheDocument();
  });
});
