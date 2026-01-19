# RAG DocuChat Server - Documentation Index

## Getting Started

Start here for quick setup and testing:

### 1. **QUICK_START.md** (1.9K)
Quick reference card with essential commands and API endpoints.

**Best for**: First-time users who want to test the system immediately.

### 2. **README_INGESTION.md** (12K)
Complete overview of the ingestion pipeline implementation.

**Best for**: Understanding what was built and how to use it.

---

## In-Depth Guides

### 3. **INGESTION_GUIDE.md** (8.1K)
Comprehensive guide covering:
- How ingestion works
- API reference
- Configuration options
- Troubleshooting
- Performance optimization

**Best for**: Developers implementing or extending the ingestion system.

### 4. **ARCHITECTURE.md** (13K)
System architecture with diagrams:
- Component overview
- Data flow diagrams
- Technology stack details
- API specifications
- Security considerations

**Best for**: Understanding the complete system design and integration points.

### 5. **INGESTION_SUMMARY.md** (11K)
Implementation details:
- What was built
- Files created/modified
- Usage examples
- Integration with existing code
- Success criteria

**Best for**: Technical review and understanding implementation choices.

---

## API Documentation

### 6. **UPLOAD_API.md** (6.7K)
File upload endpoint documentation (existing).

**Covers**: `/api/upload` endpoint for document uploads.

---

## Test Scripts

### 7. **test_ingestion.py** (2.5K)
Standalone Python test script.

**Usage**:
```bash
python test_ingestion.py
```

**Tests**: Document loading, chunking, embedding, and FAISS index creation.

### 8. **test_ingest_api.sh** (1.3K)
API endpoint test script.

**Usage**:
```bash
./test_ingest_api.sh
```

**Tests**: `/api/ingest` and `/api/ingest/status` endpoints.

### 9. **test_upload.py** (5.9K)
Upload API test script (existing).

**Tests**: File upload functionality.

---

## Quick Navigation

### By Use Case

| What do you want to do? | Read this |
|-------------------------|-----------|
| Get started quickly | **QUICK_START.md** |
| Understand the system | **README_INGESTION.md** |
| Learn ingestion details | **INGESTION_GUIDE.md** |
| See architecture diagrams | **ARCHITECTURE.md** |
| Review implementation | **INGESTION_SUMMARY.md** |
| Test the system | Run **test_ingestion.py** |
| Test via API | Run **test_ingest_api.sh** |

### By Experience Level

| Your Level | Start Here |
|------------|------------|
| New to RAG DocuChat | **QUICK_START.md** → **README_INGESTION.md** |
| Familiar with RAG | **INGESTION_GUIDE.md** → **ARCHITECTURE.md** |
| Developer/Contributor | **INGESTION_SUMMARY.md** → **ARCHITECTURE.md** |
| Just want to test | Run **test_ingestion.py** |

---

## File Structure

```
server/
├── Documentation (this folder)
│   ├── INDEX.md                    ← You are here
│   ├── QUICK_START.md              ← Start here for basics
│   ├── README_INGESTION.md         ← Complete overview
│   ├── INGESTION_GUIDE.md          ← Detailed guide
│   ├── ARCHITECTURE.md             ← System design
│   ├── INGESTION_SUMMARY.md        ← Implementation details
│   └── UPLOAD_API.md               ← Upload endpoint docs
│
├── Test Scripts
│   ├── test_ingestion.py           ← Python test
│   ├── test_ingest_api.sh          ← API test
│   └── test_upload.py              ← Upload test
│
├── Application Code
│   ├── app/
│   │   ├── api/
│   │   │   ├── ingest.py           ← Ingestion endpoints
│   │   │   ├── upload.py           ← Upload endpoint
│   │   │   └── chat.py             ← Chat with RAG
│   │   ├── embeddings/
│   │   │   └── ingest.py           ← Core ingestion logic
│   │   └── services/
│   │       └── retrieval_service.py ← Vector search
│   │
│   ├── uploaded_docs/              ← Document storage
│   │   └── sample.txt
│   │
│   └── vector_store/               ← FAISS index (after ingestion)
│       └── faiss_index/
│
└── Configuration
    └── .env                        ← Environment variables
```

---

## API Endpoints Reference

| Method | Endpoint | Description | Documentation |
|--------|----------|-------------|---------------|
| POST | `/api/upload` | Upload documents | UPLOAD_API.md |
| POST | `/api/ingest` | Process documents | INGESTION_GUIDE.md |
| GET | `/api/ingest/status` | Check vector store | INGESTION_GUIDE.md |
| POST | `/chat` | Chat with RAG | (in main docs) |

---

## Common Tasks

### Test the Ingestion Pipeline

```bash
# Method 1: Python script (recommended first test)
python test_ingestion.py

# Method 2: API test (requires server running)
./test_ingest_api.sh
```

### Upload and Process Documents

```bash
# 1. Upload
curl -X POST http://localhost:8000/api/upload \
  -F "files=@document.txt"

# 2. Ingest
curl -X POST http://localhost:8000/api/ingest

# 3. Verify
curl http://localhost:8000/api/ingest/status
```

### Chat with RAG

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are the key features?",
    "session_id": "test"
  }'
```

---

## Configuration

### Environment Variables (`.env`)

```bash
# LLM Provider
LLM_PROVIDER=groq              # or openai
GROQ_API_KEY=your_key_here

# Embedding Provider (default: huggingface - FREE)
EMBEDDING_PROVIDER=huggingface
# EMBEDDING_PROVIDER=openai    # requires OPENAI_API_KEY
# EMBEDDING_PROVIDER=ollama    # local models
```

See **INGESTION_GUIDE.md** for full configuration options.

---

## Troubleshooting

### Quick Fixes

| Problem | Solution | Documentation |
|---------|----------|---------------|
| "Vector store not found" | Run `POST /api/ingest` | INGESTION_GUIDE.md |
| "No documents found" | Add files to `uploaded_docs/` | QUICK_START.md |
| Ingestion fails | Check logs, verify HuggingFace model | INGESTION_GUIDE.md |
| Slow performance | Adjust chunk size, use FastEmbed | ARCHITECTURE.md |

See **INGESTION_GUIDE.md** § Troubleshooting for detailed solutions.

---

## Development

### Adding New Features

1. **New file types**: Edit `ALLOWED_EXTENSIONS` in `app/api/upload.py`
2. **Custom chunking**: Modify `RecursiveCharacterTextSplitter` in `app/embeddings/ingest.py`
3. **Different embeddings**: Change `EMBEDDING_PROVIDER` in `.env`
4. **Background processing**: See **ARCHITECTURE.md** § Next Steps

### Running Tests

```bash
# Test ingestion
python test_ingestion.py

# Test API
./test_ingest_api.sh

# Test upload
python test_upload.py
```

---

## Contributing

When modifying the ingestion pipeline:

1. Update relevant documentation
2. Add tests to test scripts
3. Update this INDEX.md if needed
4. Test with various file types and sizes

---

## Support

For questions or issues:

1. Check **INGESTION_GUIDE.md** § Troubleshooting
2. Review **ARCHITECTURE.md** for design decisions
3. Run test scripts to verify setup
4. Check logs for detailed error messages

---

## Summary

The RAG DocuChat ingestion pipeline is fully implemented with:

- Complete document processing (upload → ingest → retrieve)
- Free HuggingFace embeddings
- FAISS vector store
- Comprehensive API
- Full test coverage
- Detailed documentation

**Start with**: **QUICK_START.md** → Test → **README_INGESTION.md** for details.

---

*Last updated: 2026-01-18*
