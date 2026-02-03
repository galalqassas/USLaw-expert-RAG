import { Message } from '@/types';
import { memo } from 'react';
import { RotateCcw } from 'lucide-react';
import { MessageReasoning } from './MessageReasoning';
import { Response } from './Response';

interface ChatBubbleProps {
  message: Message;
  /** If provided, renders a reload button for the assistant message */
  onReload?: () => void;
  /** Whether this is the last message (controls reload button visibility) */
  isLast?: boolean;
}

export const ChatBubble = memo(function ChatBubble({ 
  message, 
  onReload,
  isLast = false,
}: ChatBubbleProps) {
  const isUser = message.role === 'user';
  const showReloadButton = !isUser && isLast && onReload;

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
      data-testid={`chat-bubble-${message.role}`}
    >
      <div
        className={`max-w-[85%] px-4 py-3 rounded-2xl ${
          isUser
            ? 'bg-primary text-white rounded-br-md'
            : 'bg-surface text-foreground border border-border rounded-bl-md'
        }`}
      >
        {!isUser && (
          <>
            {(() => {
              const thinkMatch = message.content.match(/<think>([\s\S]*?)<\/think>/);
              const thinkingContent = thinkMatch ? thinkMatch[1] : null;
              const mainContent = message.content.replace(/<think>[\s\S]*?<\/think>/, '').trim();

              return (
                <>
                  {thinkingContent && (
                    <MessageReasoning 
                      isLoading={false}
                      reasoning={thinkingContent} 
                    />
                  )}
                  {mainContent && (
                    <div className="prose prose-sm dark:prose-invert max-w-none break-words mt-2">
                      <Response>{mainContent}</Response>
                    </div>
                  )}
                </>
              );
            })()}
          </>
        )}
        {isUser && (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        )}
      </div>

      {showReloadButton && (
        <button
          onClick={onReload}
          className="ml-2 p-1.5 rounded-full text-secondary-text hover:text-primary hover:bg-primary/10 transition-colors self-end"
          title="Regenerate response"
          aria-label="Regenerate response"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      )}
    </div>
  );
});
