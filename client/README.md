# DocuChat - Enterprise Document Intelligence Platform

A production-ready RAG (Retrieval-Augmented Generation) chat interface that lets businesses query their documents using natural language. Built with Next.js 16, React 19, and a FastAPI backend.

## Features

### Core Functionality
- **Document Q&A**: Upload PDFs, Word docs, text files and ask questions in natural language
- **RAG Pipeline**: Vector embeddings + semantic search for accurate, contextual answers
- **Streaming Responses**: Real-time typewriter effect as AI generates answers
- **Multi-tenant**: Clerk authentication with per-user document isolation

### Chat Experience
| Feature | Description |
|---------|-------------|
| Dark/Light Mode | System preference detection, manual toggle, persists to localStorage |
| Voice Input | Microphone button using Web Speech API (Chrome/Edge) |
| Message Actions | Copy, regenerate response on assistant messages |
| Clear Chat | Reset conversation while preserving in sidebar |
| Keyboard Shortcuts | `?` for shortcuts modal, `Cmd+K` search, `Cmd+\` toggle sidebar |

### Conversation Management
| Feature | Description |
|---------|-------------|
| Pin Conversations | Star important chats, pinned section at top |
| Rename | Inline editing with Enter/Escape support |
| Search | Filter conversations by title |
| Delete | Confirmation modal before deletion |
| Export | Download as Markdown or PDF |
| Share | Generate shareable link (UI ready for backend) |

### Document Management
| Feature | Description |
|---------|-------------|
| Drag & Drop | Full-page overlay with progress indicators |
| Document Manager | Modal to view, search, delete uploaded docs |
| Document Indicator | Header badge showing loaded doc count |
| File Support | PDF, DOCX, TXT, MD, and more |

### Polish & UX
- Welcome onboarding tour for first-time users
- Notification sounds (optional) when responses complete
- Loading skeletons and empty states
- Collapsible sidebar with smooth animations
- Profile dropdown with logout

## Tech Stack

```
Frontend:        Next.js 16.1 + React 19 + TypeScript
Styling:         Tailwind CSS v4 + Framer Motion v12
Auth:            Clerk
Icons:           Lucide React
PDF Export:      jsPDF

Backend:         FastAPI + Python
Vector DB:       (Configurable - Pinecone, Weaviate, Chroma)
Embeddings:      OpenAI / Local models
LLM:             OpenAI GPT-4 / Claude / Local
```

## Project Structure

```
client/
├── app/
│   ├── chat/page.tsx          # Main chat interface
│   ├── login/page.tsx         # Auth page
│   ├── layout.tsx             # Root layout with providers
│   └── globals.css            # Tailwind + custom styles
├── components/
│   ├── ConversationSidebar.tsx    # Collapsible sidebar
│   ├── ConversationItem.tsx       # Chat list item
│   ├── DocumentUpload.tsx         # Drag & drop uploader
│   ├── DocumentManager.tsx        # Document list modal
│   ├── DocumentIndicator.tsx      # Loaded docs badge
│   ├── ExportDropdown.tsx         # MD/PDF export
│   ├── ShareModal.tsx             # Share link modal
│   ├── StreamingMessage.tsx       # Typewriter effect
│   ├── WelcomeOnboarding.tsx      # First-time tour
│   ├── ShortcutsModal.tsx         # Keyboard shortcuts
│   ├── ConfirmModal.tsx           # Reusable confirmation
│   ├── EmptyState.tsx             # No conversations view
│   ├── Skeleton.tsx               # Loading placeholders
│   └── Toast.tsx                  # Notifications
├── contexts/
│   ├── ThemeContext.tsx           # Dark/light mode
│   ├── SoundContext.tsx           # Notification sounds
│   └── ToastContext.tsx           # Toast notifications
├── hooks/
│   └── useKeyboardShortcuts.ts    # Global shortcuts
├── services/
│   └── exportService.ts           # MD/PDF generation
└── public/
    └── sounds/
        └── notification.wav       # Response chime
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Clerk account (for auth)
- Backend API running (FastAPI)

### Installation

```bash
# Clone the repository
git clone https://github.com/Chromeox/rag-docuchat-sass.git
cd rag-docuchat-sass/client

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your keys:
# - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
# - CLERK_SECRET_KEY
# - NEXT_PUBLIC_API_URL

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Environment Variables

```env
# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/login

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Deployment

### Vercel (Recommended for Frontend)
```bash
npm run build
vercel deploy
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Enterprise Deployment Guide

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed enterprise integration patterns including:
- CRM integrations (Salesforce, HubSpot)
- Inventory system connections
- SSO/SAML setup
- On-premise deployment
- Data security considerations

## License

Proprietary - All rights reserved

## Support

For enterprise inquiries: [your-email]
