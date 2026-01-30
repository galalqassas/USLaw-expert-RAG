"""Tests for the LightweightGeminiEmbedding class."""

from unittest.mock import MagicMock, patch
import pytest


class TestLightweightGeminiEmbedding:
    """Tests for LightweightGeminiEmbedding."""

    @pytest.fixture
    def embedding(self):
        """Create embedding instance with mocked HTTP client."""
        with patch("law_rag.light_gemini.httpx.Client") as mock_client:
            mock_response = MagicMock()
            mock_response.json.return_value = {"embedding": {"values": [0.1, 0.2, 0.3]}}
            mock_client.return_value.__enter__.return_value.post.return_value = (
                mock_response
            )

            from law_rag.light_gemini import LightweightGeminiEmbedding

            return LightweightGeminiEmbedding(api_key="test-key")

    def test_get_query_embedding(self, embedding):
        """Test query embedding uses correct task type."""
        with patch("law_rag.light_gemini.httpx.Client") as mock_client:
            mock_response = MagicMock()
            mock_response.json.return_value = {"embedding": {"values": [0.1, 0.2, 0.3]}}
            mock_client.return_value.__enter__.return_value.post.return_value = (
                mock_response
            )

            result = embedding._get_query_embedding("test query")

            assert result == [0.1, 0.2, 0.3]
            call_kwargs = mock_client.return_value.__enter__.return_value.post.call_args
            assert "RETRIEVAL_QUERY" in str(call_kwargs)

    def test_get_text_embedding(self, embedding):
        """Test text embedding uses correct task type."""
        with patch("law_rag.light_gemini.httpx.Client") as mock_client:
            mock_response = MagicMock()
            mock_response.json.return_value = {"embedding": {"values": [0.4, 0.5, 0.6]}}
            mock_client.return_value.__enter__.return_value.post.return_value = (
                mock_response
            )

            result = embedding._get_text_embedding("test document")

            assert result == [0.4, 0.5, 0.6]
            call_kwargs = mock_client.return_value.__enter__.return_value.post.call_args
            assert "RETRIEVAL_DOCUMENT" in str(call_kwargs)

    def test_uses_env_api_key_when_not_provided(self):
        """Test that API key falls back to environment variable."""
        with patch.dict("os.environ", {"GOOGLE_API_KEY": "env-key"}):
            with patch("law_rag.light_gemini.httpx.Client"):
                from law_rag.light_gemini import LightweightGeminiEmbedding

                embedding = LightweightGeminiEmbedding()
                assert embedding._api_key == "env-key"

    def test_api_url_construction(self):
        """Test correct API URL is constructed."""
        with patch("law_rag.light_gemini.httpx.Client") as mock_client:
            mock_response = MagicMock()
            mock_response.json.return_value = {"embedding": {"values": [0.1]}}
            mock_client.return_value.__enter__.return_value.post.return_value = (
                mock_response
            )

            from law_rag.light_gemini import LightweightGeminiEmbedding

            embedding = LightweightGeminiEmbedding(
                model_name="models/custom-model", api_key="my-key"
            )
            embedding._get_text_embedding("test")

            call_args = mock_client.return_value.__enter__.return_value.post.call_args
            url = call_args[0][0]
            assert "models/custom-model:embedContent" in url
            assert "key=my-key" in url
