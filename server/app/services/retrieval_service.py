from langchain_community.vectorstores import FAISS
from pathlib import Path
from app.core.embedding_factory import get_embeddings


VECTOR_PATH = Path("vector_store/faiss_index")
_db = None

def get_vector_db():
    global _db

    if _db is not None:
        return _db

    if not VECTOR_PATH.exists():
        raise RuntimeError(
            "Vector store not found. Please run ingestion first."
        )

    _db = FAISS.load_local(
        VECTOR_PATH,
        get_embeddings(),
        allow_dangerous_deserialization=True
    )

    return _db


def retrieve_context(query: str, k: int = 3) -> str:
    db = get_vector_db()
    docs = db.similarity_search(query, k=k)
    return "\n".join([d.page_content for d in docs])

