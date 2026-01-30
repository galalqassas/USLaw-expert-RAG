import { render, screen } from '@testing-library/react';
import { MetricsBadges } from '@/components/MetricsBadges';
import { MetricsData } from '@/types';
import { UI_TEXT } from '@/lib/constants';

describe('MetricsBadges', () => {
  const mockMetrics: MetricsData = {
    retrievalTimeMs: 120,
    synthesisTimeMs: 850,
  };

  it('renders metrics container', () => {
    render(<MetricsBadges metrics={mockMetrics} />);
    
    expect(screen.getByTestId('metrics-badges')).toBeInTheDocument();
  });

  it('displays retrieval time correctly', () => {
    render(<MetricsBadges metrics={mockMetrics} />);
    
    const retrievalTime = screen.getByTestId('retrieval-time');
    expect(retrievalTime).toHaveTextContent(`${(mockMetrics.retrievalTimeMs / 1000).toFixed(2)} sec`);
  });

  it('displays synthesis time correctly', () => {
    render(<MetricsBadges metrics={mockMetrics} />);
    
    const synthesisTime = screen.getByTestId('synthesis-time');
    expect(synthesisTime).toHaveTextContent(`${(mockMetrics.synthesisTimeMs / 1000).toFixed(2)} sec`);
  });

  it('displays correct labels from constants', () => {
    render(<MetricsBadges metrics={mockMetrics} />);
    
    expect(screen.getByText(`${UI_TEXT.RETRIEVAL_LABEL}:`, { exact: false })).toBeInTheDocument();
    expect(screen.getByText(`${UI_TEXT.SYNTHESIS_LABEL}:`, { exact: false })).toBeInTheDocument();
  });

  it('handles different metric values', () => {
    const fastMetrics: MetricsData = {
      retrievalTimeMs: 50,
      synthesisTimeMs: 200,
    };
    
    render(<MetricsBadges metrics={fastMetrics} />);
    
    expect(screen.getByTestId('retrieval-time')).toHaveTextContent('0.05 sec');
    expect(screen.getByTestId('synthesis-time')).toHaveTextContent('0.20 sec');
  });
});
