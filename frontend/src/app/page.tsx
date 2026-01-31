'use client';

import { useState } from 'react';
import { useChat } from '@/hooks';
import { Header, ChatBubble, ChatInput, RetrievalCard, MetricsBadges, TypingIndicator, EmptyState } from '@/components';
import { ModelSelector } from '@/components/ModelSelector';
import { UI_TEXT } from '@/lib/constants';

// --- Main Page ---
export default function Home() {
  const [selectedModel, setSelectedModel] = useState<string>('openai/gpt-oss-120b');
  const { messages, chunks, metrics, isLoading, send, reset } = useChat({ model: selectedModel });

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        onNewChat={reset}
        modelSelector={<ModelSelector value={selectedModel} onValueChange={setSelectedModel} />}
      />

      <main className="flex-1 flex overflow-hidden">
        {/* Chat Area */}
        <section className="flex-1 flex flex-col bg-background">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 && <EmptyState />}
            {messages.map((msg) => {
              // Don't render empty assistant messages (prevent duplicate loading bubble)
              if (msg.role === 'assistant' && !msg.content) return null;
              return <ChatBubble key={msg.id} message={msg} />;
            })}
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
