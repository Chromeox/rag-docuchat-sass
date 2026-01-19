#!/usr/bin/env python3
"""
Test script for the document upload endpoint.
This creates sample files and tests the upload functionality.
"""
import requests
from pathlib import Path

# Configuration
BASE_URL = "http://localhost:8000"
UPLOAD_ENDPOINT = f"{BASE_URL}/api/upload"
INFO_ENDPOINT = f"{BASE_URL}/api/upload/info"

def create_test_files():
    """Create sample test files for upload testing."""
    test_dir = Path("test_files")
    test_dir.mkdir(exist_ok=True)

    # Create a sample TXT file
    txt_file = test_dir / "sample_document.txt"
    with open(txt_file, "w") as f:
        f.write("This is a sample text document for testing the upload functionality.\n")
        f.write("It contains multiple lines of text.\n")
        f.write("The RAG system will process this document.\n")

    # Create another TXT file
    txt_file2 = test_dir / "another_document.txt"
    with open(txt_file2, "w") as f:
        f.write("This is another sample document.\n")
        f.write("Testing multiple file uploads.\n")

    print(f"✓ Created test files in {test_dir}/")
    return [txt_file, txt_file2]


def test_upload_info():
    """Test the upload info endpoint."""
    print("\n=== Testing Upload Info Endpoint ===")
    try:
        response = requests.get(INFO_ENDPOINT)
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Upload info retrieved successfully:")
            print(f"  - Allowed extensions: {data['allowed_extensions']}")
            print(f"  - Max file size: {data['max_file_size_mb']}MB")
            print(f"  - Upload directory: {data['upload_directory']}")
            return True
        else:
            print(f"✗ Failed with status {response.status_code}: {response.text}")
            return False
    except requests.exceptions.ConnectionError:
        print("✗ Cannot connect to server. Is it running on http://localhost:8000?")
        print("  Start the server with: uvicorn app.main:app --reload")
        return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False


def test_single_upload(file_path):
    """Test uploading a single file."""
    print(f"\n=== Testing Single File Upload: {file_path.name} ===")
    try:
        with open(file_path, "rb") as f:
            files = {"files": (file_path.name, f, "text/plain")}
            response = requests.post(UPLOAD_ENDPOINT, files=files)

        if response.status_code == 200:
            data = response.json()
            print(f"✓ Upload successful!")
            print(f"  Message: {data['message']}")
            for file_info in data['files']:
                print(f"  - {file_info['filename']} ({file_info['size']} bytes)")
            return True
        else:
            print(f"✗ Failed with status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False


def test_multiple_upload(file_paths):
    """Test uploading multiple files at once."""
    print(f"\n=== Testing Multiple File Upload ({len(file_paths)} files) ===")
    try:
        files = []
        file_handles = []

        for file_path in file_paths:
            f = open(file_path, "rb")
            file_handles.append(f)
            files.append(("files", (file_path.name, f, "text/plain")))

        response = requests.post(UPLOAD_ENDPOINT, files=files)

        # Close all file handles
        for f in file_handles:
            f.close()

        if response.status_code == 200:
            data = response.json()
            print(f"✓ Upload successful!")
            print(f"  Message: {data['message']}")
            for file_info in data['files']:
                print(f"  - {file_info['filename']} ({file_info['size']} bytes)")
            return True
        else:
            print(f"✗ Failed with status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False


def test_invalid_file_type():
    """Test uploading an invalid file type."""
    print(f"\n=== Testing Invalid File Type (.py) ===")
    try:
        # Create a Python file (not allowed)
        test_file = Path("test_files/invalid.py")
        with open(test_file, "w") as f:
            f.write("print('This file should be rejected')")

        with open(test_file, "rb") as f:
            files = {"files": (test_file.name, f, "text/x-python")}
            response = requests.post(UPLOAD_ENDPOINT, files=files)

        if response.status_code == 400:
            print(f"✓ Correctly rejected invalid file type")
            print(f"  Message: {response.json()['detail']}")
            return True
        else:
            print(f"✗ Expected status 400, got {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False


def main():
    """Run all tests."""
    print("=" * 60)
    print("Document Upload Endpoint Test Suite")
    print("=" * 60)

    # Create test files
    test_files = create_test_files()

    # Run tests
    results = []
    results.append(("Upload Info", test_upload_info()))

    if results[0][1]:  # Only continue if server is running
        results.append(("Single Upload", test_single_upload(test_files[0])))
        results.append(("Multiple Upload", test_multiple_upload(test_files)))
        results.append(("Invalid File Type", test_invalid_file_type()))

    # Summary
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    passed = sum(1 for _, result in results if result)
    total = len(results)

    for test_name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status}: {test_name}")

    print(f"\nTotal: {passed}/{total} tests passed")

    if passed == total:
        print("\n🎉 All tests passed!")
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")


if __name__ == "__main__":
    main()
