import os
import shutil
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, status, Depends, Header, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.services.document_repository import DocumentRepository
from app.services.quota_service import QuotaService, QuotaExceededError
from app.core.rate_limiter import limiter
from app.utils.sanitize import sanitize_filename, validate_user_id
from app.utils.file_validator import validate_file_comprehensive

router = APIRouter()

# Configuration
# Use /tmp for Railway (ephemeral but writable)
# TODO: Switch to S3/R2 for production persistent storage
UPLOAD_DIR = Path("/tmp/uploaded_docs") if os.getenv("RAILWAY_ENVIRONMENT") else Path(__file__).parent.parent.parent / "uploaded_docs"
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB in bytes
ALLOWED_EXTENSIONS = {
    # Documents
    ".pdf", ".txt", ".md",
    ".docx", ".doc",
    # Data files
    ".csv", ".json",
    # Code files (for technical documentation)
    ".py", ".js", ".jsx", ".ts", ".tsx",
    ".html", ".css"
}

# Ensure upload directory exists
UPLOAD_DIR.mkdir(exist_ok=True)


def get_db():
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class DocumentInfo(BaseModel):
    id: int
    filename: str
    original_filename: str
    size: int
    content_type: str
    saved_path: str
    status: str


class UploadResponse(BaseModel):
    message: str
    documents: List[DocumentInfo]


def validate_file(file: UploadFile) -> None:
    """
    Validate file type and size before upload.

    Args:
        file: The uploaded file

    Raises:
        HTTPException: If validation fails
    """
    # Check file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type '{file_ext}' not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Check file size (read first chunk to check)
    file.file.seek(0, 2)  # Move to end of file
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning

    if file_size > MAX_FILE_SIZE:
        max_mb = MAX_FILE_SIZE / (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size ({file_size / (1024 * 1024):.2f}MB) exceeds maximum allowed size ({max_mb}MB)"
        )


def save_file(
    file: UploadFile,
    user_id: str,
    doc_repo: DocumentRepository,
    quota_service: QuotaService
) -> DocumentInfo:
    """
    Save uploaded file to disk with comprehensive security validation.

    Args:
        file: The uploaded file
        user_id: The user's Clerk ID
        doc_repo: Document repository instance
        quota_service: Quota service instance

    Returns:
        DocumentInfo object with file metadata

    Raises:
        HTTPException: If save operation fails
        QuotaExceededError: If quota limits are exceeded
    """
    try:
        # Get file size
        file.file.seek(0, 2)
        file_size = file.file.tell()
        file.file.seek(0)

        # Check quota BEFORE saving
        quota_service.check_document_quota(user_id, file_size)

        # Create user-specific directory
        user_dir = UPLOAD_DIR / user_id
        user_dir.mkdir(exist_ok=True, parents=True)

        # Sanitize filename (prevent path traversal)
        try:
            safe_filename = sanitize_filename(file.filename)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid filename: {str(e)}"
            )

        original_filename = safe_filename
        file_path = user_dir / safe_filename

        # Handle duplicate filenames by appending a number
        counter = 1
        original_stem = file_path.stem
        while file_path.exists():
            safe_filename = f"{original_stem}_{counter}{file_path.suffix}"
            file_path = user_dir / safe_filename
            counter += 1

        # Save file to temporary location first
        temp_path = file_path.with_suffix(file_path.suffix + '.tmp')

        try:
            # Save file
            with temp_path.open("wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

            # Perform comprehensive security validation
            validate_file_comprehensive(temp_path, MAX_FILE_SIZE)

            # If validation passes, move to final location
            temp_path.rename(file_path)

        except Exception as e:
            # Clean up temp file if validation fails
            if temp_path.exists():
                temp_path.unlink()
            raise

        # Get file metadata
        actual_file_size = file_path.stat().st_size
        file_type = file_path.suffix.lower()

        # Create database record
        document = doc_repo.create(
            user_id=user_id,
            filename=safe_filename,
            original_filename=original_filename,
            file_path=str(file_path),
            file_size=actual_file_size,
            file_type=file_type
        )

        # Update quota tracking
        quota_service.increment_document_count(user_id, actual_file_size)

        return DocumentInfo(
            id=document.id,
            filename=safe_filename,
            original_filename=original_filename,
            size=actual_file_size,
            content_type=file.content_type or "application/octet-stream",
            saved_path=str(file_path),
            status=document.status
        )

    except QuotaExceededError:
        raise
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}"
        )


