"""FastAPI application for the US Copyright Law RAG system."""

from contextlib import asynccontextmanager

from fastapi import BackgroundTasks, FastAPI, HTTPException
from pydantic import BaseModel, Field

from law_rag.ingestion import DocumentIngestionPipeline
from law_rag.query_engine import RAGQueryEngine

# --- Models ---

class QueryRequest(BaseModel):
    text: str = Field(..., min_length=1)

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
)

# --- Endpoints ---

@app.get("/health")
async def health():
    _get_engine()
    return {"status": "ok"}

@app.post("/query", response_model=QueryResponse)
async def query(req: QueryRequest):
    result = _get_engine().query_with_sources(req.text)
    return QueryResponse(answer=result["response"], sources=result["sources"])

@app.post("/ingest")
async def ingest(req: IngestRequest, bg: BackgroundTasks):
    def task():
        global _engine
        pipeline = DocumentIngestionPipeline()
        _engine = RAGQueryEngine(pipeline.run(force_reindex=req.force))
    bg.add_task(task)
    return {"message": "Ingestion started"}
