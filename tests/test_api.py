"""Tests for the RAG API endpoints."""

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient


# --- Fixtures ---

@pytest.fixture
def mock_engine():
    """Create a mock RAGQueryEngine."""
    engine = MagicMock()
    mock_response = {
        "response": "Fair use allows limited use of copyrighted material.",
        "sources": [
            {"rank": 1, "score": 0.95, "file_path": "section107.html", "text": "..."},
        ],
    }
    engine.query_with_sources.return_value = mock_response
    engine.chat.return_value = mock_response
    return engine


@pytest.fixture
def client(mock_engine):
    """Create test client with mocked engine."""
    with patch("law_rag.api.DocumentIngestionPipeline") as mock_pipeline, \
         patch("law_rag.api.RAGQueryEngine", return_value=mock_engine):
        mock_pipeline.return_value.run.return_value = MagicMock()
        
        # Import app after patching to use mocked dependencies
        from law_rag.api import app
        
        with TestClient(app) as c:
            yield c


# --- Health Endpoint ---

class TestHealthEndpoint:
    def test_health_returns_ok(self, client):
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


# --- Query Endpoint ---

class TestQueryEndpoint:
    def test_query_success(self, client):
        response = client.post("/query", json={
            "messages": [{"role": "user", "content": "What is fair use?"}]
        })
        assert response.status_code == 200
        data = response.json()
        assert "answer" in data
        assert "sources" in data
        assert len(data["sources"]) > 0

    def test_query_empty_messages_rejected(self, client):
        response = client.post("/query", json={"messages": []})
        assert response.status_code == 400

    def test_query_missing_messages_rejected(self, client):
        response = client.post("/query", json={})
        assert response.status_code == 422


# --- Ingest Endpoint ---

class TestIngestEndpoint:
    def test_ingest_starts_background_task(self, client):
        response = client.post("/ingest", json={"force": False})
        assert response.status_code == 200
        assert "message" in response.json()

    def test_ingest_force_flag(self, client):
        response = client.post("/ingest", json={"force": True})
        assert response.status_code == 200
