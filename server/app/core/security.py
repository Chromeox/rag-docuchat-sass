from datetime import datetime, timedelta
from jose import jwt, JWTError
import hashlib
from passlib.context import CryptContext
from app.core.config import settings

# SECRET_KEY = os.getenv("JWT_SECRET", "supersecret")
# ALGORITHM = "HS256"


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ---- INTERNAL: Normalize password length ----
def _normalize_password(password: str) -> str:
    """
    Ensures password is <= 72 bytes for bcrypt
    """
    if not isinstance(password, str):
        password = str(password)

    password = password.strip()  # remove extra whitespace/newlines

    # If password > 72 bytes, prehash it
    if len(password.encode("utf-8")) > 72:
        password = hashlib.sha256(password.encode("utf-8")).hexdigest()  # 64 bytes
    return password


# ---- Hash password ----
def get_password_hash(password: str) -> str:
    password = _normalize_password(password)
    return pwd_context.hash(password)


# ---- Verify password ----
def verify_password(plain_password: str, hashed_password: str) -> bool:
    plain_password = _normalize_password(plain_password)
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    to_encode["exp"] = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def create_refresh_token(data: dict):
    to_encode = data.copy()
    to_encode["exp"] = datetime.utcnow() + timedelta(days=settings.REFRESH_EXPIRE_DAYS)
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def decode_token(token: str):
    print(token)
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
