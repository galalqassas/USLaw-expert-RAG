import { render, screen } from '@testing-library/react';
import { TypingIndicator } from '@/components/TypingIndicator';

describe('TypingIndicator', () => {
  it('renders the typing indicator container', () => {
    render(<TypingIndicator />);
    
    // Should render 3 animated dots
    const container = screen.getByTestId('typing-indicator');
    expect(container).toBeInTheDocument();
  });

  it('renders three animated dots', () => {
    const { container } = render(<TypingIndicator />);
    
    const dots = container.querySelectorAll('.animate-bounce');
    expect(dots).toHaveLength(3);
  });

  it('applies correct styling classes', () => {
    const { container } = render(<TypingIndicator />);
    
    const bubble = container.querySelector('.bg-surface');
    expect(bubble).toBeInTheDocument();
    expect(bubble).toHaveClass('rounded-2xl', 'rounded-bl-md');
  });
});
