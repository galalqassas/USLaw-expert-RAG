import { ChevronDown } from 'lucide-react';
import { RetrievedChunk } from '@/types';
import { FileTypeBadge } from './FileTypeBadge';
import { RELEVANCE_THRESHOLDS, UI_TEXT } from '@/lib/constants';

interface RetrievalCardProps {
  chunk: RetrievedChunk;
  onExpand?: (id: string) => void;
}

function getRelevanceColorClass(relevance: number): string {
  if (relevance >= RELEVANCE_THRESHOLDS.HIGH) return 'text-success';
  if (relevance >= RELEVANCE_THRESHOLDS.MEDIUM) return 'text-warning';
  return 'text-secondary-text';
}

export function RetrievalCard({ chunk, onExpand }: RetrievalCardProps) {
  const relevanceClass = getRelevanceColorClass(chunk.relevance);

  return (
    <div
      className="p-4 bg-background border border-border rounded-xl shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group"
      data-testid={`retrieval-card-${chunk.id}`}
      onClick={() => onExpand?.(chunk.id)}
    >
      {/* Card Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <FileTypeBadge type={chunk.type} />
          <h3 className="text-sm font-medium text-foreground line-clamp-1">
            {chunk.title}
          </h3>
        </div>
        <span 
          className={`text-xs font-semibold ${relevanceClass}`}
          data-testid="relevance-score"
        >
          {chunk.relevance}{UI_TEXT.MATCH_SUFFIX}
        </span>
      </div>

      {/* Snippet */}
      <p className="text-xs text-secondary-text leading-relaxed line-clamp-3 mb-2">
        {chunk.snippet}
      </p>

      {/* Expand Button */}
      <button 
        className="flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity"
        data-testid="expand-button"
      >
        {UI_TEXT.EXPAND_BUTTON} <ChevronDown className="w-3 h-3" />
      </button>
    </div>
  );
}
