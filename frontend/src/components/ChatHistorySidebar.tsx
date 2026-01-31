'use client';

/**
 * ChatHistorySidebar
 * 
 * Left sidebar component displaying chat history.
 * Grouped by date (Today, Yesterday, Last 7 days, Older).
 */

import { memo, useMemo } from 'react';
import { MessageSquare, Trash2, Plus } from 'lucide-react';
import { ChatSessionSummary } from '@/types/chat-history';
import { cn } from '@/lib/utils';

// --- Types ---
interface ChatHistorySidebarProps {
  sessions: ChatSessionSummary[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onNewChat: () => void;
  isCollapsed?: boolean;
}

interface ChatHistoryItemProps {
  session: ChatSessionSummary;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

// --- Helpers ---
type DateGroup = 'today' | 'yesterday' | 'lastWeek' | 'older';

function getDateGroup(dateString: string): DateGroup {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0 && date.getDate() === now.getDate()) return 'today';
  if (diffDays === 1 || (diffDays === 0 && date.getDate() !== now.getDate())) return 'yesterday';
  if (diffDays <= 7) return 'lastWeek';
  return 'older';
}

const GROUP_LABELS: Record<DateGroup, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  lastWeek: 'Last 7 days',
  older: 'Older',
};

// --- Components ---
const ChatHistoryItem = memo(function ChatHistoryItem({
  session,
  isActive,
  onSelect,
  onDelete,
}: ChatHistoryItemProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      className={cn(
        'group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors',
        'hover:bg-surface-hover',
        isActive && 'bg-primary/10 text-primary'
      )}
    >
      <MessageSquare className="w-4 h-4 shrink-0 opacity-60" />
      <span className="flex-1 text-sm truncate">{session.title}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 
                   hover:text-destructive transition-opacity"
        aria-label="Delete chat"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
});

export const ChatHistorySidebar = memo(function ChatHistorySidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  onNewChat,
  isCollapsed = false,
}: ChatHistorySidebarProps) {
  // Group sessions by date
  const groupedSessions = useMemo(() => {
    const groups: Record<DateGroup, ChatSessionSummary[]> = {
      today: [],
      yesterday: [],
      lastWeek: [],
      older: [],
    };

    sessions.forEach((session) => {
      const group = getDateGroup(session.updatedAt);
      groups[group].push(session);
    });

    return groups;
  }, [sessions]);

  if (isCollapsed) {
    return (
      <aside className="w-12 border-r border-border bg-surface flex flex-col items-center py-4">
        <button
          onClick={onNewChat}
          className="p-2 rounded-lg hover:bg-surface-hover transition-colors"
          aria-label="New chat"
        >
          <Plus className="w-5 h-5" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-64 border-r border-border bg-surface flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 
                     bg-primary text-primary-foreground rounded-lg font-medium
                     hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {sessions.length === 0 ? (
          <p className="text-sm text-secondary-text italic text-center py-4">
            No conversations yet
          </p>
        ) : (
          (Object.keys(GROUP_LABELS) as DateGroup[]).map((group) => {
            const groupSessions = groupedSessions[group];
            if (groupSessions.length === 0) return null;

            return (
              <div key={group}>
                <h3 className="px-3 py-1 text-xs font-medium text-secondary-text uppercase tracking-wider">
                  {GROUP_LABELS[group]}
                </h3>
                <div className="space-y-0.5">
                  {groupSessions.map((session) => (
                    <ChatHistoryItem
                      key={session.id}
                      session={session}
                      isActive={session.id === activeSessionId}
                      onSelect={() => onSelectSession(session.id)}
                      onDelete={() => onDeleteSession(session.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
});
