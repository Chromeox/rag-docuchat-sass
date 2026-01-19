# Document Ingestion Pipeline Guide

## Overview

The RAG DocuChat ingestion pipeline processes uploaded documents and creates a FAISS vector store for efficient semantic search and context retrieval.

## Architecture

```
uploaded_docs/          # Documents to be processed
    ├── file1.txt
    ├── file2.pdf
    └── ...

↓ Ingestion Process ↓

vector_store/           # Generated FAISS index
    └── faiss_index/
        ├── index.faiss
        └── index.pkl
```

## Components

### 1. Document Ingestion (`app/embeddings/ingest.py`)

**Function**: `ingest_docs(data_path: str = "uploaded_docs")`

**Process**:
1. Scans the `uploaded_docs/` directory for files
2. Loads documents using LangChain's DirectoryLoader
3. Splits documents into chunks (500 chars with 50 char overlap)
4. Creates embeddings using HuggingFace sentence-transformers
5. Builds FAISS vector index
6. Saves to `vector_store/faiss_index/`

**Returns**:
```python
{
    "status": "success",
    "documents_processed": 5,
    "chunks_created": 142,
    "vector_store_path": "vector_store/faiss_index"
}
```

### 2. Ingestion API (`app/api/ingest.py`)

**Endpoints**:

#### POST `/api/ingest`
Triggers document ingestion from `uploaded_docs/` directory.

**Request**: No body required

**Response**:
```json
{
    "status": "success",
    "message": "Documents ingested successfully. Vector store ready for queries.",
    "documents_processed": 5,
    "chunks_created": 142,
    "vector_store_path": "vector_store/faiss_index"
}
```

**Error Responses**:
- `404`: `uploaded_docs/` directory not found
- `400`: No documents found in directory
- `500`: Ingestion failed (embedding or FAISS error)

#### GET `/api/ingest/status`
Checks if vector store is ready for queries.

**Response**:
```json
{
    "status": "ready",
    "message": "Vector store is ready for queries"
}
```

OR

```json
{
    "status": "not_ready",
    "message": "Vector store not found. Please run ingestion first."
}
```

### 3. Retrieval Service (`app/services/retrieval_service.py`)

**Function**: `retrieve_context(query: str, k: int = 3) -> str`

- Loads FAISS index from `vector_store/faiss_index/`
- Performs similarity search
- Returns top-k relevant document chunks
- Automatically returns empty string if vector store doesn't exist

## Usage

### Method 1: Direct Script Execution

```bash
# Run ingestion directly
cd /Users/chromeo/Projects/AI-Portfolio/rag-docuchat-sass/server
python -m app.embeddings.ingest
```

### Method 2: Test Script

```bash
# Run the test script
cd /Users/chromeo/Projects/AI-Portfolio/rag-docuchat-sass/server
python test_ingestion.py
```

### Method 3: API Endpoint

```bash
# Start the server
uvicorn app.main:app --reload --port 8000

# Trigger ingestion via API
curl -X POST http://localhost:8000/api/ingest

# Check status
curl http://localhost:8000/api/ingest/status
```

### Method 4: After File Upload

```bash
# 1. Upload files
curl -X POST http://localhost:8000/api/upload \
  -F "files=@document1.txt" \
  -F "files=@document2.pdf"

# 2. Trigger ingestion
curl -X POST http://localhost:8000/api/ingest
```

## Configuration

### Embedding Model

Set in environment variables (`.env`):

```bash
# Default: HuggingFace (free)
EMBEDDING_PROVIDER=huggingface

# Alternative options:
# EMBEDDING_PROVIDER=openai
# EMBEDDING_PROVIDER=ollama
# EMBEDDING_PROVIDER=fastembed
```

**HuggingFace Model**: `sentence-transformers/all-MiniLM-L6-v2`
- Free, no API key required
- 384-dimensional embeddings
- Good balance of speed and quality

### Chunk Settings

In `app/embeddings/ingest.py`:

```python
splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,      # Characters per chunk
    chunk_overlap=50     # Overlap between chunks
)
```

### File Upload Settings

In `app/api/upload.py`:

```python
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {".pdf", ".txt"}
```

## Workflow

### Complete Upload → Ingest → Query Workflow

