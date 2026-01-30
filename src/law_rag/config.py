"""
Configuration module for the RAG application.

Centralizes all settings, constants, and environment variable loading.
"""

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Final

from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


@dataclass(frozen=True, slots=True)
class GroqConfig:
    """Groq LLM configuration."""

    api_key: str = field(default_factory=lambda: os.getenv("GROQ_API_KEY", ""))
    google_api_key: str = field(default_factory=lambda: os.getenv("GOOGLE_API_KEY", ""))
    model: str = "openai/gpt-oss-120b"  # User requested model
    temperature: float = 0.1
    max_tokens: int = 4096
    context_window: int = 131072  # Llama 4 supports 128k context


@dataclass(frozen=True, slots=True)
class EmbeddingConfig:
    """Embedding configuration."""

    provider: str = field(
        default_factory=lambda: os.getenv("EMBEDDING_PROVIDER", "ollama")
    )

    model: str = "models/text-embedding-004"  # Default for Gemini
    # For Ollama: "embeddinggemma"
    base_url: str = field(
        default_factory=lambda: os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    )
    embed_batch_size: int = 10


@dataclass(frozen=True, slots=True)
class PineconeConfig:
    """Pinecone vector store configuration."""

    api_key: str = field(default_factory=lambda: os.getenv("PINECONE_API_KEY", ""))
    index_name: str = field(
        default_factory=lambda: os.getenv("PINECONE_INDEX_NAME", "law-rag-index")
    )
    dimension: int = 768  # embeddinggemma dimension
    metric: str = "cosine"
    cloud: str = "aws"
    region: str = "us-east-1"


@dataclass(frozen=True, slots=True)
class ChunkingConfig:
    """Document chunking configuration."""

    chunk_size: int = 1024
    chunk_overlap: int = 200


@dataclass(frozen=True, slots=True)
class Settings:
    """Application-wide settings."""

    # Paths
    BASE_DIR: Path = field(default_factory=lambda: Path(__file__).parent.parent.parent)
    DATA_DIR: Path = field(
        default_factory=lambda: Path(__file__).parent.parent.parent / "data"
    )
    SOURCE_DIR: Path = field(
        default_factory=lambda: Path(__file__).parent.parent.parent
        / "data"
        / "USCODE-2023-title17"
        / "html"
    )

    # Component configs
    groq: GroqConfig = field(default_factory=GroqConfig)
    embedding: EmbeddingConfig = field(default_factory=EmbeddingConfig)
    pinecone: PineconeConfig = field(default_factory=PineconeConfig)
    chunking: ChunkingConfig = field(default_factory=ChunkingConfig)

    # RAG settings
    similarity_top_k: int = 3  # Retrieve more chunks for better coverage
    response_mode: str = "compact"  # LlamaIndex response synthesis mode
    chunk_preview_length: int = 150  # Characters to show in chunk preview

    def validate(self) -> None:
        """Validate that all required configuration is present."""
        missing = []

        if not self.groq.api_key:
            missing.append("GROQ_API_KEY")
        if not self.pinecone.api_key:
            missing.append("PINECONE_API_KEY")

        if missing:
            raise ValueError(
                f"Missing required environment variables: {', '.join(missing)}. "
                "Please copy .env.example to .env and fill in your API keys."
            )


# Singleton instance
settings: Final[Settings] = Settings()
