from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.db.database import SessionLocal
from app.db.models import Conversation, Message
from sqlalchemy import desc
from app.core.rate_limiter import limiter

router = APIRouter()

# Pydantic models for request/response
class MessageResponse(BaseModel):
    id: int
    conversation_id: int
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True

class ConversationResponse(BaseModel):
    id: int
    user_id: str
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: Optional[int] = None
    last_message: Optional[str] = None

    class Config:
        from_attributes = True

class CreateConversationRequest(BaseModel):
    title: str

class UpdateConversationRequest(BaseModel):
    title: str


@router.post("/conversations", response_model=ConversationResponse)
@limiter.limit("20/minute")
async def create_conversation(request: Request, req: CreateConversationRequest):
    """Create a new conversation for a user"""
    # Get authenticated user_id from middleware
    user_id = request.state.user_id

    db = SessionLocal()
    try:
        convo = Conversation(
            user_id=user_id,
            title=req.title
        )
        db.add(convo)
        db.commit()
        db.refresh(convo)

        return ConversationResponse(
            id=convo.id,
            user_id=convo.user_id,
            title=convo.title,
            created_at=convo.created_at,
            updated_at=convo.updated_at,
            message_count=0
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@router.get("/conversations", response_model=List[ConversationResponse])
@limiter.limit("60/minute")
async def list_conversations(
    request: Request
):
    """List all conversations for a user, ordered by most recent"""
    # Get authenticated user_id from middleware
    user_id = request.state.user_id

    db = SessionLocal()
    try:
        conversations = db.query(Conversation)\
            .filter(Conversation.user_id == user_id)\
            .order_by(desc(Conversation.updated_at))\
            .all()

        result = []
        for convo in conversations:
            # Get message count and last message preview
            messages = db.query(Message)\
                .filter(Message.conversation_id == convo.id)\
                .order_by(desc(Message.created_at))\
                .all()

            last_msg = messages[0].content[:100] + "..." if messages and len(messages[0].content) > 100 else (messages[0].content if messages else None)

            result.append(ConversationResponse(
                id=convo.id,
                user_id=convo.user_id,
                title=convo.title,
                created_at=convo.created_at,
                updated_at=convo.updated_at,
                message_count=len(messages),
                last_message=last_msg
            ))

        return result
    finally:
        db.close()


@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
@limiter.limit("60/minute")
async def get_conversation(request: Request, conversation_id: int):
    """Get a specific conversation"""
    db = SessionLocal()
    try:
        convo = db.query(Conversation)\
            .filter(Conversation.id == conversation_id)\
            .first()

        if not convo:
            raise HTTPException(status_code=404, detail="Conversation not found")

        message_count = db.query(Message)\
            .filter(Message.conversation_id == conversation_id)\
            .count()

        return ConversationResponse(
            id=convo.id,
            user_id=convo.user_id,
            title=convo.title,
            created_at=convo.created_at,
            updated_at=convo.updated_at,
            message_count=message_count
        )
    finally:
        db.close()


@router.get("/conversations/{conversation_id}/messages", response_model=List[MessageResponse])
@limiter.limit("60/minute")
async def get_conversation_messages(request: Request, conversation_id: int):
    """Get all messages in a conversation"""
    db = SessionLocal()
    try:
        # Verify conversation exists
        convo = db.query(Conversation)\
            .filter(Conversation.id == conversation_id)\
            .first()

        if not convo:
            raise HTTPException(status_code=404, detail="Conversation not found")

        messages = db.query(Message)\
            .filter(Message.conversation_id == conversation_id)\
            .order_by(Message.created_at)\
            .all()

        return [
            MessageResponse(
                id=msg.id,
                conversation_id=msg.conversation_id,
                role=msg.role,
                content=msg.content,
                created_at=msg.created_at
            )
            for msg in messages
        ]
    finally:
        db.close()


@router.patch("/conversations/{conversation_id}", response_model=ConversationResponse)
@limiter.limit("20/minute")
async def update_conversation(request: Request, conversation_id: int, req: UpdateConversationRequest):
    """Update a conversation title"""
    db = SessionLocal()
    try:
        convo = db.query(Conversation)\
            .filter(Conversation.id == conversation_id)\
            .first()

        if not convo:
            raise HTTPException(status_code=404, detail="Conversation not found")

        convo.title = req.title
        db.commit()
        db.refresh(convo)

        return ConversationResponse(
            id=convo.id,
            user_id=convo.user_id,
            title=convo.title,
            created_at=convo.created_at,
            updated_at=convo.updated_at
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@router.delete("/conversations/{conversation_id}")
@limiter.limit("20/minute")
async def delete_conversation(request: Request, conversation_id: int):
    """Delete a conversation and all its messages"""
    db = SessionLocal()
    try:
        convo = db.query(Conversation)\
            .filter(Conversation.id == conversation_id)\
            .first()

        if not convo:
            raise HTTPException(status_code=404, detail="Conversation not found")

        # Delete all messages (CASCADE should handle this, but explicit is better)
        db.query(Message)\
            .filter(Message.conversation_id == conversation_id)\
            .delete()

        db.delete(convo)
        db.commit()

        return {"status": "success", "message": "Conversation deleted"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()
