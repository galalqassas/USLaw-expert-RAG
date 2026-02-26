// Mock Response component to avoid complex dependency chain (including streamdown)
jest.mock('../Response', () => ({
  Response: ({ children }: { children: React.ReactNode }) => <div data-testid="markdown">{children}</div>,
}));

// Mock MessageReasoning to avoid complex dependency chain
jest.mock('../MessageReasoning', () => ({
  MessageReasoning: ({ reasoning }: { reasoning: string }) => (
    <div data-testid="mock-message-reasoning">{reasoning}</div>
  ),
}));


// Mock lucide-react
jest.mock('lucide-react', () => ({
  RotateCcw: () => <svg data-testid="icon-rotate-ccw" />,
  Download: () => <svg data-testid="icon-download" />,
  Loader2: () => <svg data-testid="icon-loader2" />,
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatBubble } from '../ChatBubble';
import { Message } from '@/types';

describe('ChatBubble', () => {
  const userMessage: Message = {
    id: '1',
    role: 'user',
    content: 'Hello AI',
  };

  const assistantMessage: Message = {
    id: '2',
    role: 'assistant',
    content: 'Hello User',
  };

  it('renders user message correctly', () => {
    render(<ChatBubble message={userMessage} />);
    expect(screen.getByText('Hello AI')).toBeInTheDocument();
    expect(screen.getByTestId('chat-bubble-user')).toHaveClass('justify-end');
  });

  it('renders assistant message correctly', () => {
    render(<ChatBubble message={assistantMessage} />);
    expect(screen.getByText('Hello User')).toBeInTheDocument();
    expect(screen.getByTestId('chat-bubble-assistant')).toHaveClass('justify-start');
  });

  it('parses and renders <think> tags correctly', () => {
    const thinkingMessage: Message = {
      id: '3',
      role: 'assistant',
      content: '<think>I am thinking about the answer.</think>Here is the answer.',
    };

    render(<ChatBubble message={thinkingMessage} />);

    // Check if thinking content is passed to MessageReasoning mock
    expect(screen.getByTestId('mock-message-reasoning')).toHaveTextContent('I am thinking about the answer.');

    // Check if main content is rendered separately
    expect(screen.getByText('Here is the answer.')).toBeInTheDocument();
  });

  it('renders only thinking content if no main content exists', () => {
    const thinkingOnlyMessage: Message = {
      id: '4',
      role: 'assistant',
      content: '<think>Just thinking...</think>',
    };

    render(<ChatBubble message={thinkingOnlyMessage} />);
    expect(screen.getByTestId('mock-message-reasoning')).toHaveTextContent('Just thinking...');
  });

  it('renders only main content if no thinking tags exist', () => {
    const normalMessage: Message = {
      id: '5',
      role: 'assistant',
      content: 'Just an answer.',
    };

    render(<ChatBubble message={normalMessage} />);
    expect(screen.queryByTestId('mock-message-reasoning')).not.toBeInTheDocument();
    expect(screen.getByText('Just an answer.')).toBeInTheDocument();
  });

  it('renders reload button when isLast is true and onReload is provided for assistant message', () => {
    const onReload = jest.fn();
    render(<ChatBubble message={assistantMessage} isLast={true} onReload={onReload} />);
    
    const reloadBtn = screen.getByTitle('Regenerate response');
    expect(reloadBtn).toBeInTheDocument();
    
    fireEvent.click(reloadBtn);
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it('does not render reload button if isLast is false', () => {
    const onReload = jest.fn();
    render(<ChatBubble message={assistantMessage} isLast={false} onReload={onReload} />);
    
    expect(screen.queryByTitle('Regenerate response')).not.toBeInTheDocument();
  });

  it('does not render reload button if onReload is undefined', () => {
    render(<ChatBubble message={assistantMessage} isLast={true} />);
    
    expect(screen.queryByTitle('Regenerate response')).not.toBeInTheDocument();
  });

  it('does not render reload button for user messages', () => {
    const onReload = jest.fn();
    render(<ChatBubble message={userMessage} isLast={true} onReload={onReload} />);
    
    expect(screen.queryByTitle('Regenerate response')).not.toBeInTheDocument();
  });
});

