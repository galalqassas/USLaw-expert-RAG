"""
Document ingestion module.

Handles loading, cleaning, chunking, and indexing documents into Pinecone.
"""

from pathlib import Path
from typing import Optional

from llama_index.core import (
    Document,
    Settings as LlamaSettings,
    StorageContext,
    VectorStoreIndex,
)
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.readers import SimpleDirectoryReader
from llama_index.embeddings.ollama import OllamaEmbedding
from llama_index.vector_stores.pinecone import PineconeVectorStore
from pinecone import Pinecone, ServerlessSpec

from src.config import settings
from src.utils import clean_html_text


class DocumentIngestionPipeline:
    """Pipeline for ingesting documents into the vector store."""
    
    def __init__(self) -> None:
        """Initialize the ingestion pipeline."""
        settings.validate()
        self._setup_embedding_model()
        self._setup_pinecone()
    
    def _setup_embedding_model(self) -> None:
        """Configure the Ollama embedding model."""
        self.embed_model = OllamaEmbedding(
            model_name=settings.embedding.model,
            base_url=settings.embedding.base_url,
        )
        LlamaSettings.embed_model = self.embed_model
    
    def _setup_pinecone(self) -> None:
        """Initialize Pinecone client and create index if needed."""
        self.pc = Pinecone(api_key=settings.pinecone.api_key)
        existing_indexes = [idx.name for idx in self.pc.list_indexes()]
        
        if settings.pinecone.index_name not in existing_indexes:
            print(f"Creating Pinecone index: {settings.pinecone.index_name}")
            self.pc.create_index(
                name=settings.pinecone.index_name,
                dimension=settings.pinecone.dimension,
                metric=settings.pinecone.metric,
                spec=ServerlessSpec(
                    cloud=settings.pinecone.cloud,
                    region=settings.pinecone.region,
                ),
            )
        
        self.pinecone_index = self.pc.Index(settings.pinecone.index_name)
    
    def load_documents(self, source_dir: Optional[Path] = None) -> list[Document]:
        """Load and clean documents from source directory."""
        directory = source_dir or settings.SOURCE_DIR
        
        if not directory.exists():
            raise FileNotFoundError(f"Source directory not found: {directory}")
        
        print(f"Loading documents from: {directory}")
        
        reader = SimpleDirectoryReader(
            input_dir=str(directory),
            recursive=True,
            required_exts=[".html", ".htm", ".pdf", ".txt"],
        )
        raw_documents = reader.load_data()
        
        # Clean HTML documents
        documents = []
        for doc in raw_documents:
            file_path = doc.metadata.get("file_path", "")
            if file_path.endswith((".html", ".htm")):
                clean_text = clean_html_text(doc.text)
                documents.append(Document(text=clean_text, metadata=doc.metadata))
            else:
                documents.append(doc)
        
        print(f"Loaded {len(documents)} documents")
        return documents
    
    def create_index(self, documents: list[Document]) -> VectorStoreIndex:
        """Create vector index from documents."""
        LlamaSettings.text_splitter = SentenceSplitter(
            chunk_size=settings.chunking.chunk_size,
            chunk_overlap=settings.chunking.chunk_overlap,
        )
        
        vector_store = PineconeVectorStore(pinecone_index=self.pinecone_index)
        storage_context = StorageContext.from_defaults(vector_store=vector_store)
        
        print(f"Indexing {len(documents)} documents into Pinecone...")
        
        index = VectorStoreIndex.from_documents(
            documents,
            storage_context=storage_context,
            show_progress=True,
        )
        
        print("Indexing complete!")
        return index
    
    def get_existing_index(self) -> VectorStoreIndex:
        """Connect to existing Pinecone index."""
        vector_store = PineconeVectorStore(pinecone_index=self.pinecone_index)
        return VectorStoreIndex.from_vector_store(vector_store)
    
    def run(self, force_reindex: bool = False) -> VectorStoreIndex:
        """Execute ingestion pipeline."""
        stats = self.pinecone_index.describe_index_stats()
        
        if stats.total_vector_count > 0 and not force_reindex:
            print(f"Using existing index with {stats.total_vector_count} vectors")
            return self.get_existing_index()
        
        documents = self.load_documents()
        return self.create_index(documents)
