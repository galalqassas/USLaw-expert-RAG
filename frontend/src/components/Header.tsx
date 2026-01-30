import { Sun, Moon, PlusCircle } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { APP_NAME } from '@/lib/constants';

interface HeaderProps {
  onNewChat?: () => void;
}

export function Header({ onNewChat }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    setMounted(true);
  }, []);

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-border bg-background">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-foreground" data-testid="app-title">
          {APP_NAME}
        </h1>
        {onNewChat && (
          <button
            onClick={onNewChat}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors"
            title="Start a new chat"
          >
            <PlusCircle className="w-4 h-4" />
            New Chat
          </button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-lg hover:bg-surface transition-colors"
          aria-label="Toggle dark mode"
          data-testid="dark-mode-toggle"
        >
          {mounted && (theme === 'dark' ? (
            <Sun className="w-5 h-5 text-foreground" />
          ) : (
            <Moon className="w-5 h-5 text-foreground" />
          ))}
        </button>
      </div>
    </header>
  );
}
