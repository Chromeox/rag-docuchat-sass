from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Index, BigInteger, Date
from sqlalchemy.sql import func
from app.db.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String(100), unique=True, nullable=False)
    password_hash = Column(Text, nullable=False)
    role = Column(String(20), default="user")  # user | admin
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    token = Column(Text, unique=True)
    expires_at = Column(DateTime)



class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(255), index=True, nullable=False)  # Clerk user ID
    title = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # user | assistant
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Document(Base):
    __tablename__ = "documents"
    __table_args__ = (
        Index('ix_documents_user_id', 'user_id'),
        Index('ix_documents_status', 'status'),
    )

    id = Column(Integer, primary_key=True)
    user_id = Column(String(255), nullable=False, index=True)  # Clerk user ID
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(Text, nullable=False)
    file_size = Column(Integer, nullable=False)
    file_type = Column(String(50), nullable=False)
    upload_date = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String(20), default="pending", nullable=False)  # pending | ingested | error
    chunk_count = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class UserQuota(Base):
    """Track user quotas and usage limits."""
    __tablename__ = "user_quotas"
    __table_args__ = (
        Index('ix_user_quotas_user_id', 'user_id'),
        Index('ix_user_quotas_last_reset', 'last_query_reset'),
    )

    user_id = Column(String(255), primary_key=True)  # Clerk user ID
    tier = Column(String(20), default="free", nullable=False)  # free | pro | enterprise

    # Document quotas
    document_count = Column(Integer, default=0, nullable=False)
    total_storage_bytes = Column(BigInteger, default=0, nullable=False)

    # Query quotas
    queries_today = Column(Integer, default=0, nullable=False)
    last_query_reset = Column(Date, default=func.current_date(), nullable=False)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
