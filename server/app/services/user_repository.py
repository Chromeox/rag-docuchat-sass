from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.db.models import User
from passlib.context import CryptContext
from app.core.security import get_password_hash



def get_or_create_user(username: str, password: str):
    db: Session = SessionLocal()
    user = db.query(User).filter(User.username == username).first()

    if user:
        db.close()
        return user

    user = User(
        username=username,
        password_hash=get_password_hash(password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()
    return user
