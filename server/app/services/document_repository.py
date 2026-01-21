from typing import List, Optional
from sqlalchemy.orm import Session
from app.db.models import Document


class DocumentRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        user_id: str,
        filename: str,
        original_filename: str,
        file_path: str,
        file_size: int,
        file_type: str
    ) -> Document:
        """Create a new document record."""
        document = Document(
            user_id=user_id,
            filename=filename,
            original_filename=original_filename,
            file_path=file_path,
            file_size=file_size,
            file_type=file_type,
            status="pending"
        )
        self.db.add(document)
        self.db.commit()
        self.db.refresh(document)
        return document

    def get_by_id(self, document_id: int) -> Optional[Document]:
        """Get document by ID."""
        return self.db.query(Document).filter(Document.id == document_id).first()

    def get_by_user(self, user_id: str) -> List[Document]:
        """Get all documents for a user."""
        return (
            self.db.query(Document)
            .filter(Document.user_id == user_id)
            .order_by(Document.upload_date.desc())
            .all()
        )

    def get_by_user_and_status(self, user_id: str, status: str) -> List[Document]:
        """Get documents for a user filtered by status."""
        return (
            self.db.query(Document)
            .filter(Document.user_id == user_id, Document.status == status)
            .order_by(Document.upload_date.desc())
            .all()
        )

    def update_status(
        self,
        document_id: int,
        status: str,
        chunk_count: Optional[int] = None,
        error_message: Optional[str] = None
    ) -> Optional[Document]:
        """Update document status."""
        document = self.get_by_id(document_id)
        if document:
            document.status = status
            if chunk_count is not None:
                document.chunk_count = chunk_count
            if error_message is not None:
                document.error_message = error_message
            self.db.commit()
            self.db.refresh(document)
        return document

    def delete(self, document_id: int) -> bool:
        """Delete a document record."""
        document = self.get_by_id(document_id)
        if document:
            self.db.delete(document)
            self.db.commit()
            return True
        return False

    def count_by_user(self, user_id: str) -> int:
        """Count total documents for a user."""
        return self.db.query(Document).filter(Document.user_id == user_id).count()

    def count_by_user_and_status(self, user_id: str, status: str) -> int:
        """Count documents for a user by status."""
        return (
            self.db.query(Document)
            .filter(Document.user_id == user_id, Document.status == status)
            .count()
        )

    def delete_all_by_user(self, user_id: str) -> int:
        """Delete all documents for a user. Returns count of deleted documents."""
        count = self.db.query(Document).filter(Document.user_id == user_id).delete()
        self.db.commit()
        return count
