export function TypingIndicator() {
  return (
    <div className="flex justify-start" data-testid="typing-indicator">
      <div className="bg-surface text-foreground border border-border rounded-2xl rounded-bl-md px-4 py-3">
        <div className="flex space-x-1 h-3 items-center">
          <div className="w-2 h-2 bg-secondary-text/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <div className="w-2 h-2 bg-secondary-text/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <div className="w-2 h-2 bg-secondary-text/40 rounded-full animate-bounce" />
        </div>
      </div>
    </div>
  );
}
