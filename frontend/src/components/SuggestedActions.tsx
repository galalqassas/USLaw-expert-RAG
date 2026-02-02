interface SuggestedActionsProps {
  onAppend: (message: string) => void;
}

export function SuggestedActions({ onAppend }: SuggestedActionsProps) {
  const suggestedActions = [
    "What is the range of statutory damages for copyright infringement?",
    "What works are eligible for copyright protection?",
    "Under what conditions can a library reproduce a work?",
    "What is the compulsory license for making and distributing phonorecords?"
  ];

  return (
    <div className="grid w-full gap-2 sm:grid-cols-2 mb-4 px-4">
      {suggestedActions.map((suggestedAction, index) => (
        <button
          key={suggestedAction}
          onClick={() => onAppend(suggestedAction)}
          className="flex w-full items-center justify-start rounded-lg border border-border bg-surface p-3 text-sm text-foreground transition-colors hover:bg-surface-hover hover:text-foreground text-left animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-backwards"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <span className="truncate">{suggestedAction}</span>
        </button>
      ))}
    </div>
  );
}
