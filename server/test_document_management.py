#!/usr/bin/env python3
"""
Test script for document management functionality.
Tests upload → ingest → query → delete flow.
"""

import requests
import os
from pathlib import Path

API_URL = "http://localhost:8000"
TEST_USER_ID = "test_user_123"

def print_section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print('='*60)

def test_upload():
    """Test document upload."""
    print_section("1. Testing Document Upload")

    # Create a test document
    test_content = """
    This is a test document about artificial intelligence.
    AI and machine learning are transforming technology.
    Deep learning models can process vast amounts of data.
    """

    test_file = Path("test_document.txt")
    test_file.write_text(test_content)

    try:
        with open(test_file, "rb") as f:
            files = {"files": (test_file.name, f, "text/plain")}
            headers = {"X-User-ID": TEST_USER_ID}

            response = requests.post(
                f"{API_URL}/api/upload",
                files=files,
                headers=headers
            )

        if response.status_code == 200:
            data = response.json()
            print(f"✅ Upload successful!")
            print(f"   Message: {data['message']}")
            print(f"   Documents uploaded: {len(data['documents'])}")
            if data['documents']:
                doc = data['documents'][0]
                print(f"   Document ID: {doc['id']}")
                print(f"   Filename: {doc['filename']}")
                print(f"   Status: {doc['status']}")
                return doc['id']
        else:
            print(f"❌ Upload failed: {response.status_code}")
            print(f"   Error: {response.text}")
            return None
    finally:
        # Cleanup
        if test_file.exists():
            test_file.unlink()

def test_list_documents():
    """Test listing documents."""
    print_section("2. Testing Document List")

    headers = {"X-User-ID": TEST_USER_ID}
    response = requests.get(f"{API_URL}/api/documents", headers=headers)

    if response.status_code == 200:
        data = response.json()
        print(f"✅ List successful!")
        print(f"   Total documents: {data['total']}")
        for doc in data['documents']:
            print(f"   - {doc['original_filename']} (ID: {doc['id']}, Status: {doc['status']})")
        return data['documents']
    else:
        print(f"❌ List failed: {response.status_code}")
        print(f"   Error: {response.text}")
        return []

def test_ingest():
    """Test document ingestion."""
    print_section("3. Testing Document Ingestion")

    headers = {"X-User-ID": TEST_USER_ID}
    response = requests.post(f"{API_URL}/api/ingest", headers=headers)

    if response.status_code == 200:
        data = response.json()
        print(f"✅ Ingestion successful!")
        print(f"   Status: {data['status']}")
        print(f"   Message: {data['message']}")
        print(f"   Documents processed: {data['documents_processed']}")
        print(f"   Chunks created: {data['chunks_created']}")
        print(f"   Vector store path: {data['vector_store_path']}")
        return True
    else:
        print(f"❌ Ingestion failed: {response.status_code}")
        print(f"   Error: {response.text}")
        return False

def test_query():
    """Test RAG query."""
    print_section("4. Testing RAG Query")

    payload = {
        "question": "What is this document about?",
        "user_id": TEST_USER_ID
    }

    response = requests.post(f"{API_URL}/chat", json=payload)

    if response.status_code == 200:
        # Read streaming response
        answer = response.text
        print(f"✅ Query successful!")
        print(f"   Answer: {answer[:200]}...")
        return True
    else:
        print(f"❌ Query failed: {response.status_code}")
        print(f"   Error: {response.text}")
        return False

def test_delete(document_id):
    """Test document deletion."""
    print_section("5. Testing Document Deletion")

    headers = {"X-User-ID": TEST_USER_ID}
    response = requests.delete(
        f"{API_URL}/api/documents/{document_id}",
        headers=headers
    )

    if response.status_code == 200:
        data = response.json()
        print(f"✅ Deletion successful!")
        print(f"   Message: {data['message']}")
        return True
    else:
        print(f"❌ Deletion failed: {response.status_code}")
        print(f"   Error: {response.text}")
        return False

def main():
    print("\n" + "="*60)
    print("  DocuChat - Document Management Test Suite")
    print("="*60)
    print(f"  Testing against: {API_URL}")
    print(f"  Test User ID: {TEST_USER_ID}")
    print("="*60)

    # Test flow
    doc_id = test_upload()
    if not doc_id:
        print("\n❌ Test suite failed at upload step")
        return

    documents = test_list_documents()

    ingest_success = test_ingest()
    if not ingest_success:
        print("\n⚠️  Ingestion failed, but continuing tests...")

    # Wait a moment for ingestion to complete
    import time
    time.sleep(2)

    # Check status after ingestion
    documents = test_list_documents()

    query_success = test_query()

    delete_success = test_delete(doc_id)

    # Final status check
    print_section("Final Status Check")
    documents = test_list_documents()

    print("\n" + "="*60)
    print("  Test Summary")
    print("="*60)
    print(f"  Upload:    {'✅' if doc_id else '❌'}")
    print(f"  List:      {'✅' if documents is not None else '❌'}")
    print(f"  Ingest:    {'✅' if ingest_success else '❌'}")
    print(f"  Query:     {'✅' if query_success else '❌'}")
    print(f"  Delete:    {'✅' if delete_success else '❌'}")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()
