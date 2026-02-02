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
import { X } from 'lucide-react';

// --- Main Page ---
export default function Home() {
  const [selectedModel, setSelectedModel] = useState<string>('openai/gpt-oss-120b');
  const { messages, chunks, metrics, isLoading, send, reset, setMessages } = useChat({ model: selectedModel });
  
  // State for sidebars
  // Mobile: Drawer open/closed (overlay)
  // Desktop: Sidebar collapsed/expanded (layout shift)
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

  // Smart toggle handlers
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
    setMobileMenuOpen(false); // Close mobile drawer
  }, [loadSession, setMessages]);

  // Handle starting a new chat
  const handleNewChat = useCallback(() => {
    reset();
    const newId = createSession();
    setActiveSessionId(newId);
    setMobileMenuOpen(false); // Close mobile drawer
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

  // Close mobile drawers on escape key
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
        {/* Mobile Overlay Backdrop */}
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

        {/* Chat History Sidebar (Left) */}
        <div
          className={cn(
            // Base styles
            'z-50 flex-shrink-0 transition-all duration-300 ease-in-out border-r border-border bg-surface',
            // Mobile: absolute overlay, hidden by default
            'fixed inset-y-0 left-0 md:static',
             mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
             // Desktop: Width transition
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
            className="border-none" // Parent handles border
          />
        </div>

        {/* Chat Area */}
        <section className="flex-1 flex flex-col bg-background min-w-0">
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            {messages.length === 0 && <EmptyState />}
            {messages.map((msg) => {
              // Don't render empty assistant messages
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
        <aside
          className={cn(
            // Base styles
            'z-50 bg-surface border-l border-border overflow-y-auto flex-shrink-0 transition-all duration-300 ease-in-out',
            // Desktop: Toggles width/visibility
            'hidden lg:block',
            sourcesVisible ? 'lg:w-[400px]' : 'lg:w-0 lg:border-none',
            // Mobile: absolute overlay when open
            mobileSourcesOpen && 'fixed inset-y-0 right-0 w-full sm:w-[400px] block border-l'
          )}
        >
          <div className={cn("h-full w-full", !sourcesVisible && "lg:hidden")}>
             <div className="p-4 md:p-5">
              {/* Sources Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                  {UI_TEXT.SOURCES_TITLE}
                </h2>
                {/* Mobile close button */}
                <button
                  onClick={() => setMobileSourcesOpen(false)}
                  className="lg:hidden p-2 rounded-lg hover:bg-surface-hover transition-colors text-secondary-text"
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
