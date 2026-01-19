from fastapi import APIRouter, Depends, Header, Request, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
import json

from app.core.deps import get_current_user
from app.services.llm_service import generate_answer
from app.services.quota_service import QuotaService, QuotaExceededError
from app.core.rate_limiter import limiter
from app.db.database import SessionLocal
from app.utils.sanitize import sanitize_message, validate_user_id

router = APIRouter()


def get_db():
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class ChatRequest(BaseModel):
    question: str
    conversation_id: int | None = None


class ChatResponse(BaseModel):
    answer: str
    conversation_id: int


@router.post("/chat")
@limiter.limit("30/minute")
async def chat(request: Request, req: ChatRequest, db: Session = Depends(get_db)):
    """
    Process a chat query with RAG context.

    Security Features:
    - Input sanitization (removes HTML, control chars)
    - Query quota enforcement
    - User ID validation
    - Rate limiting (30 requests/minute)

    Args:
        request: FastAPI request object
        req: Chat request with question and optional conversation ID
        db: Database session

    Returns:
        Streaming response with answer and conversation ID

    Raises:
        HTTPException: If validation fails
        QuotaExceededError: If query quota exceeded
    """
    # Get authenticated user_id from middleware
    user_id_raw = request.state.user_id

    # Validate user ID
    try:
        user_id = validate_user_id(user_id_raw)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid user ID: {str(e)}"
        )

    # Sanitize the question
    try:
        sanitized_question = sanitize_message(req.question, max_length=10000)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid question: {str(e)}"
        )

    # Check query quota
    quota_service = QuotaService(db)
    try:
        quota_service.check_query_quota(user_id)
    except QuotaExceededError:
        raise

    print(f"Chat request from user: {user_id}, question: {sanitized_question[:100]}...")

    try:
        # Generate answer with sanitized input
        answer, convo_id = generate_answer(
            user_id,
            sanitized_question,
            req.conversation_id
        )

        # Increment query count after successful response
        quota_service.increment_query_count(user_id)

        # Return streaming response with conversation_id in header
        async def generate():
            # Send conversation_id first as a JSON line
            yield json.dumps({"conversation_id": convo_id}) + "\n"
            # Then stream the answer
            yield answer

        return StreamingResponse(
            generate(),
            media_type="text/plain",
            headers={"X-Conversation-Id": str(convo_id)}
        )
    except Exception as e:
        print(f"Error in chat: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chat processing failed: {str(e)}"
        )
