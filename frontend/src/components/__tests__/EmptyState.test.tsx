import { render, screen } from '@testing-library/react';
import { EmptyState } from '@/components/EmptyState';

describe('EmptyState', () => {
  it('renders the empty state message', () => {
    render(<EmptyState />);
    
    expect(screen.getByText('Ask a question about US Copyright Law to get started.')).toBeInTheDocument();
  });

  it('centers the content', () => {
    const { container } = render(<EmptyState />);
    
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('flex', 'items-center', 'justify-center');
  });

  it('applies secondary text styling', () => {
    const { container } = render(<EmptyState />);
    
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('text-secondary-text');
  });
});
