"""Test script to display reasoning/thinking tokens from Groq GPT-OSS models."""

import os
import json
from dotenv import load_dotenv
from groq import Groq

# Load environment variables from .env file
load_dotenv()

# Load API key from environment
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

def test_with_reasoning():
    """Test a simple query and display the thinking tokens."""
    print("=" * 70)
    print("TESTING GROQ GPT-OSS REASONING TOKENS")
    print("=" * 70)
    print()
    print("Question: What is fair use under US copyright law? Be concise.")
    print()
    
    # Make the API call with include_reasoning=True
    chat_completion = client.chat.completions.create(
        messages=[
            {
                "role": "user",
                "content": "What is fair use under US copyright law? Be concise."
            }
        ],
        model="openai/gpt-oss-120b",  # Or "openai/gpt-oss-20b" for faster test
        temperature=0.6,
        max_completion_tokens=1024,
        stream=False,
        include_reasoning=True,  # This enables thinking tokens
    )
    
    message = chat_completion.choices[0].message
    
    # Write full response to file for inspection
    output_file = "reasoning_output.json"
    with open(output_file, "w", encoding="utf-8") as f:
        result = {
            "content": message.content,
            "reasoning": getattr(message, 'reasoning', None),
            "usage": {
                "prompt_tokens": chat_completion.usage.prompt_tokens,
                "completion_tokens": chat_completion.usage.completion_tokens,
                "total_tokens": chat_completion.usage.total_tokens,
            }
        }
        json.dump(result, f, indent=2, ensure_ascii=False)
    
    # Display thinking tokens
    print("=" * 70)
    print("THINKING TOKENS (Reasoning):")
    print("=" * 70)
    reasoning = getattr(message, 'reasoning', None)
    if reasoning:
        print(reasoning)
    else:
        print("(No reasoning tokens returned)")
    
    # Display final answer
    print()
    print("=" * 70)
    print("FINAL ANSWER:")
    print("=" * 70)
    print(message.content)
    
    # Display token usage
    print()
    print("=" * 70)
    print("TOKEN USAGE:")
    print("=" * 70)
    usage = chat_completion.usage
    print(f"Prompt tokens:     {usage.prompt_tokens}")
    print(f"Completion tokens: {usage.completion_tokens}")
    print(f"Total tokens:      {usage.total_tokens}")
    
    print()
    print(f"Full output saved to: {output_file}")

if __name__ == "__main__":
    test_with_reasoning()
