-- Database Schema Migration: Create All Tables from Scratch
-- Purpose: Initialize complete database schema for DocuChat
-- Date: 2026-01-20

-- Step 1: Create users table (legacy internal auth - not actively used)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create refresh_tokens table (legacy internal auth - not actively used)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE,
    expires_at TIMESTAMP
);

-- Step 3: Create documents table (uploaded documents)
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(50),
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'uploaded',
    chunk_count INTEGER DEFAULT 0,
    error_message TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_documents_id ON documents(id);
CREATE INDEX IF NOT EXISTS ix_documents_user_id ON documents(user_id);

-- Step 4: Create conversations table (chat conversations)
CREATE TABLE IF NOT EXISTS conversations (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    title TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_conversations_id ON conversations(id);
CREATE INDEX IF NOT EXISTS ix_conversations_user_id ON conversations(user_id);

-- Step 5: Create messages table (individual messages in conversations)
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_messages_id ON messages(id);
CREATE INDEX IF NOT EXISTS ix_messages_conversation_id ON messages(conversation_id);

-- Step 6: Create user_quotas table (quota tracking per user - actively used)
CREATE TABLE IF NOT EXISTS user_quotas (
    user_id VARCHAR(255) PRIMARY KEY,
    tier VARCHAR(20) NOT NULL DEFAULT 'free',
    document_count INTEGER NOT NULL DEFAULT 0,
    total_storage_bytes BIGINT NOT NULL DEFAULT 0,
    queries_today INTEGER NOT NULL DEFAULT 0,
    last_query_reset DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_user_quotas_user_id ON user_quotas(user_id);
CREATE INDEX IF NOT EXISTS ix_user_quotas_last_reset ON user_quotas(last_query_reset);

-- Step 7: Verify all tables were created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
