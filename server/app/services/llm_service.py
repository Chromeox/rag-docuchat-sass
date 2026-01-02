from unittest import result
from langchain_core.prompts import ChatPromptTemplate
from app.services.retrieval_service import retrieve_context
from app.services.chat_repository import create_conversation, save_message
from app.core.llm_factory import get_llm

llm = get_llm()

def generate_answer(user_id: int, question: str, conversation_id: int = None):
    if not conversation_id:
        conversation_id = create_conversation(user_id, question[:50])

    context = retrieve_context(question)

    template = f"""
    You are a Web3 expert assistant.
    Answer only using the provided context.

    Context:
    {context}

    Question:
    {question}
    """
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a Web3 expert assistant. Answer only using the provided context."),
        ("system", f"Context:\n{context}"),
        ("human", "{question}")
    ])

    chain = prompt | llm
    
    response = chain.invoke({"context": context, "question": question})
    answer = response.content if hasattr(response, "content") else str(response)

    save_message(conversation_id, "user", question)
    save_message(conversation_id, "assistant", answer)

    return answer, conversation_id
