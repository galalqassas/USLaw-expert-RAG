"""Query engine module - RAG interface using Groq LLM and Pinecone retrieval."""

import json
import threading
import time
from datetime import datetime
from pathlib import Path

from llama_index.core import Settings as LlamaSettings, VectorStoreIndex
from llama_index.core.response_synthesizers import get_response_synthesizer
from llama_index.core.retrievers import VectorIndexRetriever
from llama_index.llms.openai import OpenAI
from llama_index.llms.openai.utils import ALL_AVAILABLE_MODELS, CHAT_MODELS

from law_rag.config import settings


class RAGQueryEngine:
    """RAG query engine for legal document Q&A."""

    def __init__(self, index: VectorStoreIndex) -> None:
        settings.validate()
        self.index = index
        self.logs_dir = settings.BASE_DIR / "logs"
        self._enable_file_logging = self._init_logs_dir()
        self._setup_components()

    def _init_logs_dir(self) -> bool:
        try:
            self.logs_dir.mkdir(exist_ok=True)
            return True
        except OSError:
            print("⚠️ Read-only filesystem. File logging disabled.")
            return False

    def _setup_components(self) -> None:
        # Register Groq model as valid OpenAI model
        ALL_AVAILABLE_MODELS[settings.groq.model] = settings.groq.context_window
        CHAT_MODELS[settings.groq.model] = settings.groq.context_window

        self.llm = OpenAI(
            model=settings.groq.model,
            api_key=settings.groq.api_key,
            api_base="https://api.groq.com/openai/v1",
            temperature=settings.groq.temperature,
            max_tokens=settings.groq.max_tokens,
        )
        LlamaSettings.llm = self.llm

        self.retriever = VectorIndexRetriever(
            index=self.index, similarity_top_k=settings.similarity_top_k
        )
        self.synthesizer = get_response_synthesizer(
            llm=self.llm, response_mode=settings.response_mode
        )
        self.streaming_synthesizer = get_response_synthesizer(
            llm=self.llm, response_mode=settings.response_mode, streaming=True
        )

    # --- Helpers ---

    def _augment_query(self, message: str, history: list[dict]) -> str:
        """Build augmented query with conversation history."""
        if not history:
            return message
        history_text = "\n".join(
            f"{m['role'].upper()}: {m['content']}" for m in history
        )
        return f"Given the following conversation history:\n{history_text}\n\nNow answer: {message}"

    def _format_chunks(self, nodes: list) -> list[dict]:
        """Format retrieved nodes into serializable chunks."""
        result = []
        for i, node in enumerate(nodes, 1):
            path = node.metadata.get("file_path", "Unknown")
            if path != "Unknown":
                try:
                    p = Path(path)
                    if p.is_absolute() and p.is_relative_to(settings.BASE_DIR):
                        path = str(p.relative_to(settings.BASE_DIR))
                except (ValueError, TypeError):
                    pass
            result.append(
                {
                    "rank": i,
                    "score": float(node.score) if node.score else None,
                    "file_path": path,
                    "text": node.text,
                    "text_length": len(node.text),
                }
            )
        return result

    def _log_query(
        self, question: str, chunks: list[dict], response: str, timing: dict
    ) -> None:
        if not self._enable_file_logging:
            return
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        log_file = self.logs_dir / f"query_{ts}.json"
        data = {
            "timestamp": datetime.now().isoformat(),
            "question": question,
            "model": settings.groq.model,
            "timing_seconds": timing,
            "retrieved_chunks": chunks,
            "response": response,
        }
        with open(log_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"\n📁 Query logged to: {log_file}")

    # --- Public Methods ---

    def chat(self, message: str, history: list[dict]) -> dict:
        """Chat with the RAG system (non-streaming)."""
        query = self._augment_query(message, history)
        nodes = self.retriever.retrieve(query)
        response = self.synthesizer.synthesize(query, nodes=nodes)
        return {"response": str(response), "sources": self._format_chunks(nodes)}

    def stream_chat(self, message: str, history: list[dict]):
        """Stream chat response: sources first, then text tokens."""
        query = self._augment_query(message, history)

        # Phase 1: Retrieve and emit sources
        t0 = time.perf_counter()
        nodes = self.retriever.retrieve(query)
        retrieval_time = time.perf_counter() - t0

        yield f"2:{json.dumps({'sources': self._format_chunks(nodes), 'retrieval_time': retrieval_time})}\n"

        # Phase 2: Stream synthesis tokens
        streaming_response = self.streaming_synthesizer.synthesize(query, nodes=nodes)
        for token in streaming_response.response_gen:
            yield f"0:{json.dumps(token)}\n"

    def query(self, question: str, verbose: bool = False) -> str:
        """Query the RAG system with timing and logging (CLI use)."""
        t0 = time.perf_counter()

        # Retrieval
        t1 = time.perf_counter()
        nodes = self.retriever.retrieve(question)
        retrieval_time = time.perf_counter() - t1
        chunks = self._format_chunks(nodes)

        # Display chunks
        print(f"\n{'=' * 60}\n📚 RETRIEVED CHUNKS ({retrieval_time:.2f}s)\n{'=' * 60}")
        for c in chunks:
            score = f"Score: {c['score']:.4f}" if c["score"] else ""
            print(
                f"\n[{c['rank']}] {score}\n    Source: {c['file_path']}\n    Preview: {c['text'][:150]}..."
            )
        print("=" * 60)

        # Synthesis
        t2 = time.perf_counter()
        response = self.synthesizer.synthesize(question, nodes=nodes)
        synthesis_time = time.perf_counter() - t2
        total_time = time.perf_counter() - t0

        print(
            f"\n⏱️  Retrieval {retrieval_time:.2f}s | Synthesis {synthesis_time:.2f}s | Total {total_time:.2f}s"
        )

        response_text = str(response)
        timing = {
            "retrieval": round(retrieval_time, 4),
            "synthesis": round(synthesis_time, 4),
            "total": round(total_time, 4),
        }
        threading.Thread(
            target=self._log_query,
            args=(question, chunks, response_text, timing),
            daemon=True,
        ).start()

        if verbose:
            print("\n--- Response ---")
        return response_text
