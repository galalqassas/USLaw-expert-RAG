# Repository Context: US Copyright Law RAG

## 1. Project Overview

**Version**: 0.1.0
A Retrieval-Augmented Generation (RAG) system specialized for **US Code Title 17 (Copyrights)**. It authenticates users, ingests legal documents, and provides a chat interface to answer questions with cited sources.

- **Primary Goal**: Accurate, cited legal Q&A.
- **Domain**: US Copyright Law (Title 17).

## 2. Tech Stack & Configuration

### Backend (`src/law_rag`)

- **Runtime**: Python 3.11+ (Managed by `uv`).
- **Core Frameworks**:
  - `fastapi` (>=0.128.0): Async API server.
  - `llama-index` (>=0.12.0): RAG orchestration.
  - `llama-index-llms-groq` (>=0.3.0): Groq integration.
  - `ragas` (>=0.4.3): Evaluation framework.

### Frontend (`frontend/`)

- **Runtime**: Node.js 18+ (npm).
- **Core Frameworks**:
  - **Next.js**: 16.1.4 (App Router).
  - **React**: 19.2.3.
  - **Styling**: Tailwind CSS v4, `lucide-react`.
  - **Test**: Jest, React Testing Library.

### AI Infrastructure

| Component      | Provider | Model / Interface                                                      |
| :------------- | :------- | :--------------------------------------------------------------------- |
| **LLM**        | Groq     | `openai/gpt-oss-120b` (Temp: 0.1, Max Tokens: 4096)                    |
| **Embeddings** | Ollama   | `embeddinggemma:latest` (Dim: 768, Base URL: `http://localhost:11434`) |
| **Vector DB**  | Pinecone | Index: `law-rag-index` (Dims: 768, Metric: `cosine`, Cloud: `aws`)     |

## 3. Architecture & Data Flow

### 3.1 Frontend Architecture (`frontend/src`)

- **Type**: Client-Side App (`use client`).
- **Entry Point**: `app/page.tsx` (Main chat interface).
- **State Management**:
  - `hooks/useChat.ts`: Manages polling, message history, and chunk state.
  - `hooks/useDarkMode.ts`: Toggles `dark` class on root.
- **Components**:
  - `RetrievalCard`: Displays source citation side-panel.
  - `MetricsBadges`: Shows Latency (Retrieval/Synthesis).
  - `ChatBubble`: Renders user/ai messages.

### 3.2 Ingestion Pipeline (`src/law_rag/ingestion.py`)

1.  **Source Data**: `data/USCODE-2023-title17/` (HTML/PDF).
2.  **Cleaning**: `clean_html_text` removes scripts/styles. **Parallelized** via `ProcessPoolExecutor`.
3.  **Chunking**: `SentenceSplitter` (Size: 1024, Overlap: 200).
4.  **Indexing**: upsert to Pinecone via `PineconeVectorStore`.

### 3.3 Query Engine (`src/law_rag/query_engine.py`)

1.  **Retrieval**: `VectorIndexRetriever` (top-k=3).
2.  **Synthesis**: `Groq` LLM (`response_mode="compact"`).
3.  **Logging**: Background thread writes to `logs/query_{timestamp}.json`.
4.  **API**: Stateless `POST /query` reconstructs history for context.

## 4. Operational Details

### Data Structure

- `data/`:
  - `USCODE-2023-title17/`: Raw source documents.
  - `evaluation_set.json`: Golden dataset for RAGAS.
- `logs/`: Query execution logs (JSON).

### Docker (`docker-compose.yml`)

- Service: `ollama`
  - Image: `ollama/ollama:latest`
  - Port: `11434` mapped to host.
  - Volume: `ollama:/root/.ollama` (Persists models).

## 5. Key Files & Entry Points

- **Config**: `src/law_rag/config.py` (Pydantic settings, `.env` loader).
- **API Routes** (`src/law_rag/api.py`):
  - `POST /query`: Main chat endpoint.
  - `POST /ingest`: Triggers background ingestion.
  - `GET /health`: Liveness check.
- **CLI** (`src/law_rag/main.py`):
  - `uv run python -m src.law_rag.main --ingest`
  - `uv run python -m src.law_rag.main --evaluate`
