import os
from typing import Optional, Dict
from langchain_community.vectorstores import FAISS
from pathlib import Path
from app.core.embedding_factory import get_embeddings


# Check if Supabase pgvector is available for persistent storage
USE_SUPABASE_VECTOR = bool(os.getenv("SUPABASE_DATABASE_URL"))

# Use /tmp for Railway (ephemeral but writable) - must match ingest.py paths
if os.getenv("RAILWAY_ENVIRONMENT"):
    VECTOR_STORE_BASE = Path("/tmp/vector_store")
else:
    VECTOR_STORE_BASE = Path("vector_store")

# Cache for vector databases (user_id -> FAISS instance) - only used for FAISS fallback
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

    Uses Supabase pgvector for persistent storage if available,
    otherwise falls back to FAISS.

    Args:
        query: The search query
        user_id: Optional user ID. If provided, searches in user-specific vector store.
        k: Number of results to retrieve (default: 3)

    Returns:
        Combined context string from retrieved documents.
        Returns empty string if no vector store exists.
    """
    print(f"[RETRIEVAL] Starting retrieval for user: {user_id}, query: {query[:50]}...")
    print(f"[RETRIEVAL] USE_SUPABASE_VECTOR: {USE_SUPABASE_VECTOR}")

    # Use Supabase pgvector if available
    if USE_SUPABASE_VECTOR and user_id:
        try:
            from app.services.supabase_vectorstore import search_similar_chunks, has_user_chunks

            # Check if user has any chunks stored
            has_chunks = has_user_chunks(user_id)
            print(f"[RETRIEVAL] has_user_chunks({user_id}): {has_chunks}")

            if not has_chunks:
                print(f"[RETRIEVAL] No chunks found for user, returning empty")
                return ""

            # Search for similar chunks with lower threshold for debugging
            print(f"[RETRIEVAL] Searching for similar chunks...")
            results = search_similar_chunks(
                query=query,
                user_id=user_id,
                k=k,
                threshold=0.3  # Lowered threshold for better recall
            )

            print(f"[RETRIEVAL] search_similar_chunks returned {len(results) if results else 0} results")

            if not results:
                print(f"[RETRIEVAL] No similar chunks found, returning empty")
                return ""

            # Combine content from results
            context = "\n".join([chunk.content for chunk in results])
            print(f"[RETRIEVAL] Returning context with {len(context)} chars")
            return context

        except Exception as e:
            print(f"⚠️  [RETRIEVAL] Supabase retrieval error: {e}")
            import traceback
            traceback.print_exc()
            # Fall through to FAISS fallback
            pass

    # Fallback to FAISS
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


def has_documents(user_id: str) -> bool:
    """
    Check if a user has any documents/chunks stored.

    Args:
        user_id: The user ID to check

    Returns:
        True if user has documents, False otherwise
    """
    if USE_SUPABASE_VECTOR:
        try:
            from app.services.supabase_vectorstore import has_user_chunks
            return has_user_chunks(user_id)
        except Exception:
            pass

    # Fallback to FAISS check
    if user_id:
        vector_path = VECTOR_STORE_BASE / user_id / "faiss_index"
    else:
        vector_path = VECTOR_STORE_BASE / "faiss_index"

    return vector_path.exists()
