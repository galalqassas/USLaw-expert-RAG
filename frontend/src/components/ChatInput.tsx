'use client';

import { useState, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { UI_TEXT } from '@/lib/constants';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  children?: React.ReactNode;
}

export function ChatInput({ 
  onSend, 
  disabled = false, 
  placeholder = UI_TEXT.INPUT_PLACEHOLDER,
  children
}: ChatInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInputValue('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-3 md:p-4 border-t border-border">
      {children}
      <div className="flex items-center gap-2 md:gap-3 bg-surface border border-border rounded-xl px-3 md:px-4 py-2 shadow-sm">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-secondary-text min-w-0"
          data-testid="chat-input"
        />
        <button
          onClick={handleSend}
          disabled={disabled || !inputValue.trim()}
          className="flex items-center gap-2 px-3 md:px-4 py-2 bg-primary hover:bg-primary-hover shadow-sm hover:shadow-md active:scale-95 text-white rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          data-testid="send-button"
        >
          <span className="hidden sm:inline">{UI_TEXT.SEND_BUTTON}</span>
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
