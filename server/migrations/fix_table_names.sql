-- Database Schema Migration: Fix Table Names
-- Purpose: Rename chatbot_* tables to match code expectations and create missing tables
-- Date: 2026-01-19

-- Step 1: Rename existing tables to remove chatbot_ prefix
ALTER TABLE chatbot_conversations RENAME TO conversations;
ALTER TABLE chatbot_messages RENAME TO messages;

-- Step 2: Create missing users table (legacy internal auth - not actively used)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create missing refresh_tokens table (legacy internal auth - not actively used)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE,
    expires_at TIMESTAMP
);

-- Step 4: Create missing user_quotas table (actively used for quota tracking)
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

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS ix_user_quotas_user_id ON user_quotas(user_id);
CREATE INDEX IF NOT EXISTS ix_user_quotas_last_reset ON user_quotas(last_query_reset);

-- Step 6: Verify all tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
