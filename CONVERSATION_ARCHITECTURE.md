# Conversation History Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     RAG DocuChat SaaS                        │
│                  Conversation History System                 │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Frontend   │   HTTP  │   Backend    │   SQL   │   SQLite     │
│  (Next.js)   │ ◄─────► │  (FastAPI)   │ ◄─────► │   Database   │
└──────────────┘         └──────────────┘         └──────────────┘
```

## Data Flow

### 1. User Sends Message

```
User types message
       ↓
┌──────────────────────────────────────────┐
│ ChatPage.tsx                             │
│ - sendMessage(message)                   │
│ - Adds user message to local state       │
└──────────────────────────────────────────┘
       ↓
POST /chat
{
  question: "Hello",
  user_id: "clerk_user_123",
  conversation_id: null  // or existing ID
}
       ↓
┌──────────────────────────────────────────┐
│ chat.py                                  │
│ - Calls generate_answer()               │
└──────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────┐
│ llm_service.py                           │
│ 1. Creates/uses conversation            │
│ 2. Retrieves context from documents     │
│ 3. Generates AI response                │
│ 4. Saves user message to DB             │
│ 5. Saves assistant message to DB        │
└──────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────┐
│ chat_repository.py                       │
│ - save_message(conv_id, role, content)  │
└──────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────┐
│ SQLite Database                          │
│ INSERT INTO messages (...)               │
└──────────────────────────────────────────┘
       ↓
Response streams back to frontend
       ↓
ChatPage updates UI with assistant message
```

### 2. Load Conversation History

```
User clicks on conversation in sidebar
       ↓
┌──────────────────────────────────────────┐
│ ConversationSidebar.tsx                  │
│ - onSelectConversation(id)               │
└──────────────────────────────────────────┘
       ↓
ChatPage.handleSelectConversation(id)
       ↓
GET /api/conversations/{id}/messages
       ↓
┌──────────────────────────────────────────┐
│ conversations.py                         │
│ - get_conversation_messages(id)          │
│ - Queries database for all messages      │
└──────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────┐
│ SQLite Database                          │
│ SELECT * FROM messages                   │
│ WHERE conversation_id = ?                │
│ ORDER BY created_at                      │
└──────────────────────────────────────────┘
       ↓
Returns array of messages
       ↓
ChatPage.setMessages(messages)
       ↓
UI displays conversation history
```

### 3. List Conversations

```
Sidebar loads on mount
       ↓
GET /api/conversations?user_id=clerk_user_123
       ↓
┌──────────────────────────────────────────┐
│ conversations.py                         │
│ - list_conversations(user_id)            │
│ - Queries conversations + message counts │
└──────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────┐
│ SQLite Database                          │
│ SELECT * FROM conversations              │
│ WHERE user_id = ?                        │
│ ORDER BY updated_at DESC                 │
└──────────────────────────────────────────┘
       ↓
For each conversation:
  - Count messages
  - Get last message preview
       ↓
Returns array of conversations
       ↓
ConversationSidebar renders list
```

## Database Schema

```sql
┌─────────────────────────────────────────────┐
│ conversations                               │
├─────────────────────────────────────────────┤
│ id              INTEGER PRIMARY KEY         │
│ user_id         VARCHAR(255) INDEXED ────┐  │
│ title           TEXT                      │  │
│ created_at      TIMESTAMP                 │  │
│ updated_at      TIMESTAMP                 │  │
└─────────────────────────────────────────────┘
                                             │
                                             │
┌─────────────────────────────────────────────┘
│
│  ┌─────────────────────────────────────────┐
│  │ users (Clerk)                           │
│  │ - External auth via Clerk               │
│  │ - user_id stored as string              │
└─►└─────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ messages                                    │
├─────────────────────────────────────────────┤
│ id                 INTEGER PRIMARY KEY      │
│ conversation_id    INTEGER FOREIGN KEY ───┐ │
│ role               VARCHAR(20)             │ │
│ content            TEXT                    │ │
│ created_at         TIMESTAMP               │ │
└─────────────────────────────────────────────┘
                                              │
        ┌─────────────────────────────────────┘
        │
        │  CASCADE DELETE: When conversation
        └► is deleted, all messages deleted too
```

## Component Hierarchy

```
ChatPage.tsx (Main container)
├── ConversationSidebar.tsx
│   ├── Header
│   │   └── Collapse/Expand button
│   ├── "New Chat" button
│   └── Conversation list
│       └── ConversationItem.tsx (multiple)
│           ├── Title
│           ├── Last message preview
│           ├── Timestamp
│           ├── Message count
│           └── Delete button
│
├── Chat Interface
│   ├── Header (navigation)
│   ├── Messages area
│   │   └── Message bubbles
│   └── Input area
│       ├── Upload button
│       ├── Text input
│       └── Send button
│
└── Modals
    └── Document Upload Modal
