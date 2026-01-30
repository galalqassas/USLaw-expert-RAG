"""Shared pytest fixtures for Law RAG tests."""

from unittest.mock import MagicMock, patch
import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def mock_engine():
    """Mock RAGQueryEngine that returns dynamic responses."""
    engine = MagicMock()
    engine.chat.side_effect = lambda msg, hist=None: {
        "response": f"Mock: {msg}",
        "sources": [{"rank": 1, "score": 0.9, "file_path": "doc.html", "text": "..."}],
    }

    # Mock stream_chat to yield tokens
    def mock_stream_chat(msg, hist=None):
        for token in f"Streaming response for: {msg}".split():
            yield token + " "

    engine.stream_chat.side_effect = mock_stream_chat
    return engine


@pytest.fixture
def client(mock_engine):
    """Test client with mocked dependencies."""
    with (
        patch("law_rag.api.DocumentIngestionPipeline") as p,
        patch("law_rag.api.RAGQueryEngine", return_value=mock_engine),
    ):
        p.return_value.run.return_value = MagicMock()
        from law_rag.api import app

        with TestClient(app) as c:
            yield c
