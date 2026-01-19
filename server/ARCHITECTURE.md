# RAG DocuChat - System Architecture

## Complete System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER ACTIONS                            │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   Upload     │      │   Ingest     │      │    Chat      │
│  Documents   │      │  Documents   │      │ (with RAG)   │
└──────────────┘      └──────────────┘      └──────────────┘
        │                      │                      │
        │                      │                      │
        ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                       API LAYER (FastAPI)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  POST /api/upload           POST /api/ingest     POST /chat    │
│  ├─ Validate files          ├─ Load docs        ├─ Get query  │
│  ├─ Check size/type         ├─ Split chunks     ├─ Retrieve   │
│  └─ Save to uploaded_docs/  ├─ Create embeddings│   context    │
│                              ├─ Build FAISS     └─ Generate    │
│  GET /api/ingest/status     └─ Save index           response   │
│  └─ Check vector store                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  uploaded_   │      │   vector_    │      │  retrieval_  │
│   docs/      │      │   store/     │      │  service.py  │
│              │      │  faiss_index/│      │              │
│ ├─ doc1.txt  │      │ ├─ index.    │      │ ├─ Load FAISS│
│ ├─ doc2.pdf  │      │ │  faiss     │      │ ├─ Search    │
│ └─ ...       │      │ └─ index.pkl │      │ └─ Return    │
│              │      │              │      │    context   │
└──────────────┘      └──────────────┘      └──────────────┘
```

## Component Details

### 1. Upload Pipeline

```
User → POST /api/upload → Validate → Save → uploaded_docs/
                           ├─ File type check (.txt, .pdf)
                           ├─ Size limit (10MB)
                           └─ Duplicate handling
```

**Files**: `app/api/upload.py`

**Directory**: `uploaded_docs/`

### 2. Ingestion Pipeline

```
POST /api/ingest
    ↓
Load Documents (DirectoryLoader)
    ↓
Split into Chunks (RecursiveCharacterTextSplitter)
    ├─ chunk_size: 500
    └─ chunk_overlap: 50
    ↓
Generate Embeddings (HuggingFace)
    ├─ model: sentence-transformers/all-MiniLM-L6-v2
    └─ dimensions: 384
    ↓
Build FAISS Index
    ├─ Similarity search structure
    └─ Efficient vector storage
    ↓
Save to vector_store/faiss_index/
    ├─ index.faiss (vectors)
    └─ index.pkl (metadata)
```

**Files**:
- `app/api/ingest.py` (API endpoint)
- `app/embeddings/ingest.py` (Core logic)
- `app/core/embedding_factory.py` (Embedding provider)

**Output**: `vector_store/faiss_index/`

### 3. Retrieval Pipeline

```
User Query → retrieve_context()
                ↓
          Load FAISS Index
                ↓
          Similarity Search (top-k)
                ↓
          Return Relevant Chunks
                ↓
          Inject into LLM Prompt
                ↓
          Generate Response
```

**Files**:
- `app/services/retrieval_service.py`
- `app/api/chat.py`

### 4. Chat Pipeline (RAG)

```
POST /chat
    ├─ message: "What are the key features?"
    └─ session_id: "abc123"
         ↓
    retrieve_context(message, k=3)
         ↓
    ┌─────────────────────┐
    │ Relevant Context    │
    │ from Vector Store   │
    └─────────────────────┘
         ↓
    Build Prompt:
    ┌─────────────────────────────────────┐
    │ System: You are a helpful assistant│
    │                                     │
    │ Context: [Retrieved chunks]        │
    │                                     │
    │ User: What are the key features?   │
    └─────────────────────────────────────┘
         ↓
    LLM (Groq/OpenAI)
         ↓
    Response with grounded information
```

## Data Flow

### Upload → Ingest → Query Flow

```
┌─────────────┐
│   Step 1    │  Upload Document
└─────────────┘
      ↓
[ document.txt saved to uploaded_docs/ ]
      ↓
┌─────────────┐
│   Step 2    │  Trigger Ingestion
└─────────────┘
      ↓
[ Document loaded and processed ]
      ↓
[ "AI is transforming industries..." ]
[ "Machine learning enables..." ]
[ "Neural networks are..." ]
      ↓
[ Convert to 384-dim vectors ]
      ↓
[ Store in FAISS index ]
      ↓
[ vector_store/faiss_index/ created ]
      ↓
┌─────────────┐
│   Step 3    │  Ask Question
└─────────────┘
      ↓
Query: "What is mentioned about AI?"
      ↓
[ Search FAISS for similar vectors ]
      ↓
Retrieved: "AI is transforming industries..."
      ↓
[ Inject into LLM prompt ]
      ↓
Response: "According to the documents, AI is
           transforming industries through..."
```

## Technology Stack

### Backend (FastAPI)

```
app/
├── api/                    # API endpoints
│   ├── auth.py            # Authentication
│   ├── chat.py            # Chat with RAG
│   ├── upload.py          # File upload
│   ├── ingest.py          # Document ingestion
│   └── admin.py           # Admin functions
├── embeddings/            # Embedding logic
│   └── ingest.py          # Core ingestion
├── services/              # Business logic
│   └── retrieval_service.py  # Vector search
├── core/                  # Core utilities
│   └── embedding_factory.py  # Embedding providers
└── main.py                # FastAPI app
```

### Dependencies

```
LangChain            → RAG orchestration, document loading
FAISS                → Vector similarity search
HuggingFace          → Free text embeddings
Groq/OpenAI          → LLM inference
FastAPI              → REST API framework
Pydantic             → Data validation
```

## Embedding Options

### Default: HuggingFace (Free)

```python
EMBEDDING_PROVIDER=huggingface

