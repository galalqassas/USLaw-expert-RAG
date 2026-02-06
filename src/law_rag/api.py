"""FastAPI application for the US Copyright Law RAG system."""

import json
import os
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from law_rag.config import settings
from law_rag.ingestion import DocumentIngestionPipeline
from law_rag.query_engine import RAGQueryEngine

# --- Models ---


class Message(BaseModel):
    role: str = Field(..., description="Role of the message sender (e.g., 'user', 'assistant')")
    content: str = Field(..., description="Content of the message")


class QueryRequest(BaseModel):
    messages: list[Message] = Field(
        ..., 
        description="List of conversation messages",
        min_length=1,
        examples=[
            [
                {"role": "user", "content": "What is fair use?"}
            ]
        ]
    )
    model: str | None = Field(default=None, description="Model to use for generation (e.g. 'openai/gpt-oss-120b')")


class QueryResponse(BaseModel):
    answer: str = Field(..., description="Synthesized answer from the RAG system")
    sources: list[dict] = Field(..., description="List of source documents used for the answer")


class IngestRequest(BaseModel):
    force: bool = Field(False, description="Force re-indexing of all documents even if they already exist")


# --- Lifespan ---


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Initializing RAG Engine...")
    try:
        pipeline = DocumentIngestionPipeline()
        # Initialize engine and store in app state
        app.state.engine = RAGQueryEngine(pipeline.run(force_reindex=False))
        print("✅ RAG Engine Ready")
    except Exception as e:
        print(f"❌ Failed to initialize RAG Engine: {e}")
        # We don't raise here to allow the app to start, but health check will fail
        app.state.engine = None
    
    yield
    
    print("🛑 Shutdown")
    app.state.engine = None


# --- Dependencies ---

def get_engine(request: Request) -> RAGQueryEngine:
    """Dependency to get the RAG engine from app state."""
    engine = getattr(request.app.state, "engine", None)
    if engine is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, 
            detail="RAG Engine not initialized or unavailable"
        )
    return engine

EngineDep = Annotated[RAGQueryEngine, Depends(get_engine)]


# --- App ---

app = FastAPI(
    title="US Copyright Law RAG API",
    description="""
    Expert RAG system for US Copyright Law (Title 17). 
    
    Provides endpoints for:
    - Querying: Ask questions about copyright law and get cited answers.
    - Streaming Chat: Real-time conversational interface.
    - Ingestion: Indexing of legal documents.
    """,
    version="1.0.0",
    contact={
        "name": "US Law Expert RAG Team",
        "url": "https://us-law-expert-frontend.vercel.app/",
    },
    license_info={
        "name": "MIT",
    },
    lifespan=lifespan,
    root_path="/api" if os.getenv("VERCEL") else "",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Endpoints ---


@app.get(
    "/health",
    tags=["Health"],
    summary="Health Check",
    description="Checks if the RAG engine is initialized and the API is ready to accept requests.",
    status_code=status.HTTP_200_OK,
)
async def health(request: Request):
    """
    Perform a health check.

    Returns:
        dict: {"status": "ok"} if successful.
    """
    if not getattr(request.app.state, "engine", None):
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Engine not ready")
    return {"status": "ok"}


@app.post(
    "/query",
    response_model=QueryResponse,
    tags=["Query"],
    summary="Submit a RAG Query",
    description="Submit a question to the RAG system and receive a synthesized answer with sources.",
)
async def query(req: QueryRequest, engine: EngineDep):
    """
    Process a user query using the RAG engine.

    - **req**: The query request containing the message history.
    """
    try:
        result = engine.chat(
            req.messages[-1].content,
            [m.model_dump() for m in req.messages[:-1]],
            model=req.model,
        )
        return QueryResponse(answer=result["response"], sources=result["sources"])
    except Exception as e:
        print(f"❌ Query Error: {e}")
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, str(e))


@app.post(
    "/ingest",
    tags=["Ingestion"],
    summary="Trigger Document Ingestion",
    description="Start the background process to ingest and index documents from the source directory.",
    status_code=status.HTTP_202_ACCEPTED,
)
async def ingest(req: IngestRequest, bg: BackgroundTasks, request: Request):
    """
    Trigger the document ingestion pipeline in the background.

    - **force**: If true, re-indexes everything from scratch.
    """
    def task():
        print(f"🔄 Starting background ingestion (force={req.force})...")
        try:
            pipeline = DocumentIngestionPipeline()
            # Update the global engine state safely
            request.app.state.engine = RAGQueryEngine(pipeline.run(force_reindex=req.force))
            print("✅ Background ingestion complete.")
        except Exception as e:
            print(f"❌ Ingestion failed: {e}")

    bg.add_task(task)
    return {"message": "Ingestion started", "details": "Processing in background"}


@app.post(
    "/chat",
    tags=["Chat"],
    summary="Streaming Chat",
    description="Stream the response token by token using the Vercel AI SDK Data Stream Protocol.",
)
async def chat_stream(req: QueryRequest, engine: EngineDep):
    """
    Streaming chat endpoint.

    Returns a stream of text and data events compliant with Vercel AI SDK.
    """
    last_msg = req.messages[-1].content
    history = [m.model_dump() for m in req.messages[:-1]]

    def generate():
        try:
            print(f"👉 [Backend] Received model from request: '{req.model}'")
            print(f"👉 [Backend] Starting stream for query: {last_msg[:50]}... (Using Model: {req.model or settings.groq.model})")
            yield from engine.stream_chat(last_msg, history, model=req.model)
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
