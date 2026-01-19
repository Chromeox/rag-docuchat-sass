# RAG DocuChat - Ingestion Quick Start

## 1. Test Ingestion (Standalone)

```bash
cd /Users/chromeo/Projects/AI-Portfolio/rag-docuchat-sass/server
python test_ingestion.py
```

## 2. Start Server

```bash
uvicorn app.main:app --reload --port 8000
```

## 3. Test via API

```bash
# In another terminal
./test_ingest_api.sh
```

## 4. Complete Workflow

```bash
# Upload documents
curl -X POST http://localhost:8000/api/upload \
  -F "files=@document.txt"

# Trigger ingestion
curl -X POST http://localhost:8000/api/ingest

# Check status
curl http://localhost:8000/api/ingest/status
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload` | Upload files to `uploaded_docs/` |
| POST | `/api/ingest` | Process files and create vector store |
| GET | `/api/ingest/status` | Check if vector store is ready |

## What It Does

1. Reads all files from `uploaded_docs/`
2. Splits into 500-char chunks (50 overlap)
3. Creates embeddings with HuggingFace (FREE)
4. Builds FAISS vector index
5. Saves to `vector_store/faiss_index/`

## Configuration

Default embedding: **HuggingFace** (free, no API key)

Model: `sentence-transformers/all-MiniLM-L6-v2`

Change in `.env`:
```bash
EMBEDDING_PROVIDER=huggingface  # default
# EMBEDDING_PROVIDER=openai     # requires API key
# EMBEDDING_PROVIDER=ollama     # local models
```

## Troubleshooting

**"Vector store not found"**
→ Run ingestion first: `curl -X POST http://localhost:8000/api/ingest`

**"No documents found"**
→ Add files to `uploaded_docs/` directory

**"File type not allowed"**
→ Only `.txt` and `.pdf` supported (change in `app/api/upload.py`)

## Next Steps

After successful ingestion:
- Chat endpoint automatically uses RAG context
- Ask questions about your documents
- Responses will be grounded in uploaded content

## Documentation

- **Comprehensive Guide**: `INGESTION_GUIDE.md`
- **Implementation Details**: `INGESTION_SUMMARY.md`
