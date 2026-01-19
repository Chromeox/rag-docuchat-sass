from typing import Optional, Dict
from langchain_community.vectorstores import FAISS
from pathlib import Path
from app.core.embedding_factory import get_embeddings


VECTOR_STORE_BASE = Path("vector_store")

# Cache for vector databases (user_id -> FAISS instance)
_db_cache: Dict[str, FAISS] = {}


def get_vector_db(user_id: Optional[str] = None) -> FAISS:
    """
    Get the vector database for a specific user or the global database.

    Args:
        user_id: Optional user ID. If provided, loads user-specific vector store.
                If None, loads the global vector store.

    Returns:
        FAISS vector database instance

    Raises:
        RuntimeError: If vector store not found
    """
    cache_key = user_id or "global"

    # Return cached instance if available
    if cache_key in _db_cache:
        return _db_cache[cache_key]

    # Determine vector store path
    if user_id:
        vector_path = VECTOR_STORE_BASE / user_id / "faiss_index"
    else:
        vector_path = VECTOR_STORE_BASE / "faiss_index"

    if not vector_path.exists():
        raise RuntimeError(
            f"Vector store not found for {'user ' + user_id if user_id else 'global storage'}. "
            "Please run ingestion first."
        )

    # Load and cache the vector database
    db = FAISS.load_local(
        str(vector_path),
        get_embeddings(),
        allow_dangerous_deserialization=True
    )

    _db_cache[cache_key] = db
    return db


def clear_vector_db_cache(user_id: Optional[str] = None):
    """
    Clear the cached vector database for a specific user or all users.

    Args:
        user_id: Optional user ID. If provided, clears only that user's cache.
                If None, clears the global cache or all caches.
    """
    global _db_cache

    if user_id:
        # Clear specific user's cache
        cache_key = user_id
        if cache_key in _db_cache:
            del _db_cache[cache_key]
    else:
        # Clear all caches
        _db_cache = {}


def retrieve_context(query: str, user_id: Optional[str] = None, k: int = 3) -> str:
    """
    Retrieve context from vector store for a specific user.

    Args:
        query: The search query
        user_id: Optional user ID. If provided, searches in user-specific vector store.
        k: Number of results to retrieve (default: 3)

    Returns:
        Combined context string from retrieved documents.
        Returns empty string if no vector store exists.
    """
    try:
        db = get_vector_db(user_id)
        docs = db.similarity_search(query, k=k)

        # Filter by user_id if provided (additional safety check)
        if user_id:
            docs = [d for d in docs if d.metadata.get("user_id") == user_id]

        return "\n".join([d.page_content for d in docs])
    except RuntimeError:
        # No vector store yet - return empty context
        return ""
