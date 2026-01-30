"""
RAG Evaluation Module.

Evaluates the RAG system using RAGAS metrics:
- Faithfulness: Is the answer grounded in the retrieved context?
- Answer Relevancy: Does the answer address the question?
- Context Precision: Are retrieved chunks relevant?
- Context Recall: Did retrieval find all necessary information?
"""

import json
import time
from datetime import datetime
from pathlib import Path

from datasets import Dataset
from ragas import evaluate
from ragas.metrics import (
    faithfulness,
    answer_relevancy,
    context_precision,
    context_recall,
)

from law_rag.config import settings


def load_evaluation_dataset(path: Path | None = None) -> list[dict]:
    """Load the golden evaluation dataset."""
    if path is None:
        path = settings.BASE_DIR / "data" / "evaluation_set.json"
    
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data["test_cases"]


def run_rag_inference(engine, test_cases: list[dict]) -> list[dict]:
    """Run RAG inference on all test cases and collect results."""
    results = []
    
    for i, case in enumerate(test_cases, 1):
        question = case["question"]
        print(f"\n[{i}/{len(test_cases)}] Processing: {question[:60]}...")
        
        start_time = time.perf_counter()
        
        # Get RAG response with sources
        response_data = engine.query_with_sources(question)
        
        elapsed = time.perf_counter() - start_time
        
        # Extract contexts from retrieved chunks
        contexts = [chunk["text"] for chunk in response_data["sources"]]
        
        results.append({
            "question": question,
            "answer": response_data["response"],
            "contexts": contexts,
            "ground_truth": case["ground_truth"],
            "source_section": case.get("source_section", ""),
            "latency_seconds": round(elapsed, 3),
        })
        
        print(f"    ✓ Completed in {elapsed:.2f}s")
    
    return results


from langchain_groq import ChatGroq
from langchain_community.embeddings import OllamaEmbeddings

def evaluate_with_ragas(results: list[dict]) -> dict:
    """Evaluate results using RAGAS metrics."""
    print("\n" + "=" * 60)
    print("📊 Running RAGAS Evaluation...")
    print("=" * 60)
    
    # Prepare dataset for RAGAS
    eval_data = {
        "question": [r["question"] for r in results],
        "answer": [r["answer"] for r in results],
        "contexts": [r["contexts"] for r in results],
        "ground_truth": [r["ground_truth"] for r in results],
    }
    
    dataset = Dataset.from_dict(eval_data)
    
    # Initialize Groq LLM and Ollama Embeddings
    judge_llm = ChatGroq(
        model=settings.groq.model,
        api_key=settings.groq.api_key,
        temperature=0.0
    )
    
    embeddings = OllamaEmbeddings(
        base_url=settings.embedding.base_url,
        model=settings.embedding.model
    )
    
    # Run evaluation
    metrics = [faithfulness, answer_relevancy, context_precision, context_recall]
    
    try:
        eval_result = evaluate(
            dataset, 
            metrics=metrics,
            llm=judge_llm, 
            embeddings=embeddings
        )
        scores = {
            "faithfulness": float(eval_result["faithfulness"]),
            "answer_relevancy": float(eval_result["answer_relevancy"]),
            "context_precision": float(eval_result["context_precision"]),
            "context_recall": float(eval_result["context_recall"]),
        }
    except Exception as e:
        print(f"⚠️  RAGAS evaluation failed: {e}")
        print("    Falling back to manual metrics...")
        scores = calculate_fallback_metrics(results)
    
    return scores


def calculate_fallback_metrics(results: list[dict]) -> dict:
    """Calculate basic metrics when RAGAS is unavailable."""
    # Simple heuristic metrics
    total = len(results)
    
    # Check if answers contain content from contexts (crude faithfulness)
    faithfulness_score = sum(
        1 for r in results 
        if any(ctx[:50].lower() in r["answer"].lower() for ctx in r["contexts"] if ctx)
    ) / total if total > 0 else 0
    
    # Check if answers are non-empty and substantial
    relevancy_score = sum(
        1 for r in results 
        if len(r["answer"]) > 50
    ) / total if total > 0 else 0
    
    # Check if contexts were retrieved
    precision_score = sum(
        1 for r in results 
        if len(r["contexts"]) > 0
    ) / total if total > 0 else 0
    
    return {
        "faithfulness": round(faithfulness_score, 4),
        "answer_relevancy": round(relevancy_score, 4),
        "context_precision": round(precision_score, 4),
        "context_recall": 0.0,  # Cannot calculate without RAGAS
    }


def generate_report(results: list[dict], scores: dict, output_dir: Path) -> Path:
    """Generate evaluation report and save results."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Calculate aggregate stats
    avg_latency = sum(r["latency_seconds"] for r in results) / len(results)
    
    report = {
        "timestamp": datetime.now().isoformat(),
        "total_questions": len(results),
        "aggregate_metrics": {
            **scores,
            "average_latency_seconds": round(avg_latency, 3),
        },
        "detailed_results": results,
    }
    
    # Save JSON report
    output_file = output_dir / f"evaluation_results_{timestamp}.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    
    # Print summary
    print("\n" + "=" * 60)
    print("📈 EVALUATION RESULTS")
    print("=" * 60)
    print(f"\n{'Metric':<25} {'Score':<10}")
    print("-" * 35)
    for metric, score in scores.items():
        status = "✅" if score >= 0.7 else "⚠️" if score >= 0.5 else "❌"
        print(f"{metric:<25} {score:.4f}    {status}")
    print("-" * 35)
    print(f"{'Average Latency':<25} {avg_latency:.3f}s")
    print(f"\n📁 Full report saved to: {output_file}")
    
    return output_file


def run_evaluation(engine=None, dataset_path: Path | None = None) -> dict:
    """Main evaluation entry point."""
    print("\n" + "=" * 60)
    print("⚖️  US Copyright Law RAG - Evaluation Suite")
    print("=" * 60)
    
    # Load dataset
    test_cases = load_evaluation_dataset(dataset_path)
    print(f"\n✓ Loaded {len(test_cases)} test cases")
    
    # Initialize engine if not provided
    if engine is None:
        print("\n🔧 Initializing RAG engine...")
        from law_rag.ingestion import DocumentIngestionPipeline
        from law_rag.query_engine import RAGQueryEngine
        
        pipeline = DocumentIngestionPipeline()
        index = pipeline.run(force_reindex=False)
        engine = RAGQueryEngine(index)
        print("✓ Engine ready")
    
    # Run inference
    print("\n🔍 Running RAG inference on test cases...")
    results = run_rag_inference(engine, test_cases)
    
    # Evaluate with RAGAS
    scores = evaluate_with_ragas(results)
    
    # Generate report
    output_dir = settings.BASE_DIR / "logs"
    output_dir.mkdir(exist_ok=True)
    report_path = generate_report(results, scores, output_dir)
    
    return {
        "scores": scores,
        "report_path": str(report_path),
        "total_questions": len(test_cases),
    }


if __name__ == "__main__":
    run_evaluation()
