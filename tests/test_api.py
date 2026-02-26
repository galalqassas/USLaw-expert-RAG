"""Tests for the RAG API endpoints."""

import json

# Fixtures `client` and `mock_engine` are defined in conftest.py


class TestHealthEndpoint:
    def test_health_ok(self, client):
        r = client.get("/health")
        assert r.status_code == 200
        assert r.json() == {"status": "ok"}


class TestQueryEndpoint:
    def test_query_success(self, client):
        r = client.post(
            "/query", json={"messages": [{"role": "user", "content": "test"}]}
        )
        assert r.status_code == 200
        assert "answer" in r.json() and "sources" in r.json()

    def test_query_with_history(self, client):
        r = client.post(
            "/query",
            json={
                "messages": [
                    {"role": "user", "content": "q1"},
                    {"role": "assistant", "content": "a1"},
                    {"role": "user", "content": "q2"},
                ]
            },
        )
        assert r.status_code == 200

    def test_query_empty_messages_rejected(self, client):
        assert client.post("/query", json={"messages": []}).status_code == 422

    def test_query_invalid_format_rejected(self, client):
        assert client.post("/query", json={}).status_code == 422

    def test_query_with_model_param(self, client, mock_engine):
        """Test that the 'model' field is forwarded to the engine.chat call."""
        r = client.post(
            "/query",
            json={
                "messages": [{"role": "user", "content": "test"}],
                "model": "openai/custom-model",
            },
        )
        assert r.status_code == 200
        # Verify engine.chat was called with the model keyword argument
        call_kwargs = mock_engine.chat.call_args[1]
        assert call_kwargs.get("model") == "openai/custom-model"

    def test_query_model_defaults_to_none(self, client, mock_engine):
        """Test that 'model' defaults to None when not provided."""
        client.post(
            "/query",
            json={"messages": [{"role": "user", "content": "test"}]},
        )
        call_kwargs = mock_engine.chat.call_args[1]
        assert call_kwargs.get("model") is None


class TestIngestEndpoint:
    def test_ingest_returns_message(self, client):
        r = client.post("/ingest", json={})
        assert r.status_code == 202
        assert "message" in r.json()

    def test_ingest_force_true(self, client):
        """Test ingest endpoint with force=True is accepted."""
        r = client.post("/ingest", json={"force": True})
        assert r.status_code == 202
        assert "message" in r.json()

    def test_ingest_force_false(self, client):
        """Test ingest endpoint with explicit force=False."""
        r = client.post("/ingest", json={"force": False})
        assert r.status_code == 202


class TestChatStreamEndpoint:
    """Tests for the /chat streaming endpoint."""

    def test_chat_stream_success(self, client):
        """Test successful streaming response."""
        r = client.post(
            "/chat", json={"messages": [{"role": "user", "content": "test"}]}
        )
        assert r.status_code == 200
        assert r.headers["content-type"] == "text/plain; charset=utf-8"
        # Check we got some streamed content
        assert len(r.text) > 0

    def test_chat_stream_with_history(self, client):
        """Test streaming with conversation history."""
        r = client.post(
            "/chat",
            json={
                "messages": [
                    {"role": "user", "content": "q1"},
                    {"role": "assistant", "content": "a1"},
                    {"role": "user", "content": "q2"},
                ]
            },
        )
        assert r.status_code == 200

    def test_chat_stream_empty_messages_rejected(self, client):
        """Test that empty messages are rejected."""
        r = client.post("/chat", json={"messages": []})
        assert r.status_code == 422

    def test_chat_stream_invalid_format_rejected(self, client):
        """Test that invalid request format is rejected."""
        r = client.post("/chat", json={})
        assert r.status_code == 422

    def test_chat_stream_response_format(self, client):
        """Test the stream output contains Vercel AI SDK protocol lines."""
        r = client.post(
            "/chat", json={"messages": [{"role": "user", "content": "test"}]}
        )
        assert r.status_code == 200
        lines = [line for line in r.text.splitlines() if line]
        # Each non-empty line must start with a valid data stream prefix (0: or 2:)
        for line in lines:
            assert line.startswith("0:") or line.startswith("2:"), (
                f"Unexpected stream line format: {line!r}"
            )

    def test_chat_stream_sources_are_first(self, client):
        """Test that sources data event (2:) is emitted before text tokens (0:)."""
        r = client.post(
            "/chat", json={"messages": [{"role": "user", "content": "test"}]}
        )
        assert r.status_code == 200
        lines = [line for line in r.text.splitlines() if line]
        assert lines[0].startswith("2:"), "First event should be sources data (2:)"
        sources_payload = json.loads(lines[0][2:])
        assert "sources" in sources_payload

    def test_chat_stream_with_model_param(self, client, mock_engine):
        """Test that model param is forwarded to stream_chat."""
        client.post(
            "/chat",
            json={
                "messages": [{"role": "user", "content": "test"}],
                "model": "openai/fast-model",
            },
        )
        call_kwargs = mock_engine.stream_chat.call_args[1]
        assert call_kwargs.get("model") == "openai/fast-model"

    def test_chat_stream_vercel_ai_header(self, client):
        """Test that response includes the Vercel AI Data Stream header."""
        r = client.post(
            "/chat", json={"messages": [{"role": "user", "content": "test"}]}
        )
        assert r.headers.get("x-vercel-ai-data-stream") == "v1"

    def test_chat_stream_error_returns_stream(self, client, mock_engine):
        """Test that errors during streaming are sent as stream events, not HTTP errors."""
        mock_engine.stream_chat.side_effect = RuntimeError("LLM unavailable")
        r = client.post(
            "/chat", json={"messages": [{"role": "user", "content": "test"}]}
        )
        # Should still be 200 - error is embedded in the stream content
        assert r.status_code == 200
        assert "Error" in r.text or "error" in r.text
