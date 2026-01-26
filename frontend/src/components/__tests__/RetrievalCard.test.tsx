import { render, screen, fireEvent } from '@testing-library/react';
import { RetrievalCard } from '@/components/RetrievalCard';
import { RetrievedChunk } from '@/types';
import { UI_TEXT, RELEVANCE_THRESHOLDS } from '@/lib/constants';

describe('RetrievalCard', () => {
  const mockChunk: RetrievedChunk = {
    id: 'test-1',
    title: 'Test Document Title',
    type: 'pdf',
    snippet: 'This is a test snippet for the document.',
    relevance: 95,
  };

  const mockOnExpand = jest.fn();

  beforeEach(() => {
    mockOnExpand.mockClear();
  });

  it('renders chunk title and snippet', () => {
    render(<RetrievalCard chunk={mockChunk} />);
    
    expect(screen.getByText(mockChunk.title)).toBeInTheDocument();
    expect(screen.getByText(mockChunk.snippet)).toBeInTheDocument();
  });

  it('displays relevance score with correct format', () => {
    render(<RetrievalCard chunk={mockChunk} />);
    
    const relevanceScore = screen.getByTestId('relevance-score');
    expect(relevanceScore).toHaveTextContent(`${mockChunk.relevance}${UI_TEXT.MATCH_SUFFIX}`);
  });

  it('renders file type badge', () => {
    render(<RetrievalCard chunk={mockChunk} />);
    
    expect(screen.getByTestId('file-badge-pdf')).toBeInTheDocument();
  });

  it('calls onExpand with chunk id when clicked', () => {
    render(<RetrievalCard chunk={mockChunk} onExpand={mockOnExpand} />);
    
    const card = screen.getByTestId(`retrieval-card-${mockChunk.id}`);
    fireEvent.click(card);
    
    expect(mockOnExpand).toHaveBeenCalledWith(mockChunk.id);
  });

  it('renders expand button', () => {
    render(<RetrievalCard chunk={mockChunk} />);
    
    expect(screen.getByTestId('expand-button')).toBeInTheDocument();
    expect(screen.getByText(UI_TEXT.EXPAND_BUTTON)).toBeInTheDocument();
  });

  describe('relevance color coding', () => {
    it('shows green for high relevance (>= 95)', () => {
      const highRelevanceChunk = { ...mockChunk, relevance: 96 };
      render(<RetrievalCard chunk={highRelevanceChunk} />);
      
      const score = screen.getByTestId('relevance-score');
      expect(score).toHaveClass('text-success');
    });

    it('shows warning for medium relevance (>= 90, < 95)', () => {
      const mediumRelevanceChunk = { ...mockChunk, relevance: 92 };
      render(<RetrievalCard chunk={mediumRelevanceChunk} />);
      
      const score = screen.getByTestId('relevance-score');
      expect(score).toHaveClass('text-warning');
    });

    it('shows secondary text for low relevance (< 90)', () => {
      const lowRelevanceChunk = { ...mockChunk, relevance: 85 };
      render(<RetrievalCard chunk={lowRelevanceChunk} />);
      
      const score = screen.getByTestId('relevance-score');
      expect(score).toHaveClass('text-secondary-text');
    });
  });
});
