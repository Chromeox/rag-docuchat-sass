"""
NOTE: This file contains password hashing utilities (still in use) and
old JWT token functions (DEPRECATED - now using Clerk).

Functions in use:
- get_password_hash() - Used for legacy user passwords
- verify_password() - Used for legacy authentication

DEPRECATED functions (Clerk is now used for auth):
- create_access_token() - DEPRECATED: Use Clerk tokens
- create_refresh_token() - DEPRECATED: Use Clerk tokens
- decode_token() - DEPRECATED: Use Clerk token verification
"""

from datetime import datetime, timedelta
from jose import jwt, JWTError
import hashlib
from passlib.context import CryptContext
from app.core.config import settings

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

# ---- DEPRECATED JWT FUNCTIONS (Use Clerk instead) ----
def create_access_token(data: dict):
    """DEPRECATED: Use Clerk authentication instead."""
    to_encode = data.copy()
    to_encode["exp"] = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def create_refresh_token(data: dict):
    """DEPRECATED: Use Clerk authentication instead."""
    to_encode = data.copy()
    to_encode["exp"] = datetime.utcnow() + timedelta(days=settings.REFRESH_EXPIRE_DAYS)
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def decode_token(token: str):
    """DEPRECATED: Use Clerk token verification instead."""
    print(token)
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
