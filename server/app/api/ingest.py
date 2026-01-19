from typing import Optional
from fastapi import APIRouter, HTTPException, Header, Depends, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.embeddings.ingest import ingest_docs
from app.services.retrieval_service import get_vector_db, clear_vector_db_cache
from app.db.database import SessionLocal
from app.services.document_repository import DocumentRepository
from app.core.rate_limiter import limiter

router = APIRouter()


def get_db():
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class IngestRequest(BaseModel):
    user_id: Optional[str] = None


class IngestResponse(BaseModel):
    status: str
    message: str
    documents_processed: int = 0
    chunks_created: int = 0
    vector_store_path: str = ""
    user_id: Optional[str] = None


class IngestStatusResponse(BaseModel):
    status: str
    message: str
    user_id: Optional[str] = None


@router.post("/ingest", response_model=IngestResponse)
@limiter.limit("5/minute")
async def trigger_ingestion(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Trigger document ingestion for a specific user.

    This endpoint will:
    1. Process all files in the user's uploaded_docs/{user_id}/ directory
    2. Create text embeddings using HuggingFace (free)
    3. Build a FAISS vector database
    4. Save the vector store to vector_store/{user_id}/faiss_index
    5. Update document statuses in the database

    Requires X-User-ID header (Clerk user ID)

    Returns:
        IngestResponse with status and processing details
    """
    # Get authenticated user_id from middleware
    user_id = request.state.user_id

    try:
        doc_repo = DocumentRepository(db)

        # Get pending documents for this user
        pending_docs = doc_repo.get_by_user_and_status(user_id, "pending")

        if not pending_docs:
            # Check if user has any documents at all
            all_docs = doc_repo.get_by_user(user_id)
            if not all_docs:
                raise HTTPException(
                    status_code=404,
                    detail=f"No documents found for user {user_id}"
                )
            else:
                return IngestResponse(
                    status="success",
                    message="No pending documents to ingest. All documents are already processed.",
                    documents_processed=0,
                    chunks_created=0,
                    vector_store_path=f"vector_store/{user_id}/faiss_index",
                    user_id=user_id
                )

        # Run ingestion for this user
        result = ingest_docs(user_id=user_id)

        # Update document statuses to "ingested"
        for doc in pending_docs:
            doc_repo.update_status(
                doc.id,
                status="ingested",
                chunk_count=result["chunks_created"] // len(pending_docs)  # Approximate
            )

        # Clear the cached vector DB so it reloads with new data
        clear_vector_db_cache(user_id)

        return IngestResponse(
            status=result["status"],
            message=f"Successfully ingested {len(pending_docs)} document(s). Vector store ready for queries.",
            documents_processed=result["documents_processed"],
            chunks_created=result["chunks_created"],
            vector_store_path=result["vector_store_path"],
            user_id=user_id
        )

    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Mark documents as error
        doc_repo = DocumentRepository(db)
        pending_docs = doc_repo.get_by_user_and_status(user_id, "pending")
        for doc in pending_docs:
            doc_repo.update_status(
                doc.id,
                status="error",
                error_message=str(e)
            )

        raise HTTPException(
            status_code=500,
            detail=f"Failed to ingest documents: {str(e)}"
        )


@router.get("/ingest/status", response_model=IngestStatusResponse)
@limiter.limit("60/minute")
async def check_ingestion_status(
    request: Request
):
    """
    Check if vector store exists and is ready for queries for a specific user.

    Requires X-User-ID header (Clerk user ID)

    Returns:
        IngestStatusResponse indicating if the vector store is ready
    """
    # Get authenticated user_id from middleware
    user_id = request.state.user_id

    try:
        # Try to load the user's vector DB
        get_vector_db(user_id)
        return IngestStatusResponse(
            status="ready",
            message=f"Vector store is ready for queries for user {user_id}",
            user_id=user_id
        )
    except RuntimeError:
        return IngestStatusResponse(
            status="not_ready",
            message=f"Vector store not found for user {user_id}. Please upload and ingest documents first.",
            user_id=user_id
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to check ingestion status: {str(e)}"
        )