Model: sentence-transformers/all-MiniLM-L6-v2
Dimensions: 384
Speed: Medium
Cost: FREE (runs locally)
Quality: Good for general use
```

### Alternative: OpenAI

```python
EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=sk-...

Model: text-embedding-ada-002
Dimensions: 1536
Speed: Fast (API call)
Cost: $0.0001 / 1K tokens
Quality: Excellent
```

### Alternative: Ollama (Local)

```python
EMBEDDING_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434

Model: nomic-embed-text
Dimensions: 768
Speed: Fast (local GPU)
Cost: FREE (self-hosted)
Quality: Very good
```

## Configuration Files

### Environment Variables (`.env`)

```bash
# LLM Provider
LLM_PROVIDER=groq              # or openai
GROQ_API_KEY=gsk_...           # Your API key

# Embedding Provider
EMBEDDING_PROVIDER=huggingface  # Free, no key needed
# EMBEDDING_PROVIDER=openai     # Requires OPENAI_API_KEY
# EMBEDDING_PROVIDER=ollama     # Requires local Ollama

# Database (if used)
DATABASE_URL=postgresql://...
```

### Upload Settings (`app/api/upload.py`)

```python
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {".pdf", ".txt"}
UPLOAD_DIR = "uploaded_docs"
```

### Ingestion Settings (`app/embeddings/ingest.py`)

```python
CHUNK_SIZE = 500        # Characters per chunk
CHUNK_OVERLAP = 50      # Overlap between chunks
VECTOR_PATH = "vector_store/faiss_index"
```

## API Reference

### Upload Endpoint

```http
POST /api/upload
Content-Type: multipart/form-data

files: File[] (max 10MB each, .txt or .pdf)

Response:
{
    "message": "Successfully uploaded 2 file(s)",
    "files": [
        {
            "filename": "doc1.txt",
            "size": 1024,
            "content_type": "text/plain",
            "saved_path": "/path/to/uploaded_docs/doc1.txt"
        }
    ]
}
```

### Ingest Endpoint

```http
POST /api/ingest

Response:
{
    "status": "success",
    "message": "Documents ingested successfully. Vector store ready for queries.",
    "documents_processed": 5,
    "chunks_created": 142,
    "vector_store_path": "vector_store/faiss_index"
}
```

### Status Endpoint

```http
GET /api/ingest/status

Response:
{
    "status": "ready",
    "message": "Vector store is ready for queries"
}
```

### Chat Endpoint (with RAG)

```http
POST /chat
Content-Type: application/json

{
    "message": "What are the key features?",
    "session_id": "user123"
}

Response:
{
    "response": "Based on the documents, the key features include...",
    "session_id": "user123"
}
```

## Security Considerations

### File Upload Security

- **Type validation**: Only `.txt` and `.pdf` allowed
- **Size limits**: 10MB per file
- **Path sanitization**: Prevents path traversal attacks
- **Duplicate handling**: Automatic filename collision resolution

### API Security

- CORS configured for `localhost:3000` (frontend)
- File validation before processing
- Error messages don't leak system paths
- Safe deserialization for FAISS (`allow_dangerous_deserialization=True` only for trusted data)

## Performance

### Typical Metrics

| Operation | Small (1-10 pages) | Medium (10-50) | Large (50-100) |
|-----------|-------------------|----------------|----------------|
| Upload    | < 1 sec          | 1-2 sec        | 2-5 sec        |
| Ingestion | 2-5 sec          | 5-15 sec       | 15-30 sec      |
| Retrieval | < 100ms          | < 200ms        | < 300ms        |
| Chat      | 1-3 sec          | 1-3 sec        | 1-3 sec        |

### Optimization Tips

1. **Batch processing**: Upload all files, then ingest once
2. **Adjust chunk size**: Smaller = faster, larger = more context
3. **Use FastEmbed**: Faster embeddings than HuggingFace
4. **Cache embeddings**: Avoid re-embedding unchanged docs
5. **Background tasks**: Process ingestion asynchronously

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| "Vector store not found" | Run `POST /api/ingest` |
| "No documents found" | Add files to `uploaded_docs/` |
| Model download fails | Check internet, run `pip install sentence-transformers` |
| Chat has no context | Verify ingestion completed successfully |
| Slow ingestion | Reduce chunk size or use FastEmbed |

## Next Steps

### Enhancements

1. **File type support**: Add `.docx`, `.html`, `.md` loaders
2. **Background processing**: Use FastAPI BackgroundTasks
3. **Progress tracking**: WebSocket for real-time progress
4. **Metadata**: Track document source, date, author
5. **Re-ranking**: Improve context quality with reranker
6. **Hybrid search**: Combine vector + keyword search
7. **Multi-tenancy**: Separate vector stores per user
8. **Deletion**: Allow document removal and re-indexing

### Monitoring

- Log ingestion times
- Track chunk counts
- Monitor retrieval quality
- Measure chat response relevance

## References

- **LangChain**: https://python.langchain.com/
- **FAISS**: https://faiss.ai/
- **HuggingFace**: https://huggingface.co/sentence-transformers
- **FastAPI**: https://fastapi.tiangolo.com/
