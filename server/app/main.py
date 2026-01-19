import os
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from app.api.chat import router as chat_router
# from app.api.auth import router as auth_router  # DEPRECATED: Using Clerk authentication now
from app.api.admin import router as admin_router
from app.api.upload import router as upload_router
from app.api.ingest import router as ingest_router
from app.api.conversations import router as conversations_router
from app.api.documents import router as documents_router
from app.db.init_db import init_db
from app.core.rate_limiter import limiter, custom_rate_limit_handler
from app.middleware.auth import ClerkAuthMiddleware

# Load environment variables from .env file
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

print(f"[STARTUP] Loading .env from: {env_path}")
print(f"[STARTUP] LLM_PROVIDER: {os.getenv('LLM_PROVIDER')}")
print(f"[STARTUP] GROQ_API_KEY set: {bool(os.getenv('GROQ_API_KEY'))}")

app = FastAPI(title="DocuChat API Server")

# Configure rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, custom_rate_limit_handler)

@app.on_event("startup")
def startup():
    init_db()

# ---- CORS CONFIG ----
# Get allowed origins from environment or use defaults
allowed_origins_str = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
allowed_origins = [origin.strip() for origin in allowed_origins_str.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print(f"[STARTUP] CORS allowed origins: {allowed_origins}")

# ---- CLERK AUTHENTICATION MIDDLEWARE ----
# Add Clerk JWT authentication middleware
clerk_secret = os.getenv("CLERK_SECRET_KEY")
if clerk_secret and clerk_secret != "your_clerk_secret_key_here":
    app.add_middleware(ClerkAuthMiddleware, secret_key=clerk_secret)
    print("[STARTUP] Clerk authentication middleware enabled")
else:
    print("[STARTUP] WARNING: Clerk authentication disabled - CLERK_SECRET_KEY not configured")
    print("[STARTUP] Set CLERK_SECRET_KEY in .env to enable authentication")

# app.include_router(auth_router, prefix="/auth")  # DEPRECATED: Using Clerk authentication now
app.include_router(chat_router)
app.include_router(admin_router, prefix="/admin")
app.include_router(upload_router, prefix="/api")
app.include_router(ingest_router, prefix="/api")
app.include_router(conversations_router, prefix="/api")
app.include_router(documents_router, prefix="/api")

