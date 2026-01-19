"""
Migration script to add UserQuota table and initialize existing users.

Run this after updating the models to create the user_quotas table.
"""
import sys
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine
from app.db.database import Base, DATABASE_URL
from app.db.models import UserQuota, Document
from sqlalchemy.orm import sessionmaker
from sqlalchemy import func


def create_quotas_table():
    """Create the user_quotas table."""
    engine = create_engine(DATABASE_URL)
    Base.metadata.create_all(bind=engine, tables=[UserQuota.__table__])
    print("✓ Created user_quotas table")


def initialize_existing_users():
    """
    Initialize quota records for existing users based on their current document usage.
    """
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        # Get all unique user IDs from documents table
        user_ids = session.query(Document.user_id).distinct().all()
        user_ids = [uid[0] for uid in user_ids]

        print(f"Found {len(user_ids)} users with documents")

        for user_id in user_ids:
            # Check if quota already exists
            existing = session.query(UserQuota).filter(
                UserQuota.user_id == user_id
            ).first()

            if existing:
                print(f"  - User {user_id}: quota already exists, skipping")
                continue

            # Calculate current usage
            result = session.query(
                func.count(Document.id).label('count'),
                func.sum(Document.file_size).label('total_size')
            ).filter(
                Document.user_id == user_id
            ).first()

            doc_count = result.count or 0
            total_size = result.total_size or 0

            # Create quota record
            quota = UserQuota(
                user_id=user_id,
                tier="free",
                document_count=doc_count,
                total_storage_bytes=total_size,
                queries_today=0
            )

            session.add(quota)
            print(f"  ✓ User {user_id}: {doc_count} documents, "
                  f"{total_size / (1024*1024):.1f}MB storage")

        session.commit()
        print(f"\n✓ Initialized quotas for {len(user_ids)} users")

    except Exception as e:
        session.rollback()
        print(f"✗ Error: {e}")
        raise
    finally:
        session.close()


def main():
    """Run the migration."""
    print("=" * 60)
    print("User Quotas Migration")
    print("=" * 60)
    print()

    # Step 1: Create table
    print("Step 1: Creating user_quotas table...")
    create_quotas_table()
    print()

    # Step 2: Initialize existing users
    print("Step 2: Initializing quotas for existing users...")
    initialize_existing_users()
    print()

    print("=" * 60)
    print("Migration completed successfully!")
    print("=" * 60)


if __name__ == "__main__":
    main()
