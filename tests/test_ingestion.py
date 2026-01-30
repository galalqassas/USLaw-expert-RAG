"""Tests for the document ingestion pipeline with mocked external services."""

from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from llama_index.core.embeddings import BaseEmbedding


class MockEmbedding(BaseEmbedding):
    """Mock embedding that satisfies LlamaIndex type checks."""

    def _get_text_embedding(self, text: str) -> list[float]:
        return [0.0] * 768

    def _get_query_embedding(self, query: str) -> list[float]:
        return [0.0] * 768

    async def _aget_query_embedding(self, query: str) -> list[float]:
        return [0.0] * 768


@pytest.fixture
def mock_dependencies():
    """Mock all external dependencies for DocumentIngestionPipeline."""
    with (
        patch("law_rag.ingestion.Pinecone") as mock_pc,
        patch(
            "law_rag.ingestion.LightweightGeminiEmbedding", return_value=MockEmbedding()
        ),
        patch("law_rag.ingestion.settings") as mock_settings,
    ):
        # Configure mock settings
        mock_settings.pinecone.api_key = "test-key"
        mock_settings.pinecone.index_name = "test-index"
        mock_settings.pinecone.dimension = 768
        mock_settings.pinecone.metric = "cosine"
        mock_settings.pinecone.cloud = "aws"
        mock_settings.pinecone.region = "us-east-1"
        mock_settings.embedding.model = "nomic-embed-text"
        mock_settings.embedding.base_url = "http://localhost:11434"
        mock_settings.groq.google_api_key = "test-google-key"
        mock_settings.SOURCE_DIR = Path("data")
        mock_settings.chunking.chunk_size = 512
        mock_settings.chunking.chunk_overlap = 50
        mock_settings.validate = MagicMock()

        # Configure mock Pinecone client
        mock_index = MagicMock()
        mock_index.name = "test-index"
        mock_pc_instance = mock_pc.return_value
        mock_pc_instance.list_indexes.return_value = [mock_index]
        mock_pc_instance.Index.return_value = MagicMock()

        yield {
            "pinecone": mock_pc,
            "pc_instance": mock_pc_instance,
            "settings": mock_settings,
        }


@pytest.fixture
def pipeline(mock_dependencies):
    """Create pipeline with mocked dependencies."""
    from law_rag.ingestion import DocumentIngestionPipeline

    return DocumentIngestionPipeline()


class TestDocumentIngestionPipeline:
    """Tests for DocumentIngestionPipeline."""

    def test_pinecone_connection(self, mock_dependencies, pipeline):
        """Test that pipeline connects to Pinecone with configured API key."""
        mock_dependencies["pinecone"].assert_called_once_with(api_key="test-key")

    def test_get_existing_index(self, mock_dependencies, pipeline):
        """Test connecting to existing Pinecone index."""
        with (
            patch("law_rag.ingestion.PineconeVectorStore"),
            patch("law_rag.ingestion.VectorStoreIndex") as mock_index,
        ):
            mock_index.from_vector_store.return_value = MagicMock()
            result = pipeline.get_existing_index()
            assert result is not None
            mock_index.from_vector_store.assert_called_once()

    def test_load_documents(self, mock_dependencies, pipeline, tmp_path):
        """Test loading documents from directory."""
        # Create a test file
        test_file = tmp_path / "test.txt"
        test_file.write_text("Test content")

        with patch("llama_index.core.readers.SimpleDirectoryReader") as mock_reader:
            mock_doc = MagicMock()
            mock_doc.text = "Test content"
            mock_doc.metadata = {"file_path": str(test_file)}
            mock_reader.return_value.load_data.return_value = [mock_doc]

            documents = pipeline.load_documents(source_dir=tmp_path)
            assert len(documents) == 1

    def test_run_uses_existing_index(self, mock_dependencies, pipeline):
        """Test that run() uses existing index when vectors are present."""
        # Configure mock to indicate existing vectors
        pipeline.pinecone_index.describe_index_stats.return_value = MagicMock(
            total_vector_count=100
        )

        with (
            patch("law_rag.ingestion.PineconeVectorStore"),
            patch("law_rag.ingestion.VectorStoreIndex") as mock_index,
        ):
            mock_index.from_vector_store.return_value = MagicMock()
            result = pipeline.run(force_reindex=False)
            assert result is not None
            # Should not call from_documents since index exists
            mock_index.from_documents.assert_not_called()

    def test_run_force_reindex(self, mock_dependencies, pipeline, tmp_path):
        """Test that force_reindex=True rebuilds the index."""
        pipeline.pinecone_index.describe_index_stats.return_value = MagicMock(
            total_vector_count=100
        )

        test_file = tmp_path / "test.txt"
        test_file.write_text("Test content")

        with (
            patch("llama_index.core.readers.SimpleDirectoryReader") as mock_reader,
            patch("law_rag.ingestion.PineconeVectorStore"),
            patch("law_rag.ingestion.VectorStoreIndex") as mock_index,
            patch("law_rag.ingestion.LlamaSettings"),
        ):
            mock_doc = MagicMock()
            mock_doc.text = "Test content"
            mock_doc.metadata = {"file_path": str(test_file)}
            mock_reader.return_value.load_data.return_value = [mock_doc]
            mock_index.from_documents.return_value = MagicMock()

            mock_dependencies["settings"].SOURCE_DIR = tmp_path

            result = pipeline.run(force_reindex=True)
            assert result is not None
            mock_index.from_documents.assert_called_once()

    def test_load_documents_processes_html(self, mock_dependencies, pipeline, tmp_path):
        """Test that HTML documents are processed through clean_html_text."""
        with (
            patch("llama_index.core.readers.SimpleDirectoryReader") as mock_reader,
            patch("law_rag.ingestion.clean_html_text"),
            patch("law_rag.ingestion.ProcessPoolExecutor") as mock_executor,
        ):
            mock_html_doc = MagicMock()
            mock_html_doc.text = "<p>HTML content</p>"
            mock_html_doc.metadata = {"file_path": "test.html"}

            mock_txt_doc = MagicMock()
            mock_txt_doc.text = "Plain text"
            mock_txt_doc.metadata = {"file_path": "test.txt"}

            mock_reader.return_value.load_data.return_value = [
                mock_html_doc,
                mock_txt_doc,
            ]

            # Mock the executor.map to return cleaned text
            mock_executor.return_value.__enter__.return_value.map.return_value = [
                "Cleaned HTML content"
            ]

            documents = pipeline.load_documents(source_dir=tmp_path)

            # Verify clean_html_text was called via executor.map
            mock_executor.return_value.__enter__.return_value.map.assert_called_once()
            assert len(documents) == 2

    def test_load_documents_not_found(self, mock_dependencies, pipeline):
        """Test that FileNotFoundError is raised for missing directory."""
        with pytest.raises(FileNotFoundError):
            pipeline.load_documents(source_dir=Path("/nonexistent/path"))

    def test_creates_pinecone_index_if_not_exists(self, mock_dependencies):
        """Test that a new Pinecone index is created if it doesn't exist."""
        # Configure mock to indicate no existing indexes
        mock_dependencies["pc_instance"].list_indexes.return_value = []

        from law_rag.ingestion import DocumentIngestionPipeline

        with patch(
            "law_rag.ingestion.LightweightGeminiEmbedding", return_value=MockEmbedding()
        ):
            DocumentIngestionPipeline()

        # Verify create_index was called
        mock_dependencies["pc_instance"].create_index.assert_called_once()
