import os
from pathlib import Path
from typing import List, Optional
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


UPLOADED_DOCS_PATH = "uploaded_docs"
VECTOR_STORE_BASE = "vector_store"


def load_document(file_path: Path, user_id: Optional[str] = None) -> List[Document]:
    """
    Load a single document using the appropriate loader based on file extension.

    Args:
        file_path: Path to the document file
        user_id: Optional user ID to add to document metadata

    Returns:
        List of Document objects with metadata
    """
    file_ext = file_path.suffix.lower()

    try:
        if file_ext == '.pdf':
            loader = PyPDFLoader(str(file_path))
        elif file_ext in ['.docx', '.doc']:
            loader = UnstructuredWordDocumentLoader(str(file_path))
        elif file_ext == '.csv':
            loader = CSVLoader(str(file_path))
        elif file_ext in ['.txt', '.md', '.json', '.py', '.js', '.jsx', '.ts', '.tsx', '.html', '.css']:
            loader = TextLoader(str(file_path))
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


def ingest_docs(user_id: Optional[str] = None, data_path: Optional[str] = None):
    """
    Ingest documents from the specified directory and create FAISS vector store.

    Supports: PDF, DOCX, TXT, MD, CSV, JSON, and code files.

    Args:
        user_id: Optional user ID for user-specific ingestion. If provided, creates user-specific vector store.
        data_path: Optional custom directory path. If not provided, uses user_id to determine path.

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

    # Create embeddings and vector store
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
        "user_id": user_id
    }


if __name__ == "__main__":
    result = ingest_docs()
    print(result)
