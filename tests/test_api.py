"""Tests for the RAG API endpoints."""

# Fixtures `client` and `mock_engine` are defined in conftest.py


class TestHealthEndpoint:
    def test_health_ok(self, client):
        r = client.get("/health")
        assert r.status_code == 200
        assert r.json() == {"status": "ok"}


class TestQueryEndpoint:
    def test_query_success(self, client):
        r = client.post("/query", json={"messages": [{"role": "user", "content": "test"}]})
        assert r.status_code == 200
        assert "answer" in r.json() and "sources" in r.json()

    def test_query_with_history(self, client):
        r = client.post("/query", json={"messages": [
            {"role": "user", "content": "q1"},
            {"role": "assistant", "content": "a1"},
            {"role": "user", "content": "q2"},
        ]})
        assert r.status_code == 200

    def test_query_empty_messages_rejected(self, client):
        assert client.post("/query", json={"messages": []}).status_code == 400

    def test_query_invalid_format_rejected(self, client):
        assert client.post("/query", json={}).status_code == 422


class TestIngestEndpoint:
    def test_ingest_returns_message(self, client):
        r = client.post("/ingest", json={})
        assert r.status_code == 200
        assert "message" in r.json()


class TestChatStreamEndpoint:
    """Tests for the /chat streaming endpoint."""

    def test_chat_stream_success(self, client):
        """Test successful streaming response."""
        r = client.post("/chat", json={"messages": [{"role": "user", "content": "test"}]})
        assert r.status_code == 200
        assert r.headers["content-type"] == "text/plain; charset=utf-8"
        # Check we got some streamed content
        assert len(r.text) > 0

    def test_chat_stream_with_history(self, client):
        """Test streaming with conversation history."""
        r = client.post("/chat", json={"messages": [
            {"role": "user", "content": "q1"},
            {"role": "assistant", "content": "a1"},
            {"role": "user", "content": "q2"},
        ]})
        assert r.status_code == 200

    def test_chat_stream_empty_messages_rejected(self, client):
        """Test that empty messages are rejected."""
        r = client.post("/chat", json={"messages": []})
        assert r.status_code == 400

    def test_chat_stream_invalid_format_rejected(self, client):
        """Test that invalid request format is rejected."""
        r = client.post("/chat", json={})
        assert r.status_code == 422

