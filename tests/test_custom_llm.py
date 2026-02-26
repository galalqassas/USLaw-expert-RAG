from unittest.mock import MagicMock, patch
import queue
import threading
from llama_index.core.base.llms.types import ChatMessage, MessageRole
from law_rag.custom_llm import GroqReasoningLLM, set_reasoning_queue, get_reasoning_queue


class TestGroqReasoningLLM:

    @patch("llama_index.llms.openai.base.OpenAI._get_client")
    def test_stream_chat_captures_reasoning(self, mock_get_client):
        # Setup mock response
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        
        # Mock chunks
        chunk1 = MagicMock()
        chunk1.choices[0].delta.content = "Hello"
        chunk1.choices[0].delta.reasoning = "Thinking process..."
        
        chunk2 = MagicMock()
        chunk2.choices[0].delta.content = " World"
        chunk2.choices[0].delta.reasoning = None
        
        mock_client.chat.completions.create.return_value = [chunk1, chunk2]
        
        # Setup Queue
        q = queue.Queue()
        set_reasoning_queue(q)
        
        llm = GroqReasoningLLM(api_key="fake", model="fake-model")
        messages = [ChatMessage(role=MessageRole.USER, content="Hi")]
        
        # Execute
        response_gen = llm.stream_chat(messages)
        chunks = list(response_gen)
        
        # Verify Content
        assert len(chunks) == 2
        assert chunks[0].delta == "Hello"
        assert chunks[1].delta == " World"
        assert chunks[1].message.content == "Hello World"
        
        # Verify Reasoning Queue
        assert not q.empty()
        item = q.get()
        assert item == "Thinking process..."
        
        # Cleanup
        set_reasoning_queue(None)

    @patch("llama_index.llms.openai.base.OpenAI._get_client")
    def test_init_sets_extra_body(self, mock_get_client):
        # We want to verify that include_reasoning=True is passed to the API call
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        mock_client.chat.completions.create.return_value = []
        
        llm = GroqReasoningLLM(api_key="fake", model="fake-model")
        list(llm.stream_chat([ChatMessage(role=MessageRole.USER, content="Hi")]))
        
        # Check call args
        call_kwargs = mock_client.chat.completions.create.call_args[1]
        assert "extra_body" in call_kwargs
        assert call_kwargs["extra_body"]["include_reasoning"] is True

    @patch("llama_index.llms.openai.base.OpenAI._get_client")
    def test_reasoning_not_emitted_when_queue_is_none(self, mock_get_client):
        """Test that reasoning tokens are silently dropped when no queue is set."""
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        
        chunk = MagicMock()
        chunk.choices[0].delta.content = "Answer"
        chunk.choices[0].delta.reasoning = "Thinking..."
        mock_client.chat.completions.create.return_value = [chunk]
        
        # Ensure no queue is attached
        set_reasoning_queue(None)
        
        llm = GroqReasoningLLM(api_key="fake", model="fake-model")
        # Should not raise even though reasoning exists with no queue
        chunks = list(llm.stream_chat([ChatMessage(role=MessageRole.USER, content="Hi")]))
        assert chunks[0].delta == "Answer"

    @patch("llama_index.llms.openai.base.OpenAI._get_client")
    def test_no_reasoning_in_chunk_is_skipped(self, mock_get_client):
        """Test that chunks without reasoning field don't cause errors."""
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        
        chunk = MagicMock(spec=[])
        chunk.choices = [MagicMock()]
        chunk.choices[0].delta = MagicMock(spec=["content"])
        chunk.choices[0].delta.content = "Text"
        # No 'reasoning' attribute on delta
        
        mock_client.chat.completions.create.return_value = [chunk]
        
        q = queue.Queue()
        set_reasoning_queue(q)
        
        llm = GroqReasoningLLM(api_key="fake", model="fake-model")
        chunks = list(llm.stream_chat([ChatMessage(role=MessageRole.USER, content="Hi")]))
        
        # Queue should remain empty (no reasoning)
        assert q.empty()
        assert chunks[0].delta == "Text"
        set_reasoning_queue(None)

    @patch("llama_index.llms.openai.base.OpenAI._get_client")
    def test_include_reasoning_false_omits_extra_body_flag(self, mock_get_client):
        """Test that include_reasoning=False does NOT set extra_body flag at init."""
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        mock_client.chat.completions.create.return_value = []
        
        llm = GroqReasoningLLM(include_reasoning=False, api_key="fake", model="fake-model")
        
        # extra_body should not have include_reasoning from __init__
        # (stream_chat itself always sets it for the API call, but __init__ should not)
        # We verify the object was created without error - the extra_body at __init__
        # level should not contain the flag when include_reasoning=False
        assert "include_reasoning" not in llm.additional_kwargs.get("extra_body", {})


class TestReasoningQueueThreadIsolation:
    """Tests for thread-local reasoning queue isolation."""

    def test_each_thread_has_independent_queue(self):
        """Test that queues set in different threads don't interfere."""
        results = {}

        def thread_fn(thread_id, q):
            set_reasoning_queue(q)
            # Small sleep to allow interleaving
            import time
            time.sleep(0.01)
            results[thread_id] = get_reasoning_queue()

        q1 = queue.Queue()
        q2 = queue.Queue()
        t1 = threading.Thread(target=thread_fn, args=(1, q1))
        t2 = threading.Thread(target=thread_fn, args=(2, q2))
        t1.start()
        t2.start()
        t1.join()
        t2.join()

        assert results[1] is q1
        assert results[2] is q2

    def test_set_none_clears_queue(self):
        """Test that setting None clears the queue."""
        q = queue.Queue()
        set_reasoning_queue(q)
        assert get_reasoning_queue() is q

        set_reasoning_queue(None)
        assert get_reasoning_queue() is None
