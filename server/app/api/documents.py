import os
import shutil
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Header, Depends, Request
from pydantic import BaseModel
from datetime import datetime
from pathlib import Path
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.services.document_repository import DocumentRepository
from app.services.quota_service import QuotaService
from app.embeddings.ingest import ingest_docs
from app.services.retrieval_service import clear_vector_db_cache
from app.core.rate_limiter import limiter

router = APIRouter()


def get_db():
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class DocumentResponse(BaseModel):
    id: int
    filename: str
    original_filename: str
    file_size: int
    file_type: str
    upload_date: datetime
    status: str
    chunk_count: Optional[int]
    error_message: Optional[str]

    class Config:
        from_attributes = True


class DocumentListResponse(BaseModel):
    documents: List[DocumentResponse]
    total: int


class DeleteResponse(BaseModel):
    message: str
    success: bool


@router.get("/documents", response_model=DocumentListResponse)
@limiter.limit("60/minute")
async def list_documents(
    request: Request,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    List all documents for the authenticated user.

    Query Parameters:
    - status: Optional filter by status (pending, ingested, error)

    Returns:
        List of user's documents with metadata
    """
    # Get authenticated user_id from middleware
    user_id = request.state.user_id

    doc_repo = DocumentRepository(db)

    if status:
        documents = doc_repo.get_by_user_and_status(user_id, status)
    else:
        documents = doc_repo.get_by_user(user_id)

    return DocumentListResponse(
        documents=[DocumentResponse.model_validate(doc) for doc in documents],
        total=len(documents)
    )


@router.get("/documents/{document_id}", response_model=DocumentResponse)
@limiter.limit("60/minute")
async def get_document(
    request: Request,
    document_id: int,
    db: Session = Depends(get_db)
):
    """
    Get details of a specific document.

    Returns:
        Document metadata
    """
    # Get authenticated user_id from middleware
    user_id = request.state.user_id

    doc_repo = DocumentRepository(db)
    document = doc_repo.get_by_id(document_id)

    if not document:
        raise HTTPException(
            status_code=404,
            detail=f"Document {document_id} not found"
        )

    # Verify ownership
    if document.user_id != user_id:
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to access this document"
        )

    return DocumentResponse.model_validate(document)


@router.delete("/documents/{document_id}", response_model=DeleteResponse)
@limiter.limit("10/minute")
async def delete_document(
    request: Request,
    document_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete a document (file + DB record + from vector store).

    This will:
    1. Delete the physical file from disk
    2. Delete the database record
    3. Rebuild the vector store without this document

    Returns:
        Success message
    """
    # Get authenticated user_id from middleware
    user_id = request.state.user_id

    doc_repo = DocumentRepository(db)
    document = doc_repo.get_by_id(document_id)

    if not document:
        raise HTTPException(
            status_code=404,
            detail=f"Document {document_id} not found"
        )

    # Verify ownership
    if document.user_id != user_id:
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to delete this document"
        )

    try:
        # Store file size before deletion for quota tracking
        file_size = document.file_size

        # Delete physical file
        file_path = Path(document.file_path)
        if file_path.exists():
            file_path.unlink()

        # Delete database record
        doc_repo.delete(document_id)

        # Update quota tracking
        quota_service = QuotaService(db)
        quota_service.decrement_document_count(user_id, file_size)

        # Check if user has any remaining documents
        remaining_docs = doc_repo.get_by_user(user_id)

        if remaining_docs:
            # Rebuild vector store with remaining documents
            try:
                # Re-ingest all remaining documents
                ingest_docs(user_id=user_id)
                clear_vector_db_cache(user_id)
            except Exception as e:
                print(f"Warning: Failed to rebuild vector store after deletion: {e}")
                # Continue anyway - the document was deleted
        else:
            # No documents left - delete user's vector store directory
            vector_store_path = Path(f"vector_store/{user_id}")
            if vector_store_path.exists():
                shutil.rmtree(vector_store_path)
            clear_vector_db_cache(user_id)

        return DeleteResponse(
            message=f"Document '{document.original_filename}' deleted successfully",
            success=True
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete document: {str(e)}"
        )


@router.post("/documents/{document_id}/reingest", response_model=DocumentResponse)
@limiter.limit("5/minute")
async def reingest_document(
    request: Request,
    document_id: int,
    db: Session = Depends(get_db)
):
    """
    Re-ingest a specific document.

    This will:
    1. Set the document status to 'pending'
    2. Re-run ingestion for all user documents
    3. Update the document status

    Returns:
        Updated document metadata
    """
    # Get authenticated user_id from middleware
    user_id = request.state.user_id

    doc_repo = DocumentRepository(db)
    document = doc_repo.get_by_id(document_id)

    if not document:
        raise HTTPException(
            status_code=404,
            detail=f"Document {document_id} not found"
        )

    # Verify ownership
    if document.user_id != user_id:
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to reingest this document"
        )

    try:
        # Reset document status to pending
        doc_repo.update_status(document_id, status="pending", error_message=None)

        # Re-ingest all user documents
        result = ingest_docs(user_id=user_id)

        # Update document status
        doc_repo.update_status(
            document_id,
            status="ingested",
            chunk_count=result["chunks_created"] // result["documents_processed"]
        )

        # Clear cache
        clear_vector_db_cache(user_id)

        # Get updated document
        updated_doc = doc_repo.get_by_id(document_id)

        return DocumentResponse.model_validate(updated_doc)

    except Exception as e:
        # Mark as error
        doc_repo.update_status(
            document_id,
            status="error",
            error_message=str(e)
        )

        raise HTTPException(
            status_code=500,
            detail=f"Failed to reingest document: {str(e)}"
        )
