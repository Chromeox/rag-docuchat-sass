import os

# OpenAI
from langchain_openai import ChatOpenAI
# Groq
from langchain_groq import ChatGroq

# Hugging Face
from langchain_huggingface import ChatHuggingFace, HuggingFaceEndpoint

def get_llm():
    provider = os.getenv("LLM_PROVIDER", "huggingface").lower()

    if provider == "openai":
        if not os.getenv("OPENAI_API_KEY"):
            raise RuntimeError("OPENAI_API_KEY not set")
        return ChatOpenAI(
            model="gpt-4-mini",
            temperature=0
        )

    if provider == "groq":
        if not os.getenv("GROQ_API_KEY"):
            raise RuntimeError("GROQ_API_KEY not set")
        return ChatGroq(
            api_key=os.getenv("GROQ_API_KEY"),
            model=os.getenv("GROQ_MODEL", "gpt-neo-2.7B"),
            temperature=0
        )

    if provider == "huggingface":
        model_name = os.getenv("HUGGINGFACE_MODEL", "HuggingFaceH4/zephyr-7b-beta")
        llm = HuggingFaceEndpoint(
            repo_id=model_name,
            task="text-generation",
            temperature=0
        )
        return ChatHuggingFace(llm=llm)
