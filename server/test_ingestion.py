#!/usr/bin/env python3
"""
Test script for document ingestion pipeline.
Run this to verify the ingestion works correctly.
"""

import sys
import os
from pathlib import Path

# Add the server directory to the path so we can import app modules
sys.path.insert(0, str(Path(__file__).parent))

from app.embeddings.ingest import ingest_docs


def main():
    print("=" * 60)
    print("DocuChat - Ingestion Pipeline Test")
    print("=" * 60)
    print()

    # Check if uploaded_docs directory exists
    upload_dir = Path("uploaded_docs")
    if not upload_dir.exists():
        print("ERROR: uploaded_docs directory not found!")
        print("Please create it and add some test documents.")
        return 1

    # List files in uploaded_docs
    files = list(upload_dir.rglob("*.*"))
    print(f"Files found in uploaded_docs/:")
    for f in files:
        print(f"  - {f.name} ({f.stat().st_size} bytes)")
    print()

    if not files:
        print("WARNING: No files found in uploaded_docs/")
        print("Please add some .txt or .pdf files to test ingestion.")
        return 1

    # Run ingestion
    print("Starting ingestion...")
    print("-" * 60)
    try:
        result = ingest_docs()
        print()
        print("=" * 60)
        print("INGESTION SUCCESSFUL!")
        print("=" * 60)
        print(f"Status: {result['status']}")
        print(f"Documents processed: {result['documents_processed']}")
        print(f"Chunks created: {result['chunks_created']}")
        print(f"Vector store saved to: {result['vector_store_path']}")
        print()

        # Verify vector store was created
        vector_path = Path(result['vector_store_path'])
        if vector_path.exists():
            print("Vector store files created:")
            for f in vector_path.iterdir():
                print(f"  - {f.name}")
        else:
            print("WARNING: Vector store directory not found!")
            return 1

        print()
        print("Next steps:")
        print("1. Start the FastAPI server: uvicorn app.main:app --reload")
        print("2. Test the /api/ingest endpoint via POST request")
        print("3. Upload documents via /api/upload endpoint")
        print("4. Query the chatbot with questions about your documents")
        print()

        return 0

    except Exception as e:
        print()
        print("=" * 60)
        print("INGESTION FAILED!")
        print("=" * 60)
        print(f"Error: {str(e)}")
        print()
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
