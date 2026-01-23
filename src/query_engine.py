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

from src.config import settings


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
    
    def _log_query(self, question: str, chunks: list[dict], response: str) -> None:
        """Log query data to JSON file (runs in background thread)."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        log_file = self.logs_dir / f"query_{timestamp}.json"
        
        log_data = {
            "timestamp": datetime.now().isoformat(),
            "question": question,
            "model": settings.groq.model,
            "similarity_top_k": settings.similarity_top_k,
            "retrieved_chunks": chunks,
            "response": response,
        }
        
        with open(log_file, "w", encoding="utf-8") as f:
            json.dump(log_data, f, indent=2, ensure_ascii=False)
        
        print(f"\n📁 Query logged to: {log_file}")
    
    def query(self, question: str, verbose: bool = False) -> str:
        """Query the RAG system with timing and logging."""
        total_start = time.perf_counter()
        
        # Retrieval
        retrieval_start = time.perf_counter()
        nodes = self.retriever.retrieve(question)
        retrieval_time = time.perf_counter() - retrieval_start
        
        # Display retrieved chunks
        chunks = []
        print("\n" + "=" * 60)
        print(f"📚 RETRIEVED CHUNKS ({retrieval_time:.2f}s)")
        print("=" * 60)
        
        for i, node in enumerate(nodes, 1):
            chunk = {
                "rank": i,
                "score": float(node.score) if node.score else None,
                "file_path": node.metadata.get("file_path", "Unknown"),
                "text": node.text,
                "text_length": len(node.text),
            }
            chunks.append(chunk)
            
            score_str = f"Score: {chunk['score']:.4f}" if chunk['score'] else ""
            print(f"\n[{i}] {score_str}")
            print(f"    Source: {chunk['file_path']}")
            print(f"    Preview: {node.text[:settings.chunk_preview_length]}...")
        
        print("\n" + "=" * 60)
        
        # Synthesis
        synthesis_start = time.perf_counter()
        response = self.synthesizer.synthesize(question, nodes=nodes)
        synthesis_time = time.perf_counter() - synthesis_start
        
        total_time = time.perf_counter() - total_start
        print(f"\n⏱️  Retrieval {retrieval_time:.2f}s | Synthesis {synthesis_time:.2f}s | Total {total_time:.2f}s")
        
        response_text = str(response)
        
        # Background logging
        threading.Thread(
            target=self._log_query,
            args=(question, chunks, response_text),
            daemon=True,
        ).start()
        
        if verbose:
            print("\n--- Response ---")
        
        return response_text
    
    def query_with_sources(self, question: str) -> dict:
        """Query and return response with source information."""
        nodes = self.retriever.retrieve(question)
        response = self.synthesizer.synthesize(question, nodes=nodes)
        
        return {
            "response": str(response),
            "sources": [
                {
                    "score": node.score,
                    "file_path": node.metadata.get("file_path", "Unknown"),
                    "text": node.text,
                }
                for node in nodes
            ],
        }
