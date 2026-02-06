"""Document ingestion module - loading, cleaning, chunking, and indexing into Pinecone."""

from concurrent.futures import ProcessPoolExecutor
from pathlib import Path
from typing import Optional

from llama_index.core import (
    Document,
    StorageContext,
    VectorStoreIndex,
)
from llama_index.core.node_parser import SentenceSplitter
from llama_index.vector_stores.pinecone import PineconeVectorStore
from pinecone import Pinecone, ServerlessSpec

from law_rag.config import settings
from law_rag.light_gemini import LightweightGeminiEmbedding
from law_rag.utils import clean_html_text


class DocumentIngestionPipeline:
    """Pipeline for ingesting documents into the vector store."""

    def __init__(self) -> None:
        settings.validate()
        self._setup_embedding_model()
        self._setup_pinecone()

    def _setup_embedding_model(self) -> None:
        print("Using Google Gemini Embeddings (Lightweight)")
        self.embed_model = LightweightGeminiEmbedding(
            model_name=settings.embedding.model,
            api_key=settings.groq.google_api_key,
        )

    def _setup_pinecone(self) -> None:
        self.pc = Pinecone(api_key=settings.pinecone.api_key)
        existing = [idx.name for idx in self.pc.list_indexes()]

        if settings.pinecone.index_name not in existing:
            print(f"Creating Pinecone index: {settings.pinecone.index_name}")
            self.pc.create_index(
                name=settings.pinecone.index_name,
                dimension=settings.pinecone.dimension,
                metric=settings.pinecone.metric,
                spec=ServerlessSpec(
                    cloud=settings.pinecone.cloud, region=settings.pinecone.region
                ),
            )
        self.pinecone_index = self.pc.Index(settings.pinecone.index_name)

    def load_documents(self, source_dir: Optional[Path] = None) -> list[Document]:
        """Load and clean documents from source directory with parallel HTML processing."""
        directory = source_dir or settings.SOURCE_DIR
        if not directory.exists():
            raise FileNotFoundError(f"Source directory not found: {directory}")

        print(f"Loading documents from: {directory}")
        from llama_index.core.readers import SimpleDirectoryReader

        reader = SimpleDirectoryReader(
            input_dir=str(directory),
            recursive=True,
            required_exts=[".html", ".htm", ".pdf", ".txt"],
        )
        raw_docs = reader.load_data()

        # Separate HTML from other docs
        html_docs = [
            d
            for d in raw_docs
            if d.metadata.get("file_path", "").endswith((".html", ".htm"))
        ]
        other_docs = [d for d in raw_docs if d not in html_docs]

        # Process HTML in parallel
        processed = []
        if html_docs:
            print(f"Processing {len(html_docs)} HTML documents in parallel...")
            with ProcessPoolExecutor() as executor:
                clean_texts = list(
                    executor.map(clean_html_text, [d.text for d in html_docs])
                )
            processed = [
                Document(text=t, metadata=d.metadata)
                for d, t in zip(html_docs, clean_texts)
            ]

        documents = processed + other_docs
        print(f"Loaded {len(documents)} documents")
        return documents

    def create_index(self, documents: list[Document]) -> VectorStoreIndex:
        """Create vector index from documents."""
        text_splitter = SentenceSplitter(
            chunk_size=settings.chunking.chunk_size,
            chunk_overlap=settings.chunking.chunk_overlap,
        )
        
        vector_store = PineconeVectorStore(pinecone_index=self.pinecone_index)
        storage_context = StorageContext.from_defaults(vector_store=vector_store)

        print(f"Indexing {len(documents)} documents into Pinecone...")
        index = VectorStoreIndex.from_documents(
            documents,
            storage_context=storage_context,
            embed_model=self.embed_model,
            transformations=[text_splitter],
            show_progress=True
        )
        print("Indexing complete!")
        return index

    def get_existing_index(self) -> VectorStoreIndex:
        """Connect to existing Pinecone index."""
        vector_store = PineconeVectorStore(pinecone_index=self.pinecone_index)
        return VectorStoreIndex.from_vector_store(
            vector_store, embed_model=self.embed_model
        )

    def run(self, force_reindex: bool = False) -> VectorStoreIndex:
        """Execute ingestion pipeline."""
        stats = self.pinecone_index.describe_index_stats()
        if stats.total_vector_count > 0 and not force_reindex:
            print(f"Using existing index with {stats.total_vector_count} vectors")
            return self.get_existing_index()
        return self.create_index(self.load_documents())
