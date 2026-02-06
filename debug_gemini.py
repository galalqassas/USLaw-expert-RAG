
import os
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent / "src"))

from dotenv import load_dotenv
from law_rag.light_gemini import LightweightGeminiEmbedding

load_dotenv()

API_KEY = os.getenv("GOOGLE_API_KEY")

def test_class_embedding():
    print("\n--- Testing LightweightGeminiEmbedding Class ---")
    try:
        embed_model = LightweightGeminiEmbedding(
            model_name="models/gemini-embedding-001",
            api_key=API_KEY,
            output_dimensionality=768
        )
        
        text = "This is a test sentence."
        embedding = embed_model.get_text_embedding(text)
        print(f"Success! Embedding generated. Dimension: {len(embedding)}")
    except Exception as e:
        print(f"Error testing class: {e}")

if __name__ == "__main__":
    test_class_embedding()
