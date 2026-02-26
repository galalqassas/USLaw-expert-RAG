"""Tests for configuration module."""

import os
from pathlib import Path
from unittest.mock import patch

import pytest
from law_rag.config import Settings, GroqConfig, PineconeConfig, EmbeddingConfig, ChunkingConfig


class TestSettingsValidation:
    """Tests for Settings.validate() method."""

    def test_validate_raises_on_missing_keys(self):
        """Validation fails when API keys are missing."""
        with patch.dict(
            os.environ, {"GROQ_API_KEY": "", "PINECONE_API_KEY": ""}, clear=False
        ):
            settings = Settings(
                groq=GroqConfig(),
                pinecone=PineconeConfig(),
            )
            with pytest.raises(ValueError):
                settings.validate()

    def test_validate_passes_with_env_keys(self):
        """Validation passes when API keys are set via environment."""
        with patch.dict(
            os.environ,
            {
                "GROQ_API_KEY": "test-placeholder",
                "PINECONE_API_KEY": "test-placeholder",
            },
        ):
            Settings().validate()

    def test_validate_raises_on_missing_groq_key_only(self):
        """Validation fails when only GROQ_API_KEY is missing."""
        with patch.dict(
            os.environ,
            {"GROQ_API_KEY": "", "PINECONE_API_KEY": "valid-key"},
            clear=False,
        ):
            settings = Settings(groq=GroqConfig(), pinecone=PineconeConfig())
            with pytest.raises(ValueError, match="GROQ_API_KEY"):
                settings.validate()

    def test_validate_raises_on_missing_pinecone_key_only(self):
        """Validation fails when only PINECONE_API_KEY is missing."""
        with patch.dict(
            os.environ,
            {"GROQ_API_KEY": "valid-key", "PINECONE_API_KEY": ""},
            clear=False,
        ):
            settings = Settings(groq=GroqConfig(), pinecone=PineconeConfig())
            with pytest.raises(ValueError, match="PINECONE_API_KEY"):
                settings.validate()

    def test_validate_error_message_lists_missing_keys(self):
        """Validation error message lists all missing keys."""
        with patch.dict(
            os.environ, {"GROQ_API_KEY": "", "PINECONE_API_KEY": ""}, clear=False
        ):
            settings = Settings(groq=GroqConfig(), pinecone=PineconeConfig())
            with pytest.raises(ValueError) as exc_info:
                settings.validate()
            msg = str(exc_info.value)
            assert "GROQ_API_KEY" in msg
            assert "PINECONE_API_KEY" in msg


class TestGroqConfigDefaults:
    """Tests for GroqConfig default values."""

    def test_default_model(self):
        """GroqConfig has expected default model."""
        config = GroqConfig()
        assert config.model == "openai/gpt-oss-120b"

    def test_default_temperature(self):
        assert GroqConfig().temperature == 0.1

    def test_default_max_tokens(self):
        assert GroqConfig().max_tokens == 4096

    def test_default_context_window(self):
        assert GroqConfig().context_window == 131072

    def test_api_key_from_env(self):
        """API key is read from GROQ_API_KEY environment variable."""
        with patch.dict(os.environ, {"GROQ_API_KEY": "my-groq-key"}, clear=False):
            config = GroqConfig()
            assert config.api_key == "my-groq-key"

    def test_google_api_key_from_env(self):
        """Google API key is read from GOOGLE_API_KEY environment variable."""
        with patch.dict(os.environ, {"GOOGLE_API_KEY": "my-google-key"}, clear=False):
            config = GroqConfig()
            assert config.google_api_key == "my-google-key"


class TestPineconeConfigDefaults:
    """Tests for PineconeConfig default values."""

    def test_default_index_name(self):
        env = {k: v for k, v in os.environ.items() if k != "PINECONE_INDEX_NAME"}
        with patch.dict(os.environ, env, clear=True):
            config = PineconeConfig()
            assert config.index_name == "law-rag-index"

    def test_index_name_from_env(self):
        with patch.dict(
            os.environ, {"PINECONE_INDEX_NAME": "custom-index"}, clear=False
        ):
            config = PineconeConfig()
            assert config.index_name == "custom-index"

    def test_default_dimension(self):
        assert PineconeConfig().dimension == 768

    def test_default_metric(self):
        assert PineconeConfig().metric == "cosine"

    def test_default_cloud_and_region(self):
        config = PineconeConfig()
        assert config.cloud == "aws"
        assert config.region == "us-east-1"


class TestEmbeddingConfigDefaults:
    """Tests for EmbeddingConfig default values."""

    def test_default_model(self):
        assert EmbeddingConfig().model == "models/gemini-embedding-001"

    def test_default_dimension(self):
        assert EmbeddingConfig().dimension == 768

    def test_default_embed_batch_size(self):
        assert EmbeddingConfig().embed_batch_size == 10

    def test_base_url_from_env(self):
        with patch.dict(
            os.environ, {"OLLAMA_BASE_URL": "http://custom:11434"}, clear=False
        ):
            config = EmbeddingConfig()
            assert config.base_url == "http://custom:11434"


class TestChunkingConfigDefaults:
    """Tests for ChunkingConfig default values."""

    def test_default_chunk_size(self):
        assert ChunkingConfig().chunk_size == 1024

    def test_default_chunk_overlap(self):
        assert ChunkingConfig().chunk_overlap == 200


class TestSettingsPaths:
    """Tests for Settings path configuration."""

    def test_base_dir_is_path(self):
        settings = Settings()
        assert isinstance(settings.BASE_DIR, Path)

    def test_data_dir_is_under_base_dir(self):
        settings = Settings()
        assert settings.DATA_DIR.parent == settings.BASE_DIR

    def test_source_dir_is_under_data_dir(self):
        settings = Settings()
        assert str(settings.DATA_DIR) in str(settings.SOURCE_DIR)

    def test_rag_defaults(self):
        settings = Settings()
        assert settings.similarity_top_k == 3
        assert settings.response_mode == "compact"
        assert settings.chunk_preview_length == 150

    def test_system_prompt_is_not_empty(self):
        assert len(Settings().system_prompt) > 0

    def test_qa_template_contains_placeholders(self):
        template = Settings().qa_template
        assert "{context_str}" in template
        assert "{query_str}" in template
