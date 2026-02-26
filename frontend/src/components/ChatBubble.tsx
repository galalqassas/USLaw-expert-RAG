import { Message } from '@/types';
import { memo, useMemo, useState } from 'react';
import { RotateCcw, Download, Loader2 } from 'lucide-react';
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
  const [isExporting, setIsExporting] = useState(false);

  const thinkingContent = useMemo(() => {
    // Check regex first (for models that output <think>)
    const thinkMatch = message.content.match(/<think>([\s\S]*?)<\/think>/);
    let content = thinkMatch ? thinkMatch[1] : '';

    // Check data stream (for our Groq implementation)
    if (message.data) {
      const dataContent = message.data
        .filter((item) => item?.reasoning)
        .map((item) => item.reasoning as string)
        .join('');
      content += dataContent;
    }
    return content || null;
  }, [message.content, message.data]);

  const mainContent = useMemo(() => {
    return message.content.replace(/<think>[\s\S]*?<\/think>/, '').trim();
  }, [message.content]);

  const handleExportPdf = async () => {
    if (!mainContent) return;
    setIsExporting(true);
    try {
      // Auto-extract title: first heading or first non-empty line
      const headingMatch = mainContent.match(/^#{1,6}\s+(.+)$/m);
      const firstLine = mainContent.split('\n').find(l => l.trim().length > 0) ?? 'Chat Export';
      const title = (headingMatch ? headingMatch[1] : firstLine).replace(/[*_`#]/g, '').trim().substring(0, 80);

      const response = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown: mainContent, title }),
      });

      if (!response.ok) {
        console.error('Failed to generate PDF');
        return;
      }

      // Direct download — no popup, no print dialog
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };


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
            {thinkingContent && (
              <MessageReasoning 
                isLoading={isLast && !mainContent} 
                reasoning={thinkingContent} 
              />
            )}
            {mainContent && (
              <div className="prose prose-sm dark:prose-invert max-w-none break-words mt-2">
                <Response>{mainContent}</Response>
              </div>
            )}
          </>
        )}
        {isUser && (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        )}
      </div>

      {!isUser && (
        <div className="flex flex-col gap-1 ml-2 self-end">
          {showReloadButton && (
            <button
              onClick={onReload}
              className="p-1.5 rounded-full text-secondary-text hover:text-primary hover:bg-primary/10 transition-colors"
              title="Regenerate response"
              aria-label="Regenerate response"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          {mainContent && (
            <button
              onClick={handleExportPdf}
              disabled={isExporting}
              title="Download as PDF"
              aria-label="Download as PDF"
              className="p-1.5 rounded-full text-secondary-text hover:text-primary hover:bg-primary/10 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            </button>
          )}
        </div>
      )}
    </div>
  );
});