```
1. Upload Documents
   POST /api/upload
   ↓
   Files saved to uploaded_docs/

2. Trigger Ingestion
   POST /api/ingest
   ↓
   Documents → Chunks → Embeddings → FAISS Index

3. Query Chatbot
   POST /chat
   ↓
   User Query → Retrieve Context → LLM Response
```

## Testing

### Test Ingestion Locally

```bash
# 1. Add a test document
echo "This is a test document about AI and machine learning." > uploaded_docs/test.txt

# 2. Run test script
python test_ingestion.py

# Expected output:
# ============================================================
# RAG DocuChat - Ingestion Pipeline Test
# ============================================================
#
# Files found in uploaded_docs/:
#   - test.txt (50 bytes)
#
# Starting ingestion...
# Found 1 files to process
# Loaded 1 documents
# Created 1 chunks
# ✅ Documents ingested successfully to vector_store/faiss_index
#
# ============================================================
# INGESTION SUCCESSFUL!
# ============================================================
```

### Test via API

```bash
# 1. Start server
uvicorn app.main:app --reload

# 2. Check status (should be not_ready initially)
curl http://localhost:8000/api/ingest/status

# 3. Trigger ingestion
curl -X POST http://localhost:8000/api/ingest

# 4. Check status again (should be ready)
curl http://localhost:8000/api/ingest/status
```

## Troubleshooting

### Error: "Vector store not found"

**Cause**: Ingestion hasn't been run yet, or failed.

**Solution**:
```bash
# Check if uploaded_docs has files
ls uploaded_docs/

# Run ingestion
python test_ingestion.py
# OR
curl -X POST http://localhost:8000/api/ingest
```

### Error: "No documents found"

**Cause**: `uploaded_docs/` directory is empty.

**Solution**:
```bash
# Add test documents
cp /path/to/your/documents/*.txt uploaded_docs/

# Or use the upload API
curl -X POST http://localhost:8000/api/upload \
  -F "files=@/path/to/document.txt"
```

### Error: "File type not allowed"

**Cause**: Trying to upload unsupported file types.

**Supported**: `.txt`, `.pdf`

**Solution**: Convert documents to supported formats or extend `ALLOWED_EXTENSIONS` in `app/api/upload.py`.

### Error: HuggingFace model download fails

**Cause**: First-time model download requires internet connection.

**Solution**:
```bash
# Download model manually (will be cached)
python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')"
```

### Ingestion is slow

**Cause**: Large documents or many files.

**Solutions**:
- Reduce chunk size (faster processing, less context)
- Use FastEmbed (`EMBEDDING_PROVIDER=fastembed`)
- Use Ollama locally for faster embeddings
- Process files in batches

## Performance

### Typical Processing Times

- **Small file** (1-10 pages): 2-5 seconds
- **Medium file** (10-50 pages): 5-15 seconds
- **Large file** (50-100 pages): 15-30 seconds

### Optimization Tips

1. **Use appropriate chunk size**:
   - Smaller chunks (200-300): Faster, more precise retrieval
   - Larger chunks (800-1000): Slower, more context

2. **Batch uploads**:
   - Upload all files first
   - Run ingestion once instead of after each upload

3. **Re-ingestion**:
   - Adds new documents to existing index
   - Deletes old vector store first if you want clean slate

## Integration with Chat

The retrieval service automatically integrates with the chat endpoint:

```python
# In app/api/chat.py
from app.services.retrieval_service import retrieve_context

# During chat request
context = retrieve_context(user_query, k=3)
# Context is automatically injected into LLM prompt
```

If no vector store exists, chat still works but without RAG context.

## Next Steps

1. **Enhance file support**: Add `.docx`, `.md`, `.html` loaders
2. **Background processing**: Use BackgroundTasks for async ingestion
3. **Progress tracking**: Add websocket for real-time ingestion progress
4. **Metadata filtering**: Filter by document type, date, author
5. **Re-ranking**: Add reranking for better context selection
6. **Hybrid search**: Combine vector search with keyword search

## Reference

- **LangChain Docs**: https://python.langchain.com/docs/modules/data_connection/
- **FAISS Docs**: https://faiss.ai/
- **HuggingFace Sentence Transformers**: https://huggingface.co/sentence-transformers
