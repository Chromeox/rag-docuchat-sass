from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.db.database import SessionLocal
from app.db.models import User, RefreshToken
from app.services.user_repository import get_or_create_user
from app.core.security import create_access_token, create_refresh_token, verify_password

router = APIRouter()

class LoginRequest(BaseModel):
    username: str
    password: str

class RefreshRequest(BaseModel):
    refresh_token: str

class UserResponse(BaseModel):
    id: int
    username: str
    role: str

class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    user: UserResponse

@router.post("/login")
def login(req: LoginRequest, response_model=LoginResponse):
    db: Session = SessionLocal()
    # user = db.query(User).filter(User.username == req.username).first()
    user = get_or_create_user(req.username, req.password)

    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access = create_access_token({
        "sub": str(user.id),
        "username": user.username,
        "role": user.role
        })
    refresh = create_refresh_token({"sub": str(user.id)})

    db.add(
        RefreshToken(
            user_id=str(user.id),
            token=refresh,
            expires_at=datetime.utcnow() + timedelta(days=7)
        )
    )
    db.commit()
    db.close()

    return {
        "access_token": access,
        "refresh_token": refresh,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "role": user.role,
        },
    }

@router.post("/refresh")
def refresh(req: RefreshRequest):
    db = SessionLocal()
    stored = db.query(RefreshToken).filter(
        RefreshToken.token == req.refresh_token
    ).first()

    if not stored or stored.expires_at < datetime.utcnow():
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    access = create_access_token({"sub": stored.user_id, "role": "user"})
    return {"access_token": access}

