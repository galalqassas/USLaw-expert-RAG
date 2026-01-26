'use client';

import { useChat, useDarkMode } from '@/hooks';
import { Header, ChatBubble, ChatInput, RetrievalCard, MetricsBadges } from '@/components';
import { UI_TEXT } from '@/lib/constants';

// --- Loading Indicator ---
function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-surface text-foreground border border-border rounded-2xl rounded-bl-md px-4 py-3">
        <div className="flex space-x-1 h-3 items-center">
          <div className="w-2 h-2 bg-secondary-text/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <div className="w-2 h-2 bg-secondary-text/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <div className="w-2 h-2 bg-secondary-text/40 rounded-full animate-bounce" />
        </div>
      </div>
    </div>
  );
}

// --- Empty State ---
function EmptyState() {
  return (
    <div className="h-full flex items-center justify-center text-secondary-text">
      <p>Ask a question about US Copyright Law to get started.</p>
    </div>
  );
}

// --- Main Page ---
export default function Home() {
  const { isDark, toggle: toggleDarkMode } = useDarkMode();
  const { messages, chunks, metrics, isLoading, send, reset } = useChat();

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'dark' : ''}`}>
      <Header
        darkMode={isDark}
        onToggleDarkMode={toggleDarkMode}
        onNewChat={reset}
      />

      <main className="flex-1 flex overflow-hidden">
        {/* Chat Area */}
        <section className="flex-1 flex flex-col bg-background">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 && <EmptyState />}
            {messages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} />
            ))}
            {isLoading && <TypingIndicator />}
          </div>
          <ChatInput onSend={send} disabled={isLoading} />
        </section>

        {/* Retrieval Panel */}
        <aside className="w-[400px] border-l border-border bg-surface overflow-y-auto">
          <div className="p-5">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              {UI_TEXT.SOURCES_TITLE}
            </h2>

            {metrics && <MetricsBadges metrics={metrics} />}

            {chunks.length > 0 ? (
              <div className="space-y-3">
                {chunks.map((chunk) => (
                  <RetrievalCard key={chunk.id} chunk={chunk} />
                ))}
              </div>
            ) : (
              !isLoading && (
                <p className="text-sm text-secondary-text italic">
                  No sources retrieved yet.
                </p>
              )
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
