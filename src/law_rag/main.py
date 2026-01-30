"""
Main entry point for the RAG application.

Provides CLI interface for indexing and querying.
"""

import argparse
import sys

from law_rag.ingestion import DocumentIngestionPipeline
from law_rag.query_engine import RAGQueryEngine


def ingest_documents(force: bool = False) -> None:
    """Run document ingestion pipeline."""
    print("=" * 50)
    print("Document Ingestion Pipeline")
    print("=" * 50)

    pipeline = DocumentIngestionPipeline()
    pipeline.run(force_reindex=force)

    print("\n✓ Ingestion complete!")


def interactive_query() -> None:
    """Run interactive query session."""
    print("=" * 50)
    print("US Copyright Law RAG Assistant")
    print("=" * 50)
    print("\nConnecting to index...")

    pipeline = DocumentIngestionPipeline()
    index = pipeline.run(force_reindex=False)

    engine = RAGQueryEngine(index)

    print("\n✓ Ready! Ask questions about US Copyright Law (Title 17).")
    print("  Type 'quit' or 'exit' to end the session.\n")

    while True:
        try:
            question = input("\n📝 Your question: ").strip()

            if not question:
                continue

            if question.lower() in ("quit", "exit", "q"):
                print("\nGoodbye!")
                break

            print("\n🔍 Searching and generating response...\n")
            response = engine.query(question, verbose=True)
            print(f"\n💬 Answer:\n{response}")

        except KeyboardInterrupt:
            print("\n\nInterrupted. Goodbye!")
            break


def single_query(question: str) -> None:
    """Execute a single query and exit."""
    pipeline = DocumentIngestionPipeline()
    index = pipeline.run(force_reindex=False)

    engine = RAGQueryEngine(index)
    response = engine.query(question, verbose=True)

    print(f"\n{response}")


def main() -> None:
    """Main entry point with argument parsing."""
    parser = argparse.ArgumentParser(
        description="US Copyright Law RAG System",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  uv run python -m law_rag.main                    # Interactive mode
  uv run python -m law_rag.main --ingest           # Index documents
  uv run python -m law_rag.main --ingest --force   # Force re-index
  uv run python -m law_rag.main -q "What is fair use?"  # Single query
  uv run python -m law_rag.main --evaluate         # Run evaluation suite
  uv run python -m law_rag.main --serve            # Start API server
  uv run python -m law_rag.main --serve --port 8080  # Custom port
        """,
    )

    parser.add_argument(
        "--ingest",
        action="store_true",
        help="Run document ingestion pipeline",
    )

    parser.add_argument(
        "--force",
        action="store_true",
        help="Force re-indexing of all documents",
    )

    parser.add_argument(
        "-q",
        "--query",
        type=str,
        help="Execute a single query and exit",
    )

    parser.add_argument(
        "--evaluate",
        action="store_true",
        help="Run the RAG evaluation suite",
    )

    parser.add_argument(
        "--serve",
        action="store_true",
        help="Start the FastAPI server",
    )

    parser.add_argument(
        "--port",
        type=int,
        default=8000,
        help="Port for the API server (default: 8000)",
    )

    args = parser.parse_args()

    try:
        if args.ingest:
            ingest_documents(force=args.force)
        elif args.query:
            single_query(args.query)
        elif args.evaluate:
            from law_rag.evaluate import run_evaluation

            run_evaluation()
        elif args.serve:
            import uvicorn

            print(f"🚀 Starting API server on http://localhost:{args.port}")
            uvicorn.run("law_rag.api:app", host="0.0.0.0", port=args.port, reload=True)
        else:
            interactive_query()
    except ValueError as e:
        print(f"\n❌ Configuration Error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
