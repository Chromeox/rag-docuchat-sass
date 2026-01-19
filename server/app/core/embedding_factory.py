import os

from langchain_openai import OpenAIEmbeddings

def get_embeddings():
    """
    Get embeddings instance for RAG.
    Uses OpenAI embeddings (text-embedding-3-small) for production.
    Requires OPENAI_API_KEY environment variable.
    """
    if not os.getenv("OPENAI_API_KEY"):
        raise RuntimeError(
            "OPENAI_API_KEY not set. "
            "OpenAI embeddings are required for production deployment. "
            "Cost: ~$0.002 per document embedded."
        )

    return OpenAIEmbeddings(model="text-embedding-3-small")
