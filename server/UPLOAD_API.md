# Document Upload API

## Overview

The Document Upload API provides endpoints for uploading documents (PDF and TXT files) to the RAG DocuChat system. Uploaded documents are stored in the `uploaded_docs/` directory and can be processed for semantic search and question-answering.

## Endpoints

### 1. Upload Documents

**POST** `/api/upload`

Upload one or more documents for RAG processing.

#### Request

- **Content-Type**: `multipart/form-data`
- **Body**: Form data with one or more files

```bash
# Single file upload
curl -X POST "http://localhost:8000/api/upload" \
  -F "files=@document.pdf"

# Multiple file upload
curl -X POST "http://localhost:8000/api/upload" \
  -F "files=@document1.pdf" \
  -F "files=@document2.txt"
```

#### Response (Success - 200)

```json
{
  "message": "Successfully uploaded 2 file(s)",
  "files": [
    {
      "filename": "document1.pdf",
      "size": 245632,
      "content_type": "application/pdf",
      "saved_path": "/path/to/uploaded_docs/document1.pdf"
    },
    {
      "filename": "document2.txt",
      "size": 5120,
      "content_type": "text/plain",
      "saved_path": "/path/to/uploaded_docs/document2.txt"
    }
  ]
}
```

#### Response (Partial Success - 200)

When some files succeed and others fail:

```json
{
  "message": "Successfully uploaded 1 file(s). 1 file(s) failed: invalid.py: File type '.py' not allowed",
  "files": [
    {
      "filename": "document.pdf",
      "size": 245632,
      "content_type": "application/pdf",
      "saved_path": "/path/to/uploaded_docs/document.pdf"
    }
  ]
}
```

#### Response (All Failed - 400)

```json
{
  "detail": "All uploads failed. Errors: file1.exe: File type '.exe' not allowed; file2.pdf: File size (12.5MB) exceeds maximum allowed size (10.0MB)"
}
```

#### Response (No Files - 400)

```json
{
  "detail": "No files provided"
}
```

#### Response (File Too Large - 413)

```json
{
  "detail": "File size (12.5MB) exceeds maximum allowed size (10.0MB)"
}
```

### 2. Get Upload Configuration

**GET** `/api/upload/info`

Get information about upload configuration and constraints.

#### Request

```bash
curl -X GET "http://localhost:8000/api/upload/info"
```

#### Response (200)

```json
{
  "allowed_extensions": [".pdf", ".txt"],
  "max_file_size_mb": 10.0,
  "upload_directory": "/path/to/uploaded_docs"
}
```

## Constraints

### File Types

Only the following file types are allowed:
- **PDF**: `.pdf`
- **Text**: `.txt`

### File Size

- **Maximum size per file**: 10 MB (10,485,760 bytes)
- Files exceeding this limit will be rejected with a 413 status code

### File Naming

- Duplicate filenames are automatically handled by appending a number
- Example: `document.pdf` → `document_1.pdf` → `document_2.pdf`
- File path traversal is prevented (only the filename is used)

## Error Handling

The API implements comprehensive error handling:

1. **Validation Errors**: Invalid file types and oversized files are rejected
2. **Partial Success**: When uploading multiple files, successful uploads are saved even if some fail
3. **Graceful Degradation**: Detailed error messages for each failed file
4. **Safe File Operations**: Prevents path traversal and handles file system errors

## JavaScript/TypeScript Example

```typescript
// Single file upload
async function uploadDocument(file: File) {
  const formData = new FormData();
  formData.append('files', file);

  const response = await fetch('http://localhost:8000/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  return await response.json();
}

// Multiple file upload
async function uploadDocuments(files: File[]) {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('files', file);
  });

  const response = await fetch('http://localhost:8000/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  return await response.json();
}

// React example with drag-and-drop
function FileUpload() {
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);

    try {
      const result = await uploadDocuments(files);
      console.log('Upload successful:', result);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  return (
    <div onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
      Drop files here
    </div>
  );
}
```

## Python Example

```python
import requests

# Single file upload
def upload_file(file_path: str):
    with open(file_path, 'rb') as f:
        files = {'files': f}
        response = requests.post('http://localhost:8000/api/upload', files=files)
    return response.json()

# Multiple file upload
def upload_files(file_paths: list[str]):
    files = []
    for path in file_paths:
        f = open(path, 'rb')
        files.append(('files', f))

    response = requests.post('http://localhost:8000/api/upload', files=files)

    # Close all files
    for _, f in files:
        f.close()

    return response.json()

# Usage
result = upload_file('document.pdf')
print(f"Uploaded: {result['files'][0]['filename']}")

result = upload_files(['doc1.pdf', 'doc2.txt'])
print(f"Uploaded {len(result['files'])} files")
```

## Testing

A comprehensive test suite is provided in `test_upload.py`:

```bash
# Start the server
cd server
source venv/bin/activate
uvicorn app.main:app --reload

# In another terminal, run the tests
cd server
source venv/bin/activate
python test_upload.py
```

The test suite covers:
- Single file upload
- Multiple file upload
- Invalid file type rejection
- File size validation
- Upload configuration retrieval

## Directory Structure

```
server/
├── app/
│   ├── api/
│   │   └── upload.py          # Upload endpoint implementation
│   └── main.py                # FastAPI app with router registration
├── uploaded_docs/             # Upload destination directory
├── test_upload.py             # Test suite
└── UPLOAD_API.md             # This documentation
```

## Security Considerations

1. **File Type Validation**: Only whitelisted extensions are allowed
2. **Size Limits**: Prevents DoS attacks via large file uploads
3. **Path Traversal Protection**: Only the filename is used, preventing directory traversal
4. **Error Information**: Detailed errors are provided but don't expose system internals

## Future Enhancements

Potential improvements for future versions:

- [ ] Add DOCX support
- [ ] Implement virus scanning
- [ ] Add user-specific upload quotas
- [ ] Store file metadata in database
- [ ] Add file deletion endpoint
- [ ] Implement chunked uploads for large files
- [ ] Add progress tracking for uploads
- [ ] Support URL-based document ingestion
