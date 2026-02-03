import requests
import time

BASE_URL = "http://localhost:8001"

TEST_CASES = [
    {
        "name": "Identity Check (General Knowledge)",
        "query": "Who are you?",
        "model": "openai/gpt-oss-120b",
        "expected_behavior": "Should identify as US Law Expert, NOT refuse."
    },
    {
        "name": "Specific RAG Query (Title 17)",
        "query": "What are the four factors of fair use?",
        "model": "openai/gpt-oss-120b",
        "expected_behavior": "Should explicitly list the 4 factors from Section 107."
    },
    {
        "name": "General Legal Concept (Mixed)",
        "query": "Explain the difference between a copyright and a trademark.",
        "model": "moonshotai/kimi-k2-instruct-0905",
        "expected_behavior": "Should explain using general knowledge/context, confirming model switch."
    }
]

def run_tests():
    print(f"🚀 Starting System Capability Test against {BASE_URL}...\n")
    
    for test in TEST_CASES:
        print(f"📋 Test: {test['name']}")
        print(f"   Query: {test['query']}")
        print(f"   Model: {test['model']}")
        print(f"   Expect: {test['expected_behavior']}")
        
        payload = {
            "messages": [{"role": "user", "content": test["query"]}],
            "model": test["model"]
        }
        
        try:
            start_time = time.time()
            resp = requests.post(f"{BASE_URL}/query", json=payload)
            duration = time.time() - start_time
            
            if resp.status_code == 200:
                data = resp.json()
                answer = data.get("answer", "")
                sources = data.get("sources", [])
                
                print(f"✅ Success ({duration:.2f}s)")
                print(f"   Answer Preview: {answer[:150]}...")
                print(f"   Sources Found: {len(sources)}")
                if sources:
                    print(f"   Top Source: {sources[0]['file_path'].split('/')[-1]}")
            else:
                print(f"❌ Failed ({resp.status_code}): {resp.text}")
                
        except Exception as e:
            print(f"❌ Connection Error: {e}")
            
        print("-" * 60 + "\n")

if __name__ == "__main__":
    run_tests()
