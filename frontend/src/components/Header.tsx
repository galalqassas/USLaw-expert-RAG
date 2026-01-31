import { Sun, Moon, PlusCircle } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';
import { APP_NAME } from '@/lib/constants';

// Hydration-safe check for client-side rendering
const emptySubscribe = () => () => {};
const getIsMounted = () => true;
const getServerSnapshot = () => false;

export function Header({ onNewChat, modelSelector }: { onNewChat?: () => void; modelSelector?: React.ReactNode }) {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(emptySubscribe, getIsMounted, getServerSnapshot);

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-border bg-background">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-foreground" data-testid="app-title">{APP_NAME}</h1>
        {modelSelector}
        {onNewChat && (
          <button onClick={onNewChat} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors" title="Start a new chat">
            <PlusCircle className="w-4 h-4" /> New Chat
          </button>
        )}
      </div>
      <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 rounded-lg hover:bg-surface transition-colors" aria-label="Toggle dark mode" data-testid="dark-mode-toggle">
        {mounted && (theme === 'dark' ? <Sun className="w-5 h-5 text-foreground" /> : <Moon className="w-5 h-5 text-foreground" />)}
      </button>
    </header>
  );
}
