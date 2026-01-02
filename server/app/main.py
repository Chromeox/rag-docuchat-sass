from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.chat import router as chat_router
from app.api.auth import router as auth_router
from app.api.admin import router as admin_router
from app.db.init_db import init_db

app = FastAPI(title="Web3 RAG AI Server")

# @app.on_event("startup")
# def startup():
#     init_db()

# ---- CORS CONFIG ----
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/auth")
app.include_router(chat_router)
app.include_router(admin_router, prefix="/admin")

