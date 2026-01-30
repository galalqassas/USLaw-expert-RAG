"""Tests for the RAG query engine with mocked external services."""

from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest


@pytest.fixture
def mock_dependencies():
    """Mock all external dependencies for RAGQueryEngine."""
    with patch("law_rag.query_engine.settings") as mock_settings, \
         patch("law_rag.query_engine.OpenAI") as mock_openai, \
         patch("law_rag.query_engine.LlamaSettings"), \
         patch("law_rag.query_engine.VectorIndexRetriever") as mock_retriever_cls, \
         patch("law_rag.query_engine.get_response_synthesizer") as mock_synth:
        # Configure mock settings
        mock_settings.groq.model = "llama-3.3-70b-versatile"
        mock_settings.groq.api_key = "test-key"
        mock_settings.groq.temperature = 0.1
        mock_settings.groq.max_tokens = 1024
        mock_settings.groq.context_window = 8192
        mock_settings.similarity_top_k = 5
        mock_settings.response_mode = "compact"
        mock_settings.chunk_preview_length = 200
        mock_settings.BASE_DIR = Path(".")
        mock_settings.validate = MagicMock()

        mock_openai.return_value = MagicMock()

        # Create mock retriever and synthesizer
        mock_retriever = MagicMock()
        mock_retriever_cls.return_value = mock_retriever
        mock_synthesizer = MagicMock()
        mock_synth.return_value = mock_synthesizer

        yield {
            "settings": mock_settings,
            "openai": mock_openai,
            "retriever": mock_retriever,
            "synthesizer": mock_synthesizer,
        }


@pytest.fixture
def mock_index():
    """Create a mock VectorStoreIndex."""
    index = MagicMock()
    index.as_chat_engine.return_value = MagicMock()
    return index


@pytest.fixture
def engine(mock_dependencies, mock_index):
    """Create RAGQueryEngine with mocked dependencies."""
    from law_rag.query_engine import RAGQueryEngine
    engine = RAGQueryEngine(index=mock_index)
    # Replace with our controlled mocks
    engine.retriever = mock_dependencies["retriever"]
    engine.synthesizer = mock_dependencies["synthesizer"]
    return engine


class TestRAGQueryEngine:
    """Tests for RAGQueryEngine."""

    def test_query_returns_response(self, engine, mock_dependencies):
        """Test basic query returns a response string."""
        mock_node = MagicMock()
        mock_node.score = 0.95
        mock_node.metadata = {"file_path": "test.html"}
        mock_node.text = "Test content"

        mock_dependencies["retriever"].retrieve.return_value = [mock_node]
        mock_dependencies["synthesizer"].synthesize.return_value = "Test response"

        result = engine.query("What is copyright law?")
        
        assert isinstance(result, str)
        mock_dependencies["retriever"].retrieve.assert_called_once()
        mock_dependencies["synthesizer"].synthesize.assert_called_once()

    def test_chat_returns_response_and_sources(self, engine, mock_dependencies):
        """Test chat returns response with sources."""
        mock_node = MagicMock()
        mock_node.score = 0.90
        mock_node.metadata = {"file_path": "doc.html"}
        mock_node.text = "Legal content"

        mock_dependencies["retriever"].retrieve.return_value = [mock_node]
        mock_dependencies["synthesizer"].synthesize.return_value = "Chat response"

        result = engine.chat("Tell me about fair use", history=[])

        assert "response" in result
        assert "sources" in result
        assert isinstance(result["sources"], list)

    def test_chat_with_history(self, engine, mock_dependencies):
        """Test chat properly handles conversation history."""
        mock_node = MagicMock()
        mock_node.score = 0.85
        mock_node.metadata = {"file_path": "law.html"}
        mock_node.text = "History context"

        mock_dependencies["retriever"].retrieve.return_value = [mock_node]
        mock_dependencies["synthesizer"].synthesize.return_value = "Follow-up response"

        history = [
            {"role": "user", "content": "What is copyright?"},
            {"role": "assistant", "content": "Copyright is..."},
        ]

        result = engine.chat("What about fair use?", history=history)

        assert "response" in result
        # Verify the query was augmented with history
        call_args = mock_dependencies["retriever"].retrieve.call_args[0][0]
        assert "conversation history" in call_args.lower()

    def test_query_with_sources(self, engine, mock_dependencies):
        """Test query_with_sources returns structured response."""
        mock_node = MagicMock()
        mock_node.score = 0.88
        mock_node.metadata = {"file_path": "source.html"}
        mock_node.text = "Source content"

        mock_dependencies["retriever"].retrieve.return_value = [mock_node]
        mock_dependencies["synthesizer"].synthesize.return_value = "Response with sources"

        result = engine.query_with_sources("Copyright question")

        assert "response" in result
        assert "sources" in result
        assert len(result["sources"]) == 1
        assert result["sources"][0]["file_path"] == "source.html"

    def test_stream_chat_yields_tokens(self, engine, mock_index):
        """Test stream_chat yields tokens as a generator."""
        # Mock the chat engine's stream_chat response
        mock_streaming_response = MagicMock()
        mock_streaming_response.response_gen = iter(["Hello ", "world ", "!"])
        mock_index.as_chat_engine.return_value.stream_chat.return_value = mock_streaming_response
        engine.chat_engine = mock_index.as_chat_engine.return_value

        tokens = list(engine.stream_chat("test message", history=[]))

        assert tokens == ["Hello ", "world ", "!"]

    def test_stream_chat_with_history(self, engine, mock_index):
        """Test stream_chat handles conversation history."""
        mock_streaming_response = MagicMock()
        mock_streaming_response.response_gen = iter(["Response"])
        mock_index.as_chat_engine.return_value.stream_chat.return_value = mock_streaming_response
        engine.chat_engine = mock_index.as_chat_engine.return_value

        history = [
            {"role": "user", "content": "First question"},
            {"role": "assistant", "content": "First answer"},
        ]

        list(engine.stream_chat("Follow up", history=history))

        # Verify stream_chat was called with correct history
        call_args = engine.chat_engine.stream_chat.call_args
        assert call_args[0][0] == "Follow up"
        chat_history = call_args.kwargs.get("chat_history") or call_args[1].get("chat_history")
        assert len(chat_history) == 2

