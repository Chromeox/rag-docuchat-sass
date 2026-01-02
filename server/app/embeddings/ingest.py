import os
from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from app.core.embedding_factory import get_embeddings



DATA_PATH = "data/web3_docs"
VECTOR_PATH = "vector_store/faiss_index"

def ingest_docs():
    documents = []

    # for file in os.listdir(DATA_PATH):
    #     loader = TextLoader(os.path.join(DATA_PATH, file))
    #     documents.extend(loader.load())

    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"Data path {DATA_PATH} does not exist")
    
    loader = DirectoryLoader(DATA_PATH, glob="**/*.*", loader_cls=TextLoader, show_progress=True)
    
    documents = loader.load()

    if not documents:
        raise ValueError("No documents found")

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50
    )

    chunks = splitter.split_documents(documents)

    embeddings = get_embeddings()
    db = FAISS.from_documents(chunks, embeddings)
    os.makedirs(VECTOR_PATH, exist_ok=True)
    db.save_local(VECTOR_PATH)

    print("✅ Web3 documents ingested successfully")

if __name__ == "__main__":
    ingest_docs()
