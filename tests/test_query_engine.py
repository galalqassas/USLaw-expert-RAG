"""Tests for the RAG query engine with mocked external services."""

from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest


@pytest.fixture
def mock_dependencies():
    """Mock all external dependencies for RAGQueryEngine."""
    with (
        patch("law_rag.query_engine.settings") as mock_settings,
        patch("law_rag.query_engine.OpenAI") as mock_openai,
        patch("law_rag.query_engine.VectorIndexRetriever") as mock_retriever_cls,
        patch("law_rag.query_engine.get_response_synthesizer") as mock_synth,
    ):
        # Configure mock settings
        mock_settings.groq.model = "llama-3.3-70b-versatile"
        mock_settings.groq.api_key = "test-key"
        mock_settings.groq.temperature = 0.1
        mock_settings.groq.max_tokens = 1024
        mock_settings.groq.context_window = 8192
        mock_settings.similarity_top_k = 5
        mock_settings.response_mode = "compact"
        mock_settings.chunk_preview_length = 200
        mock_settings.system_prompt = "Test System Prompt"
        mock_settings.qa_template = "Context: {context_str} Query: {query_str} Answer:"
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
    # engine.default_synthesizer is created by __init__ using mocked get_response_synthesizer
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
        # usage via query_cli -> chat -> _get_synthesizer -> default_synthesizer
        # default_synthesizer is created from the mocked get_response_synthesizer
        mock_dependencies["synthesizer"].synthesize.return_value = "Test response"

        result = engine.query_cli("What is copyright law?")

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

    def test_stream_chat_yields_tokens(self, engine, mock_dependencies):
        """Test stream_chat yields formatted stream events."""
        mock_node = MagicMock()
        mock_node.score = 0.85
        mock_node.metadata = {"file_path": "test.html"}
        mock_node.text = "Test content"

        mock_dependencies["retriever"].retrieve.return_value = [mock_node]

        # Mock streaming synthesizer behavior on the global mock
        mock_streaming_response = MagicMock()
        mock_streaming_response.response_gen = iter(["Hello ", "world"])
        mock_dependencies["synthesizer"].synthesize.return_value = mock_streaming_response

        tokens = list(engine.stream_chat("test message", history=[]))

        # First event is sources (2:), then text tokens (0:)
        assert tokens[0].startswith("2:")
        assert '"sources"' in tokens[0]
        assert tokens[1] == '0:"Hello "\n'
        assert tokens[2] == '0:"world"\n'

    def test_stream_chat_with_history(self, engine, mock_dependencies):
        """Test stream_chat handles conversation history."""
        mock_node = MagicMock()
        mock_node.score = 0.85
        mock_node.metadata = {"file_path": "test.html"}
        mock_node.text = "Test content"

        mock_dependencies["retriever"].retrieve.return_value = [mock_node]

        mock_streaming_response = MagicMock()
        mock_streaming_response.response_gen = iter(["Response"])
        mock_dependencies["synthesizer"].synthesize.return_value = mock_streaming_response

        history = [
            {"role": "user", "content": "First question"},
            {"role": "assistant", "content": "First answer"},
        ]

        list(engine.stream_chat("Follow up", history=history))

        # Verify retriever was called with augmented query containing history
        call_args = mock_dependencies["retriever"].retrieve.call_args[0][0]
        assert "conversation history" in call_args.lower()


class TestAugmentQuery:
    """Tests for the _augment_query helper method."""

    def test_augment_query_without_history(self, engine):
        """Test that message is returned unchanged when no history."""
        result = engine._augment_query("Hello", [])
        assert result == "Hello"

    def test_augment_query_with_history(self, engine):
        """Test that history is properly prepended to query."""
        history = [
            {"role": "user", "content": "First question"},
            {"role": "assistant", "content": "First answer"},
        ]
        result = engine._augment_query("Follow-up", history)
        assert "conversation history" in result.lower()
        assert "First question" in result
        assert "First answer" in result
        assert "Follow-up" in result


class TestFormatChunks:
    """Tests for the _format_chunks helper method."""

    def test_format_chunks_basic(self, engine):
        """Test basic chunk formatting."""
        mock_node = MagicMock()
        mock_node.score = 0.95
        mock_node.metadata = {"file_path": "test.html"}
        mock_node.text = "Test content here"

        result = engine._format_chunks([mock_node])

        assert len(result) == 1
        assert result[0]["rank"] == 1
        assert result[0]["score"] == 0.95
        assert result[0]["file_path"] == "test.html"
        assert result[0]["text"] == "Test content here"
        assert result[0]["text_length"] == 17

    def test_format_chunks_none_score(self, engine):
        """Test handling of None scores."""
        mock_node = MagicMock()
        mock_node.score = None
        mock_node.metadata = {"file_path": "test.html"}
        mock_node.text = "Content"

        result = engine._format_chunks([mock_node])
        assert result[0]["score"] is None

    def test_format_chunks_missing_file_path(self, engine):
        """Test handling of missing file_path metadata."""
        mock_node = MagicMock()
        mock_node.score = 0.8
        mock_node.metadata = {}
        mock_node.text = "Content"

        result = engine._format_chunks([mock_node])
        assert result[0]["file_path"] == "Unknown"

    def test_format_chunks_multiple(self, engine):
        """Test formatting multiple chunks with correct ranking."""
        nodes = []
        for i, score in enumerate([0.9, 0.8, 0.7]):
            node = MagicMock()
            node.score = score
            node.metadata = {"file_path": f"doc{i}.html"}
            node.text = f"Content {i}"
            nodes.append(node)

        result = engine._format_chunks(nodes)

        assert len(result) == 3
        assert result[0]["rank"] == 1
        assert result[1]["rank"] == 2
        assert result[2]["rank"] == 3


class TestInitialization:
    """Tests for RAGQueryEngine initialization."""

    def test_readonly_filesystem_disables_logging(self, mock_dependencies, mock_index):
        """Test that read-only filesystem disables file logging."""
        with patch("pathlib.Path.mkdir", side_effect=OSError("Read-only")):
            from law_rag.query_engine import RAGQueryEngine

            engine = RAGQueryEngine(index=mock_index)
            assert engine._enable_file_logging is False

    def test_writable_filesystem_enables_logging(self, mock_dependencies, mock_index):
        """Test that writable filesystem enables file logging."""
        with patch("pathlib.Path.mkdir"):
            from law_rag.query_engine import RAGQueryEngine

            engine = RAGQueryEngine(index=mock_index)
            assert engine._enable_file_logging is True
