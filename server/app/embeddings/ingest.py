import os
from pathlib import Path
from typing import List, Optional
import pdfplumber
from langchain_community.document_loaders import (
    DirectoryLoader,
    TextLoader,
    PyPDFLoader,
    UnstructuredWordDocumentLoader,
    CSVLoader
)
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from app.core.embedding_factory import get_embeddings


# Check if Supabase pgvector is available for persistent storage
USE_SUPABASE_VECTOR = bool(os.getenv("SUPABASE_DATABASE_URL"))

# Use /tmp for Railway (ephemeral but writable) - fallback for FAISS
if os.getenv("RAILWAY_ENVIRONMENT"):
    UPLOADED_DOCS_PATH = "/tmp/uploaded_docs"
    VECTOR_STORE_BASE = "/tmp/vector_store"
else:
    UPLOADED_DOCS_PATH = "uploaded_docs"
    VECTOR_STORE_BASE = "vector_store"

print(f"[INGEST] UPLOADED_DOCS_PATH: {UPLOADED_DOCS_PATH}")
print(f"[INGEST] VECTOR_STORE_BASE: {VECTOR_STORE_BASE}")
print(f"[INGEST] USE_SUPABASE_VECTOR: {USE_SUPABASE_VECTOR}")


def load_pdf_with_pdfplumber(file_path: Path) -> List[Document]:
    """
    Fallback PDF loader using pdfplumber for problematic PDFs.

    Args:
        file_path: Path to the PDF file

    Returns:
        List of Document objects extracted from the PDF
    """
    docs = []
    try:
        with pdfplumber.open(str(file_path)) as pdf:
            for page_num, page in enumerate(pdf.pages):
                text = page.extract_text()
                if text and text.strip():
                    doc = Document(
                        page_content=text,
                        metadata={
                            "source": str(file_path),
                            "page": page_num,
                            "loader": "pdfplumber_fallback"
                        }
                    )
                    docs.append(doc)

        if docs:
            print(f"    📄 pdfplumber extracted {len(docs)} page(s)")
        return docs
    except Exception as e:
        print(f"    ⚠️  pdfplumber also failed: {str(e)}")
        return []


def load_document(file_path: Path, user_id: Optional[str] = None) -> List[Document]:
    """
    Load a single document using the appropriate loader based on file extension.

    For PDFs, attempts PyPDFLoader first, then falls back to pdfplumber if that fails
    (handles problematic PDFs with bbox errors or malformed metadata).

    Args:
        file_path: Path to the document file
        user_id: Optional user ID to add to document metadata

    Returns:
        List of Document objects with metadata
    """
    file_ext = file_path.suffix.lower()

    try:
        if file_ext == '.pdf':
            # Try PyPDFLoader first (faster and more feature-rich)
            try:
                loader = PyPDFLoader(str(file_path))
                docs = loader.load()
                if docs:
                    print(f"    📄 PyPDFLoader extracted {len(docs)} page(s)")
            except Exception as pdf_error:
                # PyPDFLoader failed - try pdfplumber as fallback
                print(f"    ⚠️  PyPDFLoader failed ({type(pdf_error).__name__}: {str(pdf_error)[:100]})")
                print(f"    🔄 Trying pdfplumber fallback...")
                docs = load_pdf_with_pdfplumber(file_path)

                if not docs:
                    print(f"    ❌ All PDF loaders failed for {file_path.name}")
                    return []
        elif file_ext in ['.docx', '.doc']:
            loader = UnstructuredWordDocumentLoader(str(file_path))
            docs = loader.load()
        elif file_ext == '.csv':
            loader = CSVLoader(str(file_path))
            docs = loader.load()
        elif file_ext in ['.txt', '.md', '.json', '.py', '.js', '.jsx', '.ts', '.tsx', '.html', '.css']:
            loader = TextLoader(str(file_path))
            docs = loader.load()
        else:
            # Try TextLoader as fallback
            loader = TextLoader(str(file_path))
            docs = loader.load()

        # Add user_id to metadata if provided
        if user_id and docs:
            for doc in docs:
                doc.metadata["user_id"] = user_id
                doc.metadata["source_file"] = file_path.name

        return docs
    except Exception as e:
        print(f"⚠️  Failed to load {file_path.name}: {str(e)}")
        return []


