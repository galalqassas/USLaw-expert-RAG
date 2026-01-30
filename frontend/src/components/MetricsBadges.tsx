import { MetricsData } from '@/types';
import { UI_TEXT } from '@/lib/constants';

interface MetricsBadgesProps {
  metrics: MetricsData;
}

export function MetricsBadges({ metrics }: MetricsBadgesProps) {
  return (
    <div className="flex gap-3 mb-5" data-testid="metrics-badges">
      <span className="px-3 py-1.5 text-xs font-medium bg-background border border-border rounded-full text-secondary-text">
        {UI_TEXT.RETRIEVAL_LABEL}: <span className="text-success font-semibold" data-testid="retrieval-time">{(metrics.retrievalTimeMs / 1000).toFixed(2)} sec</span>
      </span>
      <span className="px-3 py-1.5 text-xs font-medium bg-background border border-border rounded-full text-secondary-text">
        {UI_TEXT.SYNTHESIS_LABEL}: <span className="text-warning font-semibold" data-testid="synthesis-time">{(metrics.synthesisTimeMs / 1000).toFixed(2)} sec</span>
      </span>
    </div>
  );
}
