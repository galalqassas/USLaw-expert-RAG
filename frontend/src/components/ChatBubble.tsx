import { Message } from '@/types';
import { memo } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MessageReasoning } from './MessageReasoning';

interface ChatBubbleProps {
  message: Message;
}

// Extract components to avoid re-creation on every render
const MARKDOWN_COMPONENTS: Components = {
  h1: ({ children }) => <h1 className="text-lg font-bold mt-4 mb-2">{children}</h1>,
  h2: ({ children }) => <h2 className="text-base font-bold mt-3 mb-2">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-bold mt-2 mb-1">{children}</h3>,
  p: ({ children }) => <p className="text-sm leading-relaxed mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="list-disc list-inside text-sm mb-2 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside text-sm mb-2 space-y-1">{children}</ol>,
  li: ({ children }) => <li className="text-sm">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  code: ({ children, className }) => {
    const isInline = !className?.includes('language-');
    return (
      <code className={`${isInline ? 'bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded text-xs' : 'block bg-black/80 text-white p-2 rounded-md my-2 overflow-x-auto'} font-mono`}>
        {children}
      </code>
    );
  },
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-primary pl-3 italic text-sm opacity-80 my-2">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-4 border border-border rounded-lg">
      <table className="min-w-full divide-y divide-border text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-secondary/20">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-border bg-transparent">{children}</tbody>,
  tr: ({ children }) => <tr>{children}</tr>,
  th: ({ children }) => (
    <th className="px-3 py-2 text-left font-semibold text-foreground/80 uppercase tracking-wider text-xs">
      {children}
    </th>
  ),
  td: ({ children }) => <td className="px-3 py-2 whitespace-normal text-foreground/80">{children}</td>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:opacity-80">
      {children}
    </a>
  ),
};

export const ChatBubble = memo(function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === 'user';
  
  // Memoize the content to prevent unnecessary re-renders of the markdown parser
  // although ReactMarkdown is generally good about this, memoizing the component wrapper helps.

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
                      isLoading={false} // Since we are parsing full content, we can assume it's static or we'd need better streaming logic
                      reasoning={thinkingContent} 
                    />
                  )}
                  {mainContent && (
                     <div className="prose prose-sm dark:prose-invert max-w-none break-words mt-2">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
                        {mainContent}
                      </ReactMarkdown>
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
    </div>
  );
});
