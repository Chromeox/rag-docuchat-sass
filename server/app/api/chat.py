from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.core.deps import get_current_user
from app.services.llm_service import generate_answer

router = APIRouter()

class ChatRequest(BaseModel):
    question: str
    conversation_id: int | None = None

@router.post("/chat")
def chat(req: ChatRequest, user=Depends(get_current_user)):
    print("user", user)
    answer, convo_id = generate_answer(
        user["sub"],
        req.question,
        req.conversation_id
    )
    return {"answer": answer, "conversation_id": convo_id}
