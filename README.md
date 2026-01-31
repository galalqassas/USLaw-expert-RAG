# ⚖️ US Copyright Law RAG

A high-performance **Retrieval-Augmented Generation (RAG)** system built for querying **US Code Title 17 (Copyrights)**.

Now updated with a modern **React/Next.js UI**, context-aware chat, and real-time citing.

## 🚀 Live Demo

- **Frontend**: [https://us-law-expert-frontend.vercel.app/](https://us-law-expert-frontend.vercel.app/)
- **Backend API**: [https://us-law-expert-rag.vercel.app/docs](https://us-law-expert-rag.vercel.app/docs)

## 🏗️ Architecture

```mermaid
graph LR
    User((User)) -->|Browser| Frontend[Next.js App]
    User -->|CLI/HTTP| Interface[FastAPI]

    Frontend -->|Query w/ History| Interface
    Interface --> Engine[RAG Engine]

    Engine -->|Retrieve| Pinecone[(Pinecone)]
    Engine -->|Generate| Groq[Groq LPU]

    Docs[Documents] -.->|Embed| Gemini[Gemini]
    Gemini -.->|Index| Pinecone
```

## 🚀 Features

- **⚡ Instant Inference**: Powered by Groq's LPU (`openai/gpt-oss-120b`).
- **💬 Chat Interface**: Modern Web UI with history, dark mode, and file icons.
- **🔍 Semantic Search**: Pinecone vector database with reliable indexing.
- **🌐 REST API**: Context-aware `POST /chat` endpoint.
- **📊 Traceability**: Full JSON logging of queries, retrieved chunks, and timing.

## ⚡ Quick Start

### 1. Prerequisites

- Python 3.11+ & Node.js 18+
- [uv](https://github.com/astral-sh/uv) (recommended)
- [pnpm](https://pnpm.io/) (recommended for frontend)

### 2. Start Services (2 Terminals)

**Terminal 1: API Backend**

```bash
# Install Python dependencies and run server
uv sync
uv run python -m law_rag.main --serve
```

**Terminal 2: Frontend UI**

```bash
# Install Node dependencies and run dev server
cd frontend
pnpm install
pnpm dev
```

Visit **http://localhost:3000** to use the application.

### 3. CLI Usage

**Interactive Chat**

```bash
uv run python -m law_rag.main
```

**Run Evaluation**

```bash
uv run python -m law_rag.main --evaluate
```

**Single Query**

```bash
uv run python -m law_rag.main -q "What is fair use?"
```

**Ingest Data** (Required first run)

```bash
uv run python -m law_rag.main --ingest
# Force re-index:
uv run python -m law_rag.main --ingest --force
```

## 🌐 API Reference

### POST `/chat`

Streaming chat endpoint.

- **Swagger UI**: `http://localhost:8000/docs`
- **Health Check**: `http://localhost:8000/health` or `GET /health`

#### Endpoints

| Method | Endpoint  | Description                                                         |
| :----- | :-------- | :------------------------------------------------------------------ |
| `GET`  | `/health` | Health check probe. Returns `{"status": "ok"}`.                     |
| `POST` | `/chat`   | **Streaming** chat endpoint compatible with Vercel AI SDK.          |
| `POST` | `/query`  | Non-streaming query endpoint. Returns JSON with answer and sources. |
| `POST` | `/ingest` | Trigger background document ingestion.                              |

## ⚙️ Configuration

Settings are managed in `src/law_rag/config.py` and `.env`.

| Component | Default               | Description         |
| :-------- | :-------------------- | :------------------ |
| **LLM**   | `openai/gpt-oss-120b` | LLM Model ID        |
| **Index** | `1024`                | Indexing chunk size |
| **RAG**   | `5`                   | Retrieval depth     |

## 🛠️ Tech Stack

- **Frontend**: Next.js 16, Tailwind CSS, Lucide
- **Backend**: FastAPI, LlamaIndex
- **AI**: Groq (LLM), Pinecone (Vector DB), Gemini (Embeddings)
