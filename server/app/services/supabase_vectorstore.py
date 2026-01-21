"""
Supabase pgvector-based vector store service.

This module provides persistent vector storage using Supabase's PostgreSQL
with pgvector extension, replacing the ephemeral FAISS storage.
"""

import os
from typing import List, Optional, Dict, Any
from dataclasses import dataclass
import psycopg2
from psycopg2.extras import execute_values, Json
from app.core.embedding_factory import get_embeddings


@dataclass
class DocumentChunk:
    """Represents a document chunk with its embedding."""
    content: str
    metadata: Dict[str, Any]
    embedding: Optional[List[float]] = None
    id: Optional[int] = None
    similarity: Optional[float] = None


def get_supabase_connection():
    """
    Get a connection to Supabase PostgreSQL.

    Uses SUPABASE_DATABASE_URL environment variable.
    Falls back to DATABASE_URL if SUPABASE_DATABASE_URL is not set.
    """
    database_url = os.getenv("SUPABASE_DATABASE_URL") or os.getenv("DATABASE_URL")

    if not database_url:
        raise RuntimeError(
            "SUPABASE_DATABASE_URL or DATABASE_URL environment variable is required"
        )

    return psycopg2.connect(database_url)


def store_document_chunks(
    chunks: List[Dict[str, Any]],
    user_id: str,
    document_id: Optional[int] = None
) -> int:
    """
    Store document chunks with embeddings in Supabase pgvector.

    Args:
        chunks: List of dicts with 'content' and 'metadata' keys
        user_id: The user ID who owns these chunks
        document_id: Optional document ID for tracking

    Returns:
        Number of chunks stored
    """
    if not chunks:
        return 0

    # Get embeddings model
    embeddings_model = get_embeddings()

    # Generate embeddings for all chunks
    contents = [chunk['content'] for chunk in chunks]
    embeddings = embeddings_model.embed_documents(contents)

    # Prepare data for insertion
    insert_data = []
    for i, chunk in enumerate(chunks):
        insert_data.append((
            user_id,
            document_id,
            chunk['content'],
            Json(chunk.get('metadata', {})),
            embeddings[i]  # vector as list
        ))

    conn = get_supabase_connection()
    try:
        with conn.cursor() as cur:
            # Insert chunks with embeddings
            execute_values(
                cur,
                """
                INSERT INTO document_chunks
                    (user_id, document_id, content, metadata, embedding)
                VALUES %s
                """,
                insert_data,
                template="(%s, %s, %s, %s, %s::vector)"
            )
            conn.commit()
            return len(insert_data)
    finally:
        conn.close()


def search_similar_chunks(
    query: str,
    user_id: str,
    k: int = 5,
    threshold: float = 0.0  # Threshold disabled by default - always return top k
) -> List[DocumentChunk]:
    """
    Search for similar document chunks using vector similarity.

    Note: Threshold is set to 0.0 by default to always return results.
    For RAG, it's better to give the LLM context and let it decide relevance,
    rather than filtering out potentially relevant content with arbitrary thresholds.

    Args:
        query: The search query
        user_id: Filter by user ID
        k: Number of results to return
        threshold: Minimum similarity threshold (0-1), default 0.0 (disabled)

    Returns:
        List of DocumentChunk objects with similarity scores
    """
    print(f"[SEARCH] Generating embedding for query: {query[:50]}...")

    # Generate query embedding
    embeddings_model = get_embeddings()
    query_embedding = embeddings_model.embed_query(query)

    print(f"[SEARCH] Query embedding generated, searching for user: {user_id}")

    conn = get_supabase_connection()
    try:
        with conn.cursor() as cur:
            # Use cosine similarity search - NO threshold filter
            # Always return top k results, let the LLM decide relevance
            cur.execute(
                """
                SELECT
                    id,
                    content,
                    metadata,
                    1 - (embedding <=> %s::vector) AS similarity
                FROM document_chunks
                WHERE user_id = %s
                ORDER BY embedding <=> %s::vector
                LIMIT %s
                """,
                (query_embedding, user_id, query_embedding, k)
            )

            results = []
            for row in cur.fetchall():
                results.append(DocumentChunk(
                    id=row[0],
                    content=row[1],
                    metadata=row[2] if row[2] else {},
                    similarity=row[3]
                ))

            print(f"[SEARCH] Found {len(results)} chunks, similarities: {[f'{r.similarity:.3f}' for r in results]}")

            return results
    finally:
        conn.close()


def delete_user_chunks(user_id: str, document_id: Optional[int] = None) -> int:
    """
    Delete document chunks for a user.

    Args:
        user_id: The user ID
        document_id: Optional - delete only chunks for this document

    Returns:
        Number of chunks deleted
    """
    conn = get_supabase_connection()
    try:
        with conn.cursor() as cur:
            if document_id:
                cur.execute(
                    "DELETE FROM document_chunks WHERE user_id = %s AND document_id = %s",
                    (user_id, document_id)
                )
            else:
                cur.execute(
                    "DELETE FROM document_chunks WHERE user_id = %s",
                    (user_id,)
                )
            deleted_count = cur.rowcount
            conn.commit()
            return deleted_count
    finally:
        conn.close()


def get_user_chunk_count(user_id: str) -> int:
    """
    Get the total number of chunks for a user.

    Args:
        user_id: The user ID

    Returns:
        Number of chunks
    """
    conn = get_supabase_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT COUNT(*) FROM document_chunks WHERE user_id = %s",
                (user_id,)
            )
            return cur.fetchone()[0]
    finally:
        conn.close()


def has_user_chunks(user_id: str) -> bool:
    """
    Check if a user has any document chunks stored.

    Args:
        user_id: The user ID

    Returns:
        True if user has chunks, False otherwise
    """
    return get_user_chunk_count(user_id) > 0
