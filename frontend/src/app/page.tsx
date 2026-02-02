'use client';

import { useState, useEffect, useCallback } from 'react';
import { useChat, useChatHistory } from '@/hooks';
import { 
  Header, 
  ChatBubble, 
  ChatInput, 
  ChatHistorySidebar,
  RetrievalCard, 
  MetricsBadges, 
  TypingIndicator, 
  EmptyState,
  SuggestedActions
} from '@/components';
import { ModelSelector } from '@/components/ModelSelector';
import { UI_TEXT } from '@/lib/constants';

// --- Main Page ---
export default function Home() {
  const [selectedModel, setSelectedModel] = useState<string>('openai/gpt-oss-120b');
  const { messages, chunks, metrics, isLoading, send, reset, setMessages } = useChat({ model: selectedModel });
  
  const {
    sessions,
    activeSessionId,
    loadSession,
    saveSession,
    deleteSession,
    createSession,
    setActiveSessionId,
  } = useChatHistory();

  // Auto-save messages when they change
  useEffect(() => {
    if (messages.length > 0 && activeSessionId) {
      saveSession(activeSessionId, messages);
    }
  }, [messages, activeSessionId, saveSession]);

  // Handle selecting a session from history
  const handleSelectSession = useCallback((id: string) => {
    const loadedMessages = loadSession(id);
    if (loadedMessages.length > 0) {
      setMessages(loadedMessages);
    }
  }, [loadSession, setMessages]);

  // Handle starting a new chat
  const handleNewChat = useCallback(() => {
    reset();
    const newId = createSession();
    setActiveSessionId(newId);
  }, [reset, createSession, setActiveSessionId]);

  // Handle deleting a session
  const handleDeleteSession = useCallback((id: string) => {
    deleteSession(id);
    if (id === activeSessionId) {
      reset();
    }
  }, [deleteSession, activeSessionId, reset]);

  // Initialize with a session ID if none exists
  useEffect(() => {
    if (!activeSessionId && messages.length === 0) {
      createSession();
    }
  }, [activeSessionId, messages.length, createSession]);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header
        onNewChat={handleNewChat}
        modelSelector={<ModelSelector value={selectedModel} onValueChange={setSelectedModel} />}
      />

      <main className="flex-1 flex overflow-hidden">
        {/* Chat History Sidebar (Left) */}
        <ChatHistorySidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={handleSelectSession}
          onDeleteSession={handleDeleteSession}
          onNewChat={handleNewChat}
        />

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
          <ChatInput onSend={send} disabled={isLoading}>
            {messages.length === 0 && <SuggestedActions onAppend={send} />}
          </ChatInput>
        </section>

        {/* Retrieval Panel (Right) */}
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
