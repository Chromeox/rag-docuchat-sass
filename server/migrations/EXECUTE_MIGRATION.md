# Execute Database Migration via Railway Dashboard

## Quick Steps

1. **Open Railway Dashboard:**
   - Go to: https://railway.com/project/6b25a720-784a-4262-8b7b-c11020b9977c
   - Or run: `railway open`

2. **Navigate to PostgreSQL Database:**
   - Click on the "PostgreSQL" service in your project
   - Click on the "Data" tab

3. **Execute Migration:**
   - Copy the SQL from `server/migrations/fix_table_names.sql`
   - Paste into the query editor in the Data tab
   - Click "Execute" or press Cmd+Enter

4. **Verify Tables:**
   - Run this query to confirm:
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   ORDER BY table_name;
   ```

   - You should see:
     - conversations (renamed from chatbot_conversations)
     - documents
     - messages (renamed from chatbot_messages)
     - refresh_tokens (newly created)
     - user_quotas (newly created)
     - users (newly created)

## Migration SQL (Copy This)

```sql
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
```

## After Migration

Once you've executed the migration successfully, let me know and I'll:

1. Test the `/api/conversations` endpoint
2. Verify the conversations feature works on https://chat.gethobbi.com
3. Test the full upload flow end-to-end
4. Fix the UI input box positioning issue

## Alternative: Enable Public Access (Not Recommended)

If you prefer CLI access, you can:
1. Go to PostgreSQL service settings
2. Enable "TCP Proxy" under Networking
3. Get the public connection string
4. Run migration via local psql

However, using the dashboard is faster and more secure for one-time migrations.
