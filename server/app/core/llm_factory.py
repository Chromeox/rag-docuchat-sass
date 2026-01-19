import os

from langchain_openai import ChatOpenAI
from langchain_groq import ChatGroq

def get_llm():
    """
    Get LLM instance for generating answers.
    Supports OpenAI and Groq providers.
    """
    provider = os.getenv("LLM_PROVIDER", "groq").lower()

    if provider == "openai":
        if not os.getenv("OPENAI_API_KEY"):
            raise RuntimeError("OPENAI_API_KEY not set")
        return ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0
        )

    if provider == "groq":
        if not os.getenv("GROQ_API_KEY"):
            raise RuntimeError("GROQ_API_KEY not set")
        return ChatGroq(
            api_key=os.getenv("GROQ_API_KEY"),
            model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
            temperature=0
        )

    raise RuntimeError(f"Unsupported LLM provider: {provider}. Use 'openai' or 'groq'.")
