import { Sun, Moon, PlusCircle, PanelLeft, PanelRight } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';
import { APP_NAME } from '@/lib/constants';

// Hydration-safe check for client-side rendering
const emptySubscribe = () => () => {};
const getIsMounted = () => true;
const getServerSnapshot = () => false;

interface HeaderProps {
  onNewChat?: () => void;
  onMenuClick?: () => void;
  onSourcesClick?: () => void;
  hasChunks?: boolean;
  modelSelector?: React.ReactNode;
}

export function Header({ 
  onNewChat, 
  onMenuClick, 
  onSourcesClick, 
  hasChunks = false,
  modelSelector 
}: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(emptySubscribe, getIsMounted, getServerSnapshot);

  return (
    <header className="h-14 flex items-center justify-between px-3 md:px-6 border-b border-border bg-background gap-2">
      <div className="flex items-center gap-2 md:gap-4 min-w-0">
        {/* Toggle Menu Button (History) */}
        <button
          onClick={onMenuClick}
          className="p-2 rounded-lg hover:bg-primary/10 hover:text-primary active:scale-95 transition-all duration-200 flex-shrink-0 text-secondary-text"
          aria-label="Toggle sidebar"
          title="Toggle sidebar"
          data-testid="menu-toggle"
        >
          <PanelLeft className="w-5 h-5" />
        </button>

        <h1 className="text-lg md:text-xl font-bold text-foreground truncate" data-testid="app-title">
          {APP_NAME}
        </h1>
        
        {/* Model Selector - hidden on very small screens */}
        <div className="hidden sm:block">
          {modelSelector}
        </div>
        
        {/* New Chat - hidden on mobile (available in sidebar) */}
        {onNewChat && (
          <button 
            onClick={onNewChat} 
            className="hidden md:flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 active:scale-95 rounded-lg transition-all duration-200" 
            title="Start a new chat"
          >
            <PlusCircle className="w-4 h-4" /> New Chat
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
        {/* Toggle Sources Button */}
        <button
          onClick={onSourcesClick}
          className="p-2 rounded-lg hover:bg-primary/10 hover:text-primary active:scale-95 transition-all duration-200 relative text-secondary-text"
          aria-label="Toggle sources"
          title="Toggle sources"
          data-testid="sources-toggle"
        >
          <PanelRight className="w-5 h-5" />
          {hasChunks && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
          )}
        </button>

        {/* Theme Toggle */}
        <button 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
          className="p-2 rounded-lg hover:bg-primary/10 hover:text-primary active:scale-95 transition-all duration-200 text-secondary-text" 
          aria-label="Toggle dark mode" 
          data-testid="dark-mode-toggle"
        >
          {mounted && (theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />)}
        </button>
      </div>
    </header>
  );
}
