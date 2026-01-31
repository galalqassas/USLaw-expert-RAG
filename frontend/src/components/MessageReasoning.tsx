"use client";

import { useState, useEffect } from "react";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "./elements/reasoning";

type MessageReasoningProps = {
  isLoading: boolean;
  reasoning: string;
};

export function MessageReasoning({
  isLoading,
  reasoning,
}: MessageReasoningProps) {
  // Track if streaming has ever started - use state since this affects render
  const [hasBeenStreaming, setHasBeenStreaming] = useState(isLoading);

  // Update when loading starts (not in effect body to satisfy lint)
  useEffect(() => {
    if (isLoading && !hasBeenStreaming) {
      setHasBeenStreaming(true);
    }
  }, [isLoading, hasBeenStreaming]);

  return (
    <Reasoning
      data-testid="message-reasoning"
      defaultOpen={hasBeenStreaming}
      isStreaming={isLoading}
    >
      <ReasoningTrigger />
      <ReasoningContent>{reasoning}</ReasoningContent>
    </Reasoning>
  );
}
