"""Tests for configuration module."""

import os
from unittest.mock import patch

import pytest
from law_rag.config import Settings, GroqConfig, PineconeConfig


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
