"""Tests for the RAG query engine with mocked external services."""

import json
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest


@pytest.fixture
def mock_dependencies():
    """Mock all external dependencies for RAGQueryEngine."""
    with (
        patch("law_rag.query_engine.settings") as mock_settings,
        patch("law_rag.query_engine.OpenAI") as mock_openai,
        patch("law_rag.query_engine.GroqReasoningLLM") as mock_groq_llm,
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

        mock_groq_llm.return_value = MagicMock()
        mock_openai.return_value = MagicMock()

        # Create mock retriever and synthesizer
        mock_retriever = MagicMock()
        mock_retriever_cls.return_value = mock_retriever
        mock_synthesizer = MagicMock()
        mock_synth.return_value = mock_synthesizer

        yield {
            "settings": mock_settings,
            "openai": mock_openai,
            "groq_llm": mock_groq_llm,
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

    def test_chat_with_custom_model(self, engine, mock_dependencies):
        """Test chat passes model parameter to synthesizer creation."""
        mock_node = MagicMock()
        mock_node.score = 0.85
        mock_node.metadata = {"file_path": "test.html"}
        mock_node.text = "Content"

        mock_dependencies["retriever"].retrieve.return_value = [mock_node]
        mock_dependencies["synthesizer"].synthesize.return_value = "Response"

        # Model is different from default, so _get_synthesizer will call lru_cache path
        with patch.object(engine, "_get_synthesizer", wraps=engine._get_synthesizer) as mock_get_synth:
            engine.chat("Test question", history=[], model="openai/custom-model")
            mock_get_synth.assert_called_once_with("openai/custom-model", streaming=False)

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

    def test_stream_chat_sources_contain_retrieval_time(self, engine, mock_dependencies):
        """Test that the first stream event includes retrieval_time."""
        mock_node = MagicMock()
        mock_node.score = 0.8
        mock_node.metadata = {"file_path": "test.html"}
        mock_node.text = "Content"

        mock_dependencies["retriever"].retrieve.return_value = [mock_node]

        mock_streaming_response = MagicMock()
        mock_streaming_response.response_gen = iter(["Token"])
        mock_dependencies["synthesizer"].synthesize.return_value = mock_streaming_response

        tokens = list(engine.stream_chat("test", history=[]))
        sources_payload = json.loads(tokens[0][2:])

        assert "retrieval_time" in sources_payload
        assert isinstance(sources_payload["retrieval_time"], float)

    def test_stream_chat_with_custom_model(self, engine, mock_dependencies):
        """Test stream_chat uses the correct synthesizer for a custom model."""
        mock_node = MagicMock()
        mock_node.score = 0.8
        mock_node.metadata = {"file_path": "test.html"}
        mock_node.text = "Content"

        mock_dependencies["retriever"].retrieve.return_value = [mock_node]

        mock_streaming_response = MagicMock()
        mock_streaming_response.response_gen = iter(["Token"])
        mock_dependencies["synthesizer"].synthesize.return_value = mock_streaming_response

        with patch.object(engine, "_get_synthesizer", wraps=engine._get_synthesizer) as mock_get_synth:
            list(engine.stream_chat("Test", history=[], model="openai/fast-model"))
            mock_get_synth.assert_called_once_with("openai/fast-model", streaming=True)

    def test_stream_chat_reasoning_tokens_yielded(self, engine, mock_dependencies):
        """Test that reasoning tokens from the queue are emitted as 2: events."""

        mock_node = MagicMock()
        mock_node.score = 0.85
        mock_node.metadata = {"file_path": "test.html"}
        mock_node.text = "Content"

        mock_dependencies["retriever"].retrieve.return_value = [mock_node]

        # Patch set_reasoning_queue so we can inject reasoning into it
        captured_queue = None

        def capture_queue(q):
            nonlocal captured_queue
            captured_queue = q

        def fake_stream_response():
            # Simulate: reasoning arrives before a text token
            if captured_queue is not None:
                captured_queue.put("I am thinking...")
            yield "Answer"

        mock_streaming_response = MagicMock()
        mock_streaming_response.response_gen = fake_stream_response()
        mock_dependencies["synthesizer"].synthesize.return_value = mock_streaming_response

        with patch("law_rag.query_engine.set_reasoning_queue", side_effect=capture_queue):
            tokens = list(engine.stream_chat("test", history=[]))

        # Should have: sources (2:), reasoning (2:), text token (0:)
        has_reasoning = any(
            '"reasoning"' in t and t.startswith("2:") for t in tokens
        )
        assert has_reasoning, f"No reasoning event found in: {tokens}"

    def test_stream_chat_clears_queue_on_finish(self, engine, mock_dependencies):
        """Test that the reasoning queue is cleared (set to None) after streaming."""

        mock_node = MagicMock()
        mock_node.score = 0.8
        mock_node.metadata = {"file_path": "test.html"}
        mock_node.text = "Content"

        mock_dependencies["retriever"].retrieve.return_value = [mock_node]

        mock_streaming_response = MagicMock()
        mock_streaming_response.response_gen = iter(["Done"])
        mock_dependencies["synthesizer"].synthesize.return_value = mock_streaming_response

        with patch("law_rag.query_engine.set_reasoning_queue") as mock_set_q:
            list(engine.stream_chat("test", history=[]))
            # Last call should be set_reasoning_queue(None) via finally block
            last_call = mock_set_q.call_args_list[-1]
            assert last_call[0][0] is None


class TestGetSynthesizer:
    """Tests for the _get_synthesizer caching logic."""

    def test_default_model_no_streaming_returns_prebuilt(self, engine, mock_dependencies):
        """Default model + non-streaming returns the pre-built default_synthesizer."""
        result = engine._get_synthesizer(model=None, streaming=False)
        assert result is engine.default_synthesizer

    def test_different_model_creates_new_synthesizer(self, engine, mock_dependencies):
        """Non-default model triggers cached synthesizer creation."""
        with patch.object(engine, "_get_cached_synthesizer") as mock_cached:
            mock_cached.return_value = MagicMock()
            engine._get_synthesizer(model="openai/other-model", streaming=False)
            mock_cached.assert_called_once_with("openai/other-model", False)

    def test_default_model_streaming_creates_new_synthesizer(self, engine, mock_dependencies):
        """Default model + streaming=True uses the cached path, not the pre-built one."""
        with patch.object(engine, "_get_cached_synthesizer") as mock_cached:
            mock_cached.return_value = MagicMock()
            engine._get_synthesizer(model=None, streaming=True)
            mock_cached.assert_called_once_with(
                mock_dependencies["settings"].groq.model, True
            )


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

    def test_augment_query_formats_roles_as_uppercase(self, engine):
        """Test that role names appear in uppercase in augmented query."""
        history = [{"role": "user", "content": "Hello"}]
        result = engine._augment_query("Next", history)
        assert "USER: Hello" in result


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

    def test_format_chunks_score_is_float(self, engine):
        """Test that score is always converted to float."""
        mock_node = MagicMock()
        mock_node.score = 0.95
        mock_node.metadata = {"file_path": "test.html"}
        mock_node.text = "Content"

        result = engine._format_chunks([mock_node])
        assert isinstance(result[0]["score"], float)

    def test_format_chunks_empty_list(self, engine):
        """Test formatting an empty node list."""
        result = engine._format_chunks([])
        assert result == []


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

    def test_validate_is_called_on_init(self, mock_dependencies, mock_index):
        """Test that settings.validate() is called during init."""
        from law_rag.query_engine import RAGQueryEngine

        RAGQueryEngine(index=mock_index)
        mock_dependencies["settings"].validate.assert_called_once()

    def test_groq_llm_used_by_default(self, mock_dependencies, mock_index):
        """Test that GroqReasoningLLM is used to create the default LLM."""
        from law_rag.query_engine import RAGQueryEngine

        RAGQueryEngine(index=mock_index)
        # GroqReasoningLLM should be instantiated for the default model
        mock_dependencies["groq_llm"].assert_called()
