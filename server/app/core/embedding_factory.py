import os

from langchain_openai import OpenAIEmbeddings
from langchain_community.embeddings import (
    HuggingFaceEmbeddings,
    OllamaEmbeddings,
    FastEmbedEmbeddings,
)

def get_embeddings():
    provider = os.getenv("EMBEDDING_PROVIDER", "huggingface").lower()

    if provider == "openai":
        if not os.getenv("OPENAI_API_KEY"):
            raise RuntimeError("OPENAI_API_KEY not set")
        return OpenAIEmbeddings()

    if provider == "ollama":
        return OllamaEmbeddings(
            base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
            model="nomic-embed-text",
        )

    if provider == "fastembed":
        return FastEmbedEmbeddings()

    # Default → HuggingFace
    return HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )
