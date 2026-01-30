"""
Document ingestion module.

Handles loading, cleaning, chunking, and indexing documents into Pinecone.
"""

from pathlib import Path
from typing import Optional
from concurrent.futures import ProcessPoolExecutor

from llama_index.core import (
    Document,
    Settings as LlamaSettings,
    StorageContext,
    VectorStoreIndex,
)
# from llama_index.embeddings.ollama import OllamaEmbedding
# from llama_index.embeddings.gemini import GeminiEmbedding
from law_rag.light_gemini import LightweightGeminiEmbedding
from llama_index.vector_stores.pinecone import PineconeVectorStore
from pinecone import Pinecone, ServerlessSpec

from law_rag.config import settings
from law_rag.utils import clean_html_text


class DocumentIngestionPipeline:
    """Pipeline for ingesting documents into the vector store."""
    
    def __init__(self) -> None:
        """Initialize the ingestion pipeline."""
        settings.validate()
        self._setup_embedding_model()
        self._setup_pinecone()
    
    def _setup_embedding_model(self) -> None:
        """Configure the embedding model."""
        # if settings.embedding.provider == "gemini":
        print("Using Google Gemini Embeddings (Lightweight)")
        self.embed_model = LightweightGeminiEmbedding(
            model_name=settings.embedding.model,
            api_key=settings.groq.google_api_key,
        )
        # else:
        #     print("Using Ollama Embeddings")
        #     self.embed_model = OllamaEmbedding(
        #         model_name=settings.embedding.model,
        #         base_url=settings.embedding.base_url,
        #     )
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
        """Load and clean documents from source directory utilizing parallel processing."""
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
        raw_documents = reader.load_data()
        
        # Separate HTML and other documents
        html_docs = []
        other_docs = []
        
        for doc in raw_documents:
            file_path = doc.metadata.get("file_path", "")
            if file_path.endswith((".html", ".htm")):
                html_docs.append(doc)
            else:
                other_docs.append(doc)
        
        # Process HTML documents in parallel
        processed_html_docs = []
        if html_docs:
            print(f"Processing {len(html_docs)} HTML documents in parallel...")
            with ProcessPoolExecutor() as executor:
                # We map only the text content to keep pickle payload small and simple
                clean_texts = list(executor.map(clean_html_text, [d.text for d in html_docs]))
            
            for doc, clean_text in zip(html_docs, clean_texts):
                processed_html_docs.append(Document(text=clean_text, metadata=doc.metadata))
        
        documents = processed_html_docs + other_docs
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
