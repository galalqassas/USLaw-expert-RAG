"""Custom LLM implementation for Groq reasoning models."""

import queue
import threading
from typing import Any, Generator, Optional, Sequence

from llama_index.core.base.llms.types import ChatMessage, ChatResponse, ChatResponseGen
from llama_index.llms.openai import OpenAI

# Thread-local storage for the queue
# This avoids context isolation issues with generators in FastAPI
# This allows us to use a shared LLM instance but capture reasoning for specific requests
_thread_local = threading.local()

def get_reasoning_queue() -> Optional[queue.Queue]:
    return getattr(_thread_local, "queue", None)

def set_reasoning_queue(q: Optional[queue.Queue]) -> None:
    _thread_local.queue = q


class GroqReasoningLLM(OpenAI):
    """
    Subclass of OpenAI LLM to handle Groq's reasoning models.
    
    It intercepts the 'reasoning' field from the streaming response delta
    and puts it into a context-local queue if available.
    """

    def __init__(
        self,
        include_reasoning: bool = True,
        **kwargs: Any,
    ) -> None:
        """
        Initialize GroqReasoningLLM.

        Args:
            include_reasoning: Whether to request reasoning tokens from Groq.
            **kwargs: Standard OpenAI LLM arguments.
        """
        if include_reasoning:
            extra_body = kwargs.get("extra_body", {})
            extra_body["include_reasoning"] = True
            kwargs["extra_body"] = extra_body
        super().__init__(**kwargs)

    def stream_chat(
        self, messages: Sequence[ChatMessage], **kwargs: Any
    ) -> ChatResponseGen:
        """
        Stream chat response and separate reasoning tokens.
        """
        # Merge kwargs
        all_kwargs = self._get_model_kwargs(**kwargs)
        
        # Ensure stream is True
        all_kwargs["stream"] = True

        # Ensure include_reasoning is passed via extra_body (required for OpenAI client)
        if "extra_body" not in all_kwargs:
            all_kwargs["extra_body"] = {}
        all_kwargs["extra_body"]["include_reasoning"] = True
        
        # Prepare messages
        message_dicts = [
            {"role": m.role.value, "content": m.content} 
            for m in messages
        ]
        
        # Generate stream
        response = self._get_client().chat.completions.create(
            messages=message_dicts, **all_kwargs
        )
        
        def gen() -> Generator[ChatResponse, None, None]:
            # Get current queue context
            q = get_reasoning_queue()
            
            content = ""
            for chunk in response:
                delta = chunk.choices[0].delta
                
                # 1. Handle Reasoning
                reasoning = getattr(delta, "reasoning", None)
                
                # 2. Handle Content
                chunk_content = delta.content or ""
                
                if reasoning and q is not None:
                    q.put(reasoning)
                
                content += chunk_content
                    
                # Yield standard LlamaIndex chunk
                yield ChatResponse(
                    message=ChatMessage(
                        role="assistant",
                        content=content,
                        additional_kwargs={"reasoning": reasoning} if reasoning else {}
                    ),
                    delta=chunk_content,
                )
                
        return gen()
