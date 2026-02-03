import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
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
  const [isExpanded, setIsExpanded] = useState(false);
  const relevanceClass = getRelevanceColorClass(chunk.relevance);

  const handleClick = () => {
    setIsExpanded(!isExpanded);
    onExpand?.(chunk.id);
  };

  return (
    <div
      className={`p-4 bg-background border border-border rounded-xl shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group ${isExpanded ? 'border-primary/30 ring-1 ring-primary/20' : ''}`}
      data-testid={`retrieval-card-${chunk.id}`}
      onClick={handleClick}
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
      <p className={`text-xs text-secondary-text leading-relaxed mb-2 ${isExpanded ? '' : 'line-clamp-3'}`}>
        {chunk.snippet}
      </p>

      {/* Expand Button */}
      <button 
        type="button"
        className="flex items-center gap-1 text-xs text-primary bg-transparent border-none p-0 cursor-pointer"
        data-testid="expand-button"
        onClick={(e) => {
          e.stopPropagation();
          handleClick();
        }}
      >
        {isExpanded ? "Collapse" : UI_TEXT.EXPAND_BUTTON} 
        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
    </div>
  );
}
