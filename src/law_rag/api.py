"""FastAPI application for the US Copyright Law RAG system."""

import json
import os
from contextlib import asynccontextmanager

from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from law_rag.ingestion import DocumentIngestionPipeline
from law_rag.query_engine import RAGQueryEngine

# --- Models ---


class Message(BaseModel):
    role: str
    content: str


class QueryRequest(BaseModel):
    messages: list[Message]


class QueryResponse(BaseModel):
    answer: str
    sources: list[dict]


class IngestRequest(BaseModel):
    force: bool = False


# --- State ---

_engine: RAGQueryEngine | None = None


def _get_engine() -> RAGQueryEngine:
    if _engine is None:
        raise HTTPException(503, "Engine not initialized")
    return _engine


# --- Lifespan ---


@asynccontextmanager
async def lifespan(_: FastAPI):
    global _engine
    print("🚀 Initializing RAG Engine...")
    pipeline = DocumentIngestionPipeline()
    _engine = RAGQueryEngine(pipeline.run(force_reindex=False))
    print("✅ Ready")
    yield
    print("🛑 Shutdown")


# --- App ---

app = FastAPI(
    title="US Copyright Law RAG API",
    version="1.0.0",
    lifespan=lifespan,
    root_path="/api" if os.getenv("VERCEL") else "",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Endpoints ---


@app.get("/health")
async def health():
    _get_engine()
    return {"status": "ok"}


@app.post("/query", response_model=QueryResponse)
async def query(req: QueryRequest):
    if not req.messages:
        raise HTTPException(400, "No messages provided")

    result = _get_engine().chat(
        req.messages[-1].content,
        [m.model_dump() for m in req.messages[:-1]],
    )
    return QueryResponse(answer=result["response"], sources=result["sources"])


@app.post("/ingest")
async def ingest(req: IngestRequest, bg: BackgroundTasks):
    def task():
        global _engine
        pipeline = DocumentIngestionPipeline()
        _engine = RAGQueryEngine(pipeline.run(force_reindex=req.force))

    bg.add_task(task)
    return {"message": "Ingestion started"}


@app.post("/chat")
async def chat_stream(req: QueryRequest):
    """Streaming chat endpoint (Vercel AI SDK Data Stream Protocol)."""
    if not req.messages:
        raise HTTPException(400, "No messages provided")

    last_msg = req.messages[-1].content
    history = [m.model_dump() for m in req.messages[:-1]]

    def generate():
        try:
            print(f"👉 Starting stream for query: {last_msg[:50]}...")
            yield from _get_engine().stream_chat(last_msg, history)
            print("✅ Stream completed successfully")
        except Exception as e:
            print(f"❌ Error during streaming: {e}")
            error_msg = f"\n\n**⚠️ Error:** {e}"
            if "Rate limit reached" in str(e):
                error_msg += "\n\n*Tip: Switch the model in `config.py` or wait.*"
            yield f"0:{json.dumps(error_msg)}\n"

    return StreamingResponse(
        generate(),
        media_type="text/plain; charset=utf-8",
        headers={"X-Content-Type-Options": "nosniff", "X-Vercel-AI-Data-Stream": "v1"},
    )
