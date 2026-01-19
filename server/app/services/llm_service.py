from unittest import result
from langchain_core.prompts import ChatPromptTemplate
from app.services.retrieval_service import retrieve_context
from app.services.chat_repository import create_conversation, save_message
from app.core.llm_factory import get_llm

# Lazy-load LLM to ensure .env is loaded first
_llm = None

def get_llm_instance():
    global _llm
    if _llm is None:
        _llm = get_llm()
    return _llm

def generate_answer(user_id: str, question: str, conversation_id: int = None):
    if not conversation_id:
        conversation_id = create_conversation(user_id, question[:50])

    # Retrieve context using user-specific vector store
    context = retrieve_context(question, user_id=user_id)

    # If no context (no documents ingested yet), answer directly without RAG
    if not context.strip():
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a helpful DocuChat assistant. No documents have been uploaded yet, so answer the question directly based on your knowledge. Mention that for document-specific answers, users should upload documents first."),
            ("human", "{question}")
        ])
    else:
        # Use RAG with retrieved context
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a DocuChat assistant. Answer the question using ONLY the provided document context."),
            ("system", f"Document Context:\n{context}"),
            ("human", "{question}")
        ])

    chain = prompt | get_llm_instance()

    response = chain.invoke({"question": question})
    answer = response.content if hasattr(response, "content") else str(response)

    save_message(conversation_id, "user", question)
    save_message(conversation_id, "assistant", answer)

    return answer, conversation_id