```

## State Management

### ChatPage State

```typescript
// Conversation tracking
const [currentConversationId, setCurrentConversationId] =
  useState<number | null>(null);

// Messages in current conversation
const [messages, setMessages] = useState<Message[]>([...]);

// UI state
const [isLoading, setIsLoading] = useState(false);
const [showUploadModal, setShowUploadModal] = useState(false);
```

### ConversationSidebar State

```typescript
// List of all user's conversations
const [conversations, setConversations] =
  useState<Conversation[]>([]);

// UI state
const [isCollapsed, setIsCollapsed] = useState(false);
const [isMobileOpen, setIsMobileOpen] = useState(false);
const [isLoading, setIsLoading] = useState(true);
```

## API Request Flow

### Creating a New Message

```
Frontend                Backend               Database
   │                       │                     │
   │  POST /chat           │                     │
   ├──────────────────────►│                     │
   │  {                    │                     │
   │    question,          │ generate_answer()   │
   │    user_id,           ├────────────┐        │
   │    conversation_id    │            │        │
   │  }                    │            ▼        │
   │                       │  create_conversation│
   │                       │  (if null)          │
   │                       ├────────────────────►│
   │                       │                     │ INSERT conversation
   │                       │◄────────────────────┤
   │                       │  conversation_id    │
   │                       │                     │
   │                       │  retrieve_context() │
   │                       ├────────────┐        │
   │                       │            │        │
   │                       │◄───────────┘        │
   │                       │                     │
   │                       │  generate AI response
   │                       ├────────────┐        │
   │                       │            │        │
   │                       │◄───────────┘        │
   │                       │                     │
   │                       │  save_message(user) │
   │                       ├────────────────────►│
   │                       │                     │ INSERT message (user)
   │                       │                     │
   │                       │  save_message(asst) │
   │                       ├────────────────────►│
   │                       │                     │ INSERT message (assistant)
   │                       │                     │
   │  Stream response      │                     │
   │◄──────────────────────┤                     │
   │  {conv_id}\n          │                     │
   │  [answer text...]     │                     │
   │                       │                     │
```

## Responsive Design Breakpoints

```
Mobile (< 1024px)          Desktop (≥ 1024px)
┌────────────────┐         ┌──────┬─────────────┐
│ [☰] Chat       │         │ Side │ Chat        │
│                │         │ bar  │             │
│ Messages       │         │      │ Messages    │
│                │         │ List │             │
│ Input          │         │      │ Input       │
└────────────────┘         └──────┴─────────────┘

Drawer opens              Persistent sidebar
on hamburger click        Collapsible
```

## Security Considerations

```
┌─────────────────────────────────────────┐
│ Clerk Authentication                    │
│ - user_id validated by Clerk            │
│ - JWT tokens (future enhancement)       │
└─────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────┐
│ Backend Authorization                   │
│ - Verify user_id ownership              │
│ - Check conversation belongs to user    │
│ - Validate request permissions          │
└─────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────┐
│ Database Constraints                    │
│ - Foreign key integrity                 │
│ - CASCADE delete on conversation drop   │
│ - Indexed queries for performance       │
└─────────────────────────────────────────┘
```

## Performance Optimizations

### Frontend
- **Lazy loading**: Messages loaded on-demand per conversation
- **Optimistic updates**: UI updates before API confirms
- **Debouncing**: Scroll and search events debounced
- **Code splitting**: Components lazy loaded

### Backend
- **Indexed queries**: user_id and conversation_id indexed
- **Pagination**: Ready for implementing pagination
- **Connection pooling**: SQLAlchemy session management
- **Caching**: Ready for Redis integration

### Database
```sql
-- Indexed columns for fast lookups
CREATE INDEX ix_conversations_user_id ON conversations(user_id);
CREATE INDEX ix_conversations_id ON conversations(id);
CREATE INDEX ix_messages_conversation_id ON messages(conversation_id);
CREATE INDEX ix_messages_id ON messages(id);
```

## Future Enhancements

### Phase 2
- [ ] Conversation search
- [ ] Message editing
- [ ] Real-time updates (WebSocket)
- [ ] Conversation sharing

### Phase 3
- [ ] AI-generated summaries
- [ ] Voice messages
- [ ] Message reactions
- [ ] Thread replies

### Phase 4
- [ ] Team collaboration
- [ ] Admin dashboard
- [ ] Analytics & insights
- [ ] Export conversations
```

This architecture scales from single-user to multi-tenant SaaS deployment.
