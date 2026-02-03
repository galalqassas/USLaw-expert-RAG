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
import { cn } from '@/lib/utils';
import { X, AlertTriangle } from 'lucide-react';

export default function Home() {
  const [selectedModel, setSelectedModel] = useState<string>('openai/gpt-oss-120b');
  const { messages, chunks, metrics, isLoading, error, send, reset, loadState, reload } = useChat({ model: selectedModel });
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSourcesOpen, setMobileSourcesOpen] = useState(false);
  const [historyCollapsed, setHistoryCollapsed] = useState(false);
  const [sourcesVisible, setSourcesVisible] = useState(true);

  const {
    sessions,
    activeSessionId,
    loadSession,
    saveSession,
    deleteSession,
    createSession,
    setActiveSessionId,
  } = useChatHistory();

  const toggleHistory = () => {
    if (window.innerWidth < 768) {
      setMobileMenuOpen(!mobileMenuOpen);
    } else {
      setHistoryCollapsed(!historyCollapsed);
    }
  };

  const toggleSources = () => {
    if (window.innerWidth < 1024) {
      setMobileSourcesOpen(!mobileSourcesOpen);
    } else {
      setSourcesVisible(!sourcesVisible);
    }
  };

  // Auto-save when state changes
  useEffect(() => {
    if (messages.length > 0 && activeSessionId) {
      saveSession(activeSessionId, messages, chunks, metrics);
    }
  }, [messages, chunks, metrics, activeSessionId, saveSession]);

  // Handle selecting a session - loads state and aborts any current stream
  const handleSelectSession = useCallback((id: string) => {
    const { messages: m, chunks: c, metrics: met } = loadSession(id);
    loadState(m, c, met); // This aborts current stream
    setMobileMenuOpen(false);
  }, [loadSession, loadState]);

  // Handle new chat
  const handleNewChat = useCallback(() => {
    reset();
    const newId = createSession();
    setActiveSessionId(newId);
    setMobileMenuOpen(false);
  }, [reset, createSession, setActiveSessionId]);

  // Handle delete
  const handleDeleteSession = useCallback((id: string) => {
    deleteSession(id);
    if (id === activeSessionId) {
      reset();
      const newId = createSession();
      setActiveSessionId(newId);
    }
  }, [deleteSession, activeSessionId, reset, createSession, setActiveSessionId]);

  // Initialize session
  useEffect(() => {
    if (!activeSessionId && messages.length === 0) {
      createSession();
    }
  }, [activeSessionId, messages.length, createSession]);

  // Escape closes drawers
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setMobileSourcesOpen(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  // Send with session ID binding
  const handleSend = useCallback((content: string) => {
    if (activeSessionId) {
      send(content, activeSessionId);
    }
  }, [activeSessionId, send]);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header
        onNewChat={handleNewChat}
        onMenuClick={toggleHistory}
        onSourcesClick={toggleSources}
        hasChunks={chunks.length > 0}
        modelSelector={<ModelSelector value={selectedModel} onValueChange={setSelectedModel} />}
      />

      <main className="flex-1 flex overflow-hidden relative">
        {(mobileMenuOpen || mobileSourcesOpen) && (
          <div
            data-testid="mobile-overlay"
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => {
              setMobileMenuOpen(false);
              setMobileSourcesOpen(false);
            }}
            aria-hidden="true"
          />
        )}

        <div
          className={cn(
            'z-50 flex-shrink-0 transition-all duration-300 ease-in-out border-r border-border bg-surface',
            'fixed inset-y-0 left-0 md:static',
             mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
             historyCollapsed ? 'md:w-12' : 'md:w-64'
          )}
        >
          <ChatHistorySidebar
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={handleSelectSession}
            onDeleteSession={handleDeleteSession}
            onNewChat={handleNewChat}
            onClose={() => setMobileMenuOpen(false)}
            showCloseButton={mobileMenuOpen}
            isCollapsed={historyCollapsed}
            className="border-none"
          />
        </div>

        <section className="flex-1 flex flex-col bg-background min-w-0">
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            {messages.length === 0 && <EmptyState />}
            {messages.map((msg, idx) => {
              if (msg.role === 'assistant' && !msg.content) return null;
              const isLastAssistant = msg.role === 'assistant' && idx === messages.length - 1;
              return (
                <ChatBubble
                  key={msg.id}
                  message={msg}
                  isLast={isLastAssistant}
                  onReload={isLastAssistant && activeSessionId ? () => reload(activeSessionId) : undefined}
                />
              );
            })}
            {isLoading && <TypingIndicator />}
            {error && (
              <div className="flex justify-center p-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 max-w-2xl w-full shadow-sm">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              </div>
            )}
          </div>
          <ChatInput onSend={handleSend} disabled={isLoading}>
            {messages.length === 0 && <SuggestedActions onAppend={handleSend} />}
          </ChatInput>
        </section>

        <aside
          className={cn(
            'z-50 bg-surface border-l border-border overflow-y-auto flex-shrink-0 transition-all duration-300 ease-in-out',
            'hidden lg:block',
            sourcesVisible ? 'lg:w-[400px]' : 'lg:w-0 lg:border-none',
            mobileSourcesOpen && 'fixed inset-y-0 right-0 w-full sm:w-[400px] block border-l'
          )}
        >
          <div className={cn("h-full w-full", !sourcesVisible && "lg:hidden")}>
             <div className="p-4 md:p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                  {UI_TEXT.SOURCES_TITLE}
                </h2>
                <button
                  onClick={() => setMobileSourcesOpen(false)}
                  className="lg:hidden p-2 rounded-lg hover:bg-primary/10 hover:text-primary active:scale-95 transition-all duration-200 text-secondary-text"
                  aria-label="Close sources panel"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

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
          </div>
        </aside>
      </main>
    </div>
  );
}
