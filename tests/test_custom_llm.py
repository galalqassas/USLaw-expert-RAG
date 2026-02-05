from unittest.mock import MagicMock, patch
import queue
from llama_index.core.base.llms.types import ChatMessage, MessageRole
from law_rag.custom_llm import GroqReasoningLLM, set_reasoning_queue

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
