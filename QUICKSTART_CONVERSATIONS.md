# Quick Start: Conversation History

## Setup (First Time Only)

### 1. Apply Database Migration

```bash
cd /Users/chromeo/Projects/AI-Portfolio/rag-docuchat-sass/server

# Option A: Using the migration script
python3 migrate_db.py

# Option B: Using Alembic
alembic upgrade head
```

### 2. Verify Tables Created

```bash
sqlite3 app.db
.tables
# Should show: conversations, documents, messages, refresh_tokens, users
.quit
```

## Running the Application

### Terminal 1: Backend
```bash
cd /Users/chromeo/Projects/AI-Portfolio/rag-docuchat-sass/server
uvicorn app.main:app --reload
```

### Terminal 2: Frontend
```bash
cd /Users/chromeo/Projects/AI-Portfolio/rag-docuchat-sass/client
npm run dev
```

### Terminal 3: Test API (Optional)
```bash
cd /Users/chromeo/Projects/AI-Portfolio/rag-docuchat-sass/server
./test_conversations.sh
```

## Testing the Features

1. **Open browser**: http://localhost:3000
2. **Sign in** with Clerk authentication
3. **Navigate to chat**: Click "Get Started" or go to /chat
4. **Send a message** - This auto-creates your first conversation
5. **Check sidebar** - Your conversation appears on the left
6. **Create new chat** - Click "New Chat" button
7. **Switch conversations** - Click any conversation in sidebar
8. **Delete conversation** - Click "..." menu → Delete

## What You'll See

### Desktop View
```
┌──────────────────┬────────────────────────────────────┐
│  Conversations   │         Chat Interface             │
│  ──────────────  │                                    │
│  [New Chat]      │  Messages appear here              │
│                  │                                    │
│  📝 My first...  │  [User message bubble]             │
│     5 messages   │  [Assistant response]              │
│                  │                                    │
│  📝 Another...   │  ─────────────────────────         │
│     2 messages   │  [Type message here...] [Send]     │
│                  │                                    │
└──────────────────┴────────────────────────────────────┘
```

### Mobile View
```
┌────────────────────────────────────┐
│  [☰]   Chat Interface              │
│                                    │
│  Messages appear here              │
│                                    │
│  [User message bubble]             │
│  [Assistant response]              │
│                                    │
│  ─────────────────────────         │
│  [Type message...] [Send]          │
└────────────────────────────────────┘

(Tap ☰ to open conversation drawer)
```

## Keyboard Shortcuts

- **Enter** - Send message
- **Escape** - Close mobile drawer (on mobile)

## API Endpoints

All endpoints are prefixed with `http://localhost:8000/api`

```bash
# List conversations
GET /conversations?user_id=YOUR_CLERK_ID

# Get specific conversation
GET /conversations/1

# Get conversation messages
GET /conversations/1/messages

# Create conversation
POST /conversations
{
  "user_id": "YOUR_CLERK_ID",
  "title": "My Conversation"
}

# Update conversation title
PATCH /conversations/1
{
  "title": "Updated Title"
}

# Delete conversation
DELETE /conversations/1
```

## Troubleshooting

**❌ Sidebar not showing?**
```bash
# Check if user is authenticated
# Open browser console, check for errors
# Verify backend is running on port 8000
```

**❌ Conversations not saving?**
```bash
# Check database tables exist
sqlite3 server/app.db ".tables"

# Check backend logs
# Look for errors in terminal running uvicorn
```

**❌ "Cannot find module" errors?**
```bash
cd client
npm install
```

**❌ Backend connection refused?**
```bash
# Make sure backend is running
cd server
uvicorn app.main:app --reload

# Check port 8000 is available
lsof -i :8000
```

## File Structure

```
rag-docuchat-sass/
├── server/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat.py              # Updated with conversation_id
│   │   │   └── conversations.py     # NEW - CRUD endpoints
│   │   └── db/
│   │       └── models.py            # Updated models
│   ├── alembic/
│   │   └── versions/
│   │       └── 001_...py           # NEW - Migration
│   ├── migrate_db.py                # NEW - Helper script
│   └── test_conversations.sh        # NEW - Test script
│
└── client/
    ├── app/
    │   └── chat/
    │       └── page.tsx             # Updated with sidebar
    └── components/
        ├── ConversationSidebar.tsx  # NEW
        └── ConversationItem.tsx     # NEW
```

## Success Indicators

✅ Backend starts without errors
✅ Frontend compiles successfully
✅ Sidebar appears on chat page
✅ Messages save to database
✅ Conversations persist after refresh
✅ Can switch between conversations
✅ Can delete conversations
✅ Mobile drawer works on small screens

## Next Steps

Once everything is working:
1. Upload some documents
2. Ask questions about them
3. Create multiple conversations
4. Test switching between conversations
5. Verify messages persist after page reload

---

**Need Help?**
- Check `/CONVERSATION_HISTORY_IMPLEMENTATION.md` for detailed docs
- Run test script: `./server/test_conversations.sh`
- Check browser console for errors
- Check backend logs for API errors
