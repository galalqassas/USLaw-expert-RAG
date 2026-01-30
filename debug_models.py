from llama_index.llms.openai.utils import ALL_AVAILABLE_MODELS, CHAT_MODELS

print(f"Type of ALL_AVAILABLE_MODELS: {type(ALL_AVAILABLE_MODELS)}")
try:
    first_item = list(ALL_AVAILABLE_MODELS.items())[0]
    print(f"Sample item from ALL_AVAILABLE_MODELS: {first_item}")
except IndexError:
    print("ALL_AVAILABLE_MODELS is empty")

print(f"Type of CHAT_MODELS: {type(CHAT_MODELS)}")
try:
    print(f"Sample item from CHAT_MODELS: {list(CHAT_MODELS)[0]}")
except IndexError:
    print("CHAT_MODELS is empty")