def ingest_docs(user_id: Optional[str] = None, data_path: Optional[str] = None, document_id: Optional[int] = None):
    """
    Ingest documents and store embeddings in Supabase pgvector (persistent) or FAISS (fallback).

    Supports: PDF, DOCX, TXT, MD, CSV, JSON, and code files.

    Args:
        user_id: Optional user ID for user-specific ingestion.
        data_path: Optional custom directory path. If not provided, uses user_id to determine path.
        document_id: Optional document ID for tracking in pgvector storage.

    Returns:
        dict: Status information including number of documents and chunks processed
    """
    # Determine the data path
    if data_path is None:
        if user_id:
            data_path = f"{UPLOADED_DOCS_PATH}/{user_id}"
        else:
            data_path = UPLOADED_DOCS_PATH

    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Data path {data_path} does not exist")

    # Check if directory has any files
    files_in_dir = list(Path(data_path).rglob("*.*"))
    # Filter out hidden files and directories
    files_in_dir = [f for f in files_in_dir if not f.name.startswith('.') and f.is_file()]

    if not files_in_dir:
        raise ValueError(f"No documents found in {data_path}")

    print(f"📂 Found {len(files_in_dir)} files to process in {data_path}")

    # Load all documents using appropriate loaders
    documents = []
    for file_path in files_in_dir:
        docs = load_document(file_path, user_id)
        if docs:
            documents.extend(docs)
            print(f"✅ Loaded {file_path.name} ({len(docs)} document(s))")
        else:
            print(f"⏭️  Skipped {file_path.name}")

    if not documents:
        raise ValueError("No documents could be loaded. Check file formats.")

    print(f"Loaded {len(documents)} documents")

    # Split documents into chunks
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50
    )

    chunks = splitter.split_documents(documents)
    print(f"Created {len(chunks)} chunks")

    # Use Supabase pgvector for persistent storage if available
    if USE_SUPABASE_VECTOR and user_id:
        from app.services.supabase_vectorstore import store_document_chunks

        # Convert LangChain documents to dicts for storage
        chunk_dicts = [
            {
                'content': chunk.page_content,
                'metadata': chunk.metadata
            }
            for chunk in chunks
        ]

        # Store in Supabase pgvector
        stored_count = store_document_chunks(chunk_dicts, user_id, document_id)
        print(f"✅ Stored {stored_count} chunks in Supabase pgvector (persistent)")

        return {
            "status": "success",
            "documents_processed": len(documents),
            "chunks_created": len(chunks),
            "storage": "supabase_pgvector",
            "user_id": user_id
        }

    # Fallback to FAISS (ephemeral storage)
    print("⚠️  Using FAISS (ephemeral storage) - set SUPABASE_DATABASE_URL for persistence")
    embeddings = get_embeddings()
    db = FAISS.from_documents(chunks, embeddings)

    # Determine vector store path
    if user_id:
        vector_path = f"{VECTOR_STORE_BASE}/{user_id}/faiss_index"
    else:
        vector_path = f"{VECTOR_STORE_BASE}/faiss_index"

    # Save vector store
    os.makedirs(vector_path, exist_ok=True)
    db.save_local(vector_path)

    print(f"✅ Documents ingested successfully to {vector_path}")

    return {
        "status": "success",
        "documents_processed": len(documents),
        "chunks_created": len(chunks),
        "vector_store_path": vector_path,
        "storage": "faiss",
        "user_id": user_id
    }


if __name__ == "__main__":
    result = ingest_docs()
    print(result)
