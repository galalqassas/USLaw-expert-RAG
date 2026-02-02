import { render, screen, fireEvent } from '@testing-library/react';
import { SuggestedActions } from '@/components/SuggestedActions';

describe('SuggestedActions', () => {
  const mockOnAppend = jest.fn();

  beforeEach(() => {
    mockOnAppend.mockClear();
  });

  it('renders all suggested actions', () => {
    render(<SuggestedActions onAppend={mockOnAppend} />);
    
    expect(screen.getByText('What is the range of statutory damages for copyright infringement?')).toBeInTheDocument();
    expect(screen.getByText('What works are eligible for copyright protection?')).toBeInTheDocument();
  });

  it('calls onAppend with the suggested action text when clicked', () => {
    render(<SuggestedActions onAppend={mockOnAppend} />);
    
    const actionButton = screen.getByText('What works are eligible for copyright protection?');
    fireEvent.click(actionButton);
    
    expect(mockOnAppend).toHaveBeenCalledWith('What works are eligible for copyright protection?');
  });
});
