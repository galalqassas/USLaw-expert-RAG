'use client';

import { Sun, Moon, PlusCircle } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';

interface HeaderProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onNewChat?: () => void;
}

export function Header({ darkMode, onToggleDarkMode, onNewChat }: HeaderProps) {
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
          onClick={onToggleDarkMode}
          className="p-2 rounded-lg hover:bg-surface transition-colors"
          aria-label="Toggle dark mode"
          data-testid="dark-mode-toggle"
        >
          {darkMode ? (
            <Sun className="w-5 h-5 text-foreground" />
          ) : (
            <Moon className="w-5 h-5 text-foreground" />
          )}
        </button>
      </div>
    </header>
  );
}
