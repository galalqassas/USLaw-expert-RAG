"""Query engine module - RAG interface using Groq LLM and Pinecone retrieval."""

import functools
import json
import threading
import time
import queue
from datetime import datetime
from pathlib import Path
from typing import Generator

from llama_index.core import VectorStoreIndex, PromptTemplate
from llama_index.core.response_synthesizers import get_response_synthesizer
from llama_index.core.retrievers import VectorIndexRetriever
from llama_index.llms.openai import OpenAI
from llama_index.llms.openai.utils import ALL_AVAILABLE_MODELS, CHAT_MODELS
from llama_index.core.schema import NodeWithScore

from law_rag.config import settings
from law_rag.custom_llm import GroqReasoningLLM, set_reasoning_queue

class RAGQueryEngine:
    """RAG query engine for legal document Q&A."""

    def __init__(self, index: VectorStoreIndex) -> None:
        settings.validate()
        self.index = index
        self.logs_dir = settings.BASE_DIR / "logs"
        self._enable_file_logging = self._init_logs_dir()
        
        # Initialize default components
        self._setup_default_components()

    def _init_logs_dir(self) -> bool:
        try:
            self.logs_dir.mkdir(exist_ok=True)
            return True
        except OSError:
            print("⚠️ Read-only filesystem. File logging disabled.")
            return False

    def _setup_default_components(self) -> None:
        """Initialize default LLM and Retriever."""
        # Register Groq model keys to avoid unwanted validation errors from LlamaIndex/OpenAI
        ALL_AVAILABLE_MODELS[settings.groq.model] = settings.groq.context_window
        CHAT_MODELS[settings.groq.model] = settings.groq.context_window

        self.default_llm = self._create_llm_instance(settings.groq.model)
        
        self.retriever = VectorIndexRetriever(
            index=self.index, similarity_top_k=settings.similarity_top_k
        )
        # Default synthesizer (non-streaming)
        self.default_synthesizer = get_response_synthesizer(
            llm=self.default_llm,
            response_mode=settings.response_mode,
            text_qa_template=PromptTemplate(settings.qa_template),
        )

    def _get_synthesizer(self, model: str | None = None, streaming: bool = False):
        """Get or create a synthesizer for the specific model and mode."""
        target_model = model or settings.groq.model
        
        # If default model and not streaming, return pre-built
        if target_model == settings.groq.model and not streaming:
            return self.default_synthesizer

        if target_model != settings.groq.model:
            ALL_AVAILABLE_MODELS.setdefault(target_model, settings.groq.context_window)
            CHAT_MODELS.setdefault(target_model, settings.groq.context_window)
        
        return self._get_cached_synthesizer(target_model, streaming)

    @functools.lru_cache(maxsize=16)
    def _get_cached_synthesizer(self, model: str, streaming: bool):
        """Internal cached method to avoid repetitive LLM/Synthesizer creation."""
        llm = self._create_llm_instance(model)
        return get_response_synthesizer(
            llm=llm,
            response_mode=settings.response_mode,
            streaming=streaming,
            text_qa_template=PromptTemplate(settings.qa_template),
        )

    # --- Helpers ---

    def _create_llm_instance(self, model: str) -> OpenAI:
        """Create an OpenAI LLM instance with standard settings."""
        return GroqReasoningLLM(
            include_reasoning=True,
            model=model,
            api_key=settings.groq.api_key,
            api_base="https://api.groq.com/openai/v1",
            temperature=settings.groq.temperature,
            max_tokens=settings.groq.max_tokens,
            system_prompt=settings.system_prompt,
        )

    def _augment_query(self, message: str, history: list[dict]) -> str:
        """Build augmented query with conversation history."""
        if not history:
            return message
        history_text = "\n".join(
            f"{m['role'].upper()}: {m['content']}" for m in history
        )
        return f"Given the following conversation history:\n{history_text}\n\nNow answer: {message}"

    def _format_chunks(self, nodes: list[NodeWithScore]) -> list[dict]:
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

    def _log_query_async(
        self, question: str, chunks: list[dict], response: str, timing: dict, model: str
    ) -> None:
        """Run logging in a background thread."""
        if not self._enable_file_logging:
            return
            
        def _log():
            try:
                ts = datetime.now().strftime("%Y%m%d_%H%M%S")
                log_file = self.logs_dir / f"query_{ts}.json"
                data = {
                    "timestamp": datetime.now().isoformat(),
                    "question": question,
                    "model": model,
                    "timing_seconds": timing,
                    "retrieved_chunks": chunks,
                    "response": response,
                }
                with open(log_file, "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                print(f"📁 Query logged to: {log_file}")
            except Exception as e:
                print(f"Failed to write log: {e}")

        threading.Thread(target=_log, daemon=True).start()

    def _retrieve(self, message: str, history: list[dict]) -> tuple[str, list[NodeWithScore], float]:
        """Execute common retrieval step."""
        t0 = time.perf_counter()
        query = self._augment_query(message, history)
        nodes = self.retriever.retrieve(query)
        retrieval_time = time.perf_counter() - t0
        return query, nodes, retrieval_time

    # --- Public Methods ---

    def chat(self, message: str, history: list[dict], model: str | None = None) -> dict:
        """Chat with the RAG system (non-streaming)."""
        t0 = time.perf_counter()
        query, nodes, retrieval_time = self._retrieve(message, history)
        
        synthesizer = self._get_synthesizer(model, streaming=False)
        t2 = time.perf_counter()
        response = synthesizer.synthesize(query, nodes=nodes)
        synthesis_time = time.perf_counter() - t2
        total_time = time.perf_counter() - t0

        response_text = str(response)
        chunks = self._format_chunks(nodes)
        
        self._log_query_async(message, chunks, response_text, {
            "retrieval": round(retrieval_time, 4),
            "synthesis": round(synthesis_time, 4),
            "total": round(total_time, 4),
        }, model or settings.groq.model)

        return {"response": response_text, "sources": chunks}

    def stream_chat(self, message: str, history: list[dict], model: str | None = None) -> Generator[str, None, None]:
        """Stream chat response: sources first, then text tokens."""
        t0 = time.perf_counter()
        query, nodes, retrieval_time = self._retrieve(message, history)

        # Phase 1: Emit sources
        chunks = self._format_chunks(nodes)
        yield f"2:{json.dumps({'sources': chunks, 'retrieval_time': retrieval_time})}\n"

        # Phase 2: Stream synthesis tokens
        synthesizer = self._get_synthesizer(model, streaming=True)
        t2 = time.perf_counter()
        
        # Setup reasoning queue context
        q = queue.Queue()
        set_reasoning_queue(q)
        
        response_text = ""
        try:
            streaming_response = synthesizer.synthesize(query, nodes=nodes)
            
            for stream_token in streaming_response.response_gen:
                response_text += stream_token
                
                # Check for reasoning tokens that arrived before this text token
                while not q.empty():
                    r_tok = q.get()
                    yield f"2:{json.dumps({'reasoning': r_tok})}\n"

                yield f"0:{json.dumps(stream_token)}\n"
            
            # Flush any remaining reasoning tokens
            while not q.empty():
                r_tok = q.get()
                yield f"2:{json.dumps({'reasoning': r_tok})}\n"
                
        finally:
            set_reasoning_queue(None)
            
        synthesis_time = time.perf_counter() - t2
        total_time = time.perf_counter() - t0
        
        self._log_query_async(message, chunks, response_text, {
            "retrieval": round(retrieval_time, 4),
            "synthesis": round(synthesis_time, 4),
            "total": round(total_time, 4),
        }, model or settings.groq.model)

    def query_cli(self, question: str, verbose: bool = False) -> str:
        """Query the RAG system (CLI wrapper for manual testing)."""
        result = self.chat(question, [])
        chunks = result["sources"]
        print(f"\n{'=' * 60}\n📚 RETRIEVED CHUNKS\n{'=' * 60}")
        for c in chunks:
            score = f"Score: {c['score']:.4f}" if c["score"] is not None else ""
            print(f"\n[{c['rank']}] {score}\n    Source: {c['file_path']}\n    Preview: {c['text'][:150]}...")
        print("=" * 60)
        
        if verbose:
            print("\n--- Response ---")
        return result["response"]
