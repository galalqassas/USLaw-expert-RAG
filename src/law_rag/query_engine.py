"""
Query engine module.

Provides RAG query interface using Groq LLM and Pinecone retrieval.
"""

import json
import threading
import time
from datetime import datetime
from pathlib import Path

from llama_index.core import Settings as LlamaSettings, VectorStoreIndex
from llama_index.core.response_synthesizers import get_response_synthesizer
from llama_index.core.retrievers import VectorIndexRetriever
from llama_index.llms.groq import Groq

from llama_index.core.llms import ChatMessage, MessageRole
from llama_index.core.chat_engine import CondensePlusContextChatEngine
from llama_index.core.memory import ChatMemoryBuffer

from law_rag.config import settings


class RAGQueryEngine:
    """RAG query engine for legal document Q&A with logging."""
    
    def __init__(self, index: VectorStoreIndex) -> None:
        """Initialize query engine with vector index."""
        settings.validate()
        self.index = index
        self.logs_dir = settings.BASE_DIR / "logs"
        self.logs_dir.mkdir(exist_ok=True)
        self._setup_components()
    
    def _setup_components(self) -> None:
        """Configure LLM, retriever, and synthesizer."""
        self.llm = Groq(
            model=settings.groq.model,
            api_key=settings.groq.api_key,
            temperature=settings.groq.temperature,
            max_tokens=settings.groq.max_tokens,
            context_window=settings.groq.context_window,
        )
        LlamaSettings.llm = self.llm
        
        self.retriever = VectorIndexRetriever(
            index=self.index,
            similarity_top_k=settings.similarity_top_k,
        )
        
        self.synthesizer = get_response_synthesizer(
            llm=self.llm,
            response_mode=settings.response_mode,
        )

        # Initialize base chat engine (we'll inject history per request)
        self.chat_engine = self.index.as_chat_engine(
            chat_mode="condense_plus_context",
            llm=self.llm,
            context_prompt=(
                "You are a helpful assistant for US Copyright Law questions.\n"
                "Here are the relevant documents for the context:\n"
                "{context_str}\n"
                "\nInstruction: Use the previous chat history, or the context above, to interact and help the user."
            ),
            verbose=True,
            similarity_top_k=settings.similarity_top_k,
        )
    
    def _log_query(self, question: str, chunks: list[dict], response: str, timing: dict) -> None:
        """Log query data to JSON file (runs in background thread)."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        log_file = self.logs_dir / f"query_{timestamp}.json"
        
        log_data = {
            "timestamp": datetime.now().isoformat(),
            "question": question,
            "model": settings.groq.model,
            "similarity_top_k": settings.similarity_top_k,
            "timing_seconds": timing,
            "retrieved_chunks": chunks,
            "response": response,
        }
        
        with open(log_file, "w", encoding="utf-8") as f:
            json.dump(log_data, f, indent=2, ensure_ascii=False)
        
        print(f"\n📁 Query logged to: {log_file}")
    
    def _format_chunks(self, nodes: list) -> list[dict]:
        """Format retrieved nodes into serializable chunks."""
        chunks = []
        for i, node in enumerate(nodes, 1):
            full_path = node.metadata.get("file_path", "Unknown")
            
            # Convert to relative path if it's an absolute path within BASE_DIR
            if full_path != "Unknown":
                try:
                    p = Path(full_path)
                    if p.is_absolute():
                        # Try to make it relative to BASE_DIR if it's inside
                        if p.is_relative_to(settings.BASE_DIR):
                            full_path = str(p.relative_to(settings.BASE_DIR))
                except (ValueError, TypeError):
                    pass

            chunks.append({
                "rank": i,
                "score": float(node.score) if node.score else None,
                "file_path": full_path,
                "text": node.text,
                "text_length": len(node.text),
            })
        return chunks

    def query(self, question: str, verbose: bool = False) -> str:
        """Query the RAG system with timing and logging."""
        total_start = time.perf_counter()
        
        # Retrieval
        retrieval_start = time.perf_counter()
        nodes = self.retriever.retrieve(question)
        retrieval_time = time.perf_counter() - retrieval_start
        
        # Format chunks for display and logging
        chunks = self._format_chunks(nodes)
        
        # Display retrieved chunks
        print("\n" + "=" * 60)
        print(f"📚 RETRIEVED CHUNKS ({retrieval_time:.2f}s)")
        print("=" * 60)
        
        for chunk in chunks:
            score_str = f"Score: {chunk['score']:.4f}" if chunk['score'] else ""
            print(f"\n[{chunk['rank']}] {score_str}")
            print(f"    Source: {chunk['file_path']}")
            print(f"    Preview: {chunk['text'][:settings.chunk_preview_length]}...")
        
        print("\n" + "=" * 60)
        
        # Synthesis
        synthesis_start = time.perf_counter()
        response = self.synthesizer.synthesize(question, nodes=nodes)
        synthesis_time = time.perf_counter() - synthesis_start
        
        total_time = time.perf_counter() - total_start
        print(f"\n⏱️  Retrieval {retrieval_time:.2f}s | Synthesis {synthesis_time:.2f}s | Total {total_time:.2f}s")
        
        response_text = str(response)
        
        # Background logging
        timing_data = {
            "retrieval": round(retrieval_time, 4),
            "synthesis": round(synthesis_time, 4),
            "total": round(total_time, 4),
        }
        
        threading.Thread(
            target=self._log_query,
            args=(question, chunks, response_text, timing_data),
            daemon=True,
        ).start()
        
        if verbose:
            print("\n--- Response ---")
        
        return response_text
    
    
    def chat(self, message: str, history: list[dict]) -> dict:
        """Chat with the RAG system using history.
        
        For stateless REST API, we embed conversation history into the query
        rather than relying on chat engine memory management.
        """
        # Build context from history
        if history:
            history_text = "\n".join(
                f"{msg['role'].upper()}: {msg['content']}" for msg in history
            )
            augmented_query = (
                f"Given the following conversation history:\n{history_text}\n\n"
                f"Now answer the user's follow-up question: {message}"
            )
        else:
            augmented_query = message
        
        # Use standard retrieval + synthesis
        nodes = self.retriever.retrieve(augmented_query)
        response = self.synthesizer.synthesize(augmented_query, nodes=nodes)
        
        return {
            "response": str(response),
            "sources": self._format_chunks(nodes),
        }

    def query_with_sources(self, question: str) -> dict:
        """Query and return response with source information."""
        # Reuse internal logic if needed, but for now this is cleaner as a standard retrieval
        # Note: If we wanted strict deduplication we'd pull the retrieval/synthesis out,
        # but 'query' has heavy print/timing logic woven in.
        # Ideally, we extract the core RAG flow:
        
        nodes = self.retriever.retrieve(question)
        response = self.synthesizer.synthesize(question, nodes=nodes)
        
        return {
            "response": str(response),
            "sources": self._format_chunks(nodes),
        }
