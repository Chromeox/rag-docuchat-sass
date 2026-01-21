-- Migration: Add pgvector for persistent vector storage
-- Run this on Supabase PostgreSQL

-- Step 1: Enable pgvector extension (Supabase has this built-in)
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: Create document chunks table with embeddings
CREATE TABLE IF NOT EXISTS document_chunks (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    embedding vector(1536),  -- OpenAI text-embedding-3-small dimension
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create indexes for efficient retrieval
CREATE INDEX IF NOT EXISTS ix_doc_chunks_user_id ON document_chunks(user_id);
CREATE INDEX IF NOT EXISTS ix_doc_chunks_document_id ON document_chunks(document_id);

-- Step 4: Create HNSW index for fast similarity search (better than ivfflat for most cases)
-- HNSW provides better recall with similar performance
CREATE INDEX IF NOT EXISTS ix_doc_chunks_embedding ON document_chunks
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Step 5: Create function for similarity search
CREATE OR REPLACE FUNCTION match_documents(
    query_embedding vector(1536),
    match_user_id VARCHAR(255),
    match_count INT DEFAULT 5,
    match_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    id INT,
    content TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.id,
        dc.content,
        dc.metadata,
        1 - (dc.embedding <=> query_embedding) AS similarity
    FROM document_chunks dc
    WHERE dc.user_id = match_user_id
      AND 1 - (dc.embedding <=> query_embedding) > match_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Verify setup
SELECT
    extname,
    extversion
FROM pg_extension
WHERE extname = 'vector';
