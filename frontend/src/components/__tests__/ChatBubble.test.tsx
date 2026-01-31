// Mock react-markdown BEFORE any imports
jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="markdown">{children}</div>,
}));

// Mock MessageReasoning to avoid complex dependency chain
jest.mock('../MessageReasoning', () => ({
  MessageReasoning: ({ reasoning }: { reasoning: string }) => (
    <div data-testid="mock-message-reasoning">{reasoning}</div>
  ),
}));

// Mock remark-gfm
jest.mock('remark-gfm', () => () => {});

import React from 'react';
import { render, screen } from '@testing-library/react';
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
});
