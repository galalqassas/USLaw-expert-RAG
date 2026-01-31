import { render, screen } from '@testing-library/react';
import { MessageReasoning } from '../MessageReasoning';

// Mock the Reasoning components to avoid complex dependency chain
jest.mock('../elements/reasoning', () => ({
  Reasoning: ({ children, ...props }: { children: React.ReactNode }) => (
    <div data-testid="message-reasoning" {...props}>{children}</div>
  ),
  ReasoningContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="reasoning-content">{children}</div>
  ),
  ReasoningTrigger: () => <button data-testid="reasoning-trigger">Thinking</button>,
}));

describe('MessageReasoning', () => {
  it('renders reasoning content', () => {
    render(<MessageReasoning isLoading={false} reasoning="Detailed thought process here." />);
    expect(screen.getByTestId('reasoning-content')).toHaveTextContent('Detailed thought process here.');
  });

  it('shows trigger', () => {
    render(<MessageReasoning isLoading={true} reasoning="" />);
    expect(screen.getByTestId('reasoning-trigger')).toBeInTheDocument();
  });
  
  it('renders inside collapsible structure', () => {
    render(<MessageReasoning isLoading={false} reasoning="Logic explanation" />);
    expect(screen.getByTestId('message-reasoning')).toBeInTheDocument();
  });
});
