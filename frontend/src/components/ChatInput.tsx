'use client';

import { useState, KeyboardEvent } from 'react';
import { Send, Paperclip } from 'lucide-react';
import { UI_TEXT } from '@/lib/constants';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ 
  onSend, 
  disabled = false, 
  placeholder = UI_TEXT.INPUT_PLACEHOLDER 
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
    <div className="p-4 border-t border-border">
      <div className="flex items-center gap-3 bg-surface border border-border rounded-xl px-4 py-2 shadow-sm">
        <button 
          className="p-1.5 hover:bg-background rounded-lg transition-colors"
          aria-label="Attach file"
          data-testid="attach-button"
        >
          <Paperclip className="w-5 h-5 text-secondary-text" />
        </button>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-secondary-text disabled:opacity-50"
          data-testid="chat-input"
        />
        <button
          onClick={handleSend}
          disabled={disabled || !inputValue.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="send-button"
        >
          {UI_TEXT.SEND_BUTTON} <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
