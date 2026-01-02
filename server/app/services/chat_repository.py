from app.db.database import SessionLocal
from app.db.models import Conversation, Message

def create_conversation(user_id: str, title: str):
    db = SessionLocal()
    convo = Conversation(user_id=user_id, title=title)
    db.add(convo)
    db.commit()
    db.refresh(convo)
    db.close()
    return convo.id

def save_message(conversation_id: int, role: str, content: str):
    db = SessionLocal()
    msg = Message(
        conversation_id=conversation_id,
        role=role,
        content=content
    )
    db.add(msg)
    db.commit()
    db.close()