@router.post("/upload", response_model=UploadResponse)
@limiter.limit("10/minute")
async def upload_documents(
    request: Request,
    files: List[UploadFile] = File(..., description="Documents to upload (max 10MB each)"),
    db: Session = Depends(get_db)
):
    """
    Upload one or more documents for RAG processing.

    Security Features:
    - User quota enforcement (documents, storage, queries)
    - Filename sanitization (path traversal prevention)
    - MIME type validation
    - Malicious content detection
    - Zip bomb protection
    - PDF executable code scanning
    - Rate limiting (10 requests/minute)

    Accepts:
    - Documents: PDF, DOCX, TXT, MD
    - Data: CSV, JSON
    - Code: PY, JS, JSX, TS, TSX, HTML, CSS

    Constraints:
    - Maximum file size: 10MB per file
    - Multiple files can be uploaded in a single request
    - Requires X-User-ID header (Clerk user ID)
    - Free tier: 50 documents, 500MB storage

    Returns:
    - Success message
    - List of uploaded document information with IDs
    """
    # Get authenticated user_id from middleware
    user_id = request.state.user_id

    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No files provided"
        )

    doc_repo = DocumentRepository(db)
    quota_service = QuotaService(db)
    uploaded_documents: List[DocumentInfo] = []
    errors: List[str] = []

    for file in files:
        try:
            # Validate file
            validate_file(file)

            # Save file with security checks and quota enforcement
            doc_info = save_file(file, user_id, doc_repo, quota_service)
            uploaded_documents.append(doc_info)

        except QuotaExceededError as e:
            # Quota errors should stop the entire upload
            raise
        except HTTPException as e:
            errors.append(f"{file.filename}: {e.detail}")
        except Exception as e:
            errors.append(f"{file.filename}: Unexpected error - {str(e)}")

    # If all files failed, return error
    if not uploaded_documents and errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"All uploads failed. Errors: {'; '.join(errors)}"
        )

    # Prepare response
    response_message = f"Successfully uploaded {len(uploaded_documents)} file(s)"
    if errors:
        response_message += f". {len(errors)} file(s) failed: {'; '.join(errors)}"

    return UploadResponse(
        message=response_message,
        documents=uploaded_documents
    )


@router.get("/upload/info")
@limiter.limit("60/minute")
async def get_upload_info(request: Request):
    """
    Get information about upload configuration.

    Returns:
    - Allowed file types
    - Maximum file size
    - Upload directory
    - Security features enabled
    """
    return {
        "allowed_extensions": list(ALLOWED_EXTENSIONS),
        "max_file_size_mb": MAX_FILE_SIZE / (1024 * 1024),
        "upload_directory": str(UPLOAD_DIR),
        "security_features": [
            "Quota enforcement",
            "Filename sanitization",
            "MIME type validation",
            "Malicious content detection",
            "Zip bomb protection",
            "PDF executable scanning",
            "Rate limiting"
        ]
    }


@router.get("/upload/quota")
@limiter.limit("60/minute")
async def get_user_quota(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Get current quota usage and limits for the user.

    Returns:
    - Current tier
    - Document count and limits
    - Storage usage and limits
    - Query usage and limits
    """
    # Get authenticated user_id from middleware
    user_id = request.state.user_id

    quota_service = QuotaService(db)
    return quota_service.get_usage_stats(user_id)
