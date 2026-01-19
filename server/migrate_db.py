"""
Database migration script to create/update conversation tables
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.database import engine, Base
from app.db.models import Conversation, Message, User, RefreshToken

def migrate():
    """Create or update database tables"""
    print("Starting database migration...")

    try:
        # Create all tables
        Base.metadata.create_all(bind=engine)
        print("✓ Database tables created/updated successfully")
        print("  - users")
        print("  - refresh_tokens")
        print("  - conversations")
        print("  - messages")

        # Verify tables exist
        from sqlalchemy import inspect
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        print(f"\nExisting tables: {tables}")

    except Exception as e:
        print(f"✗ Error during migration: {e}")
        sys.exit(1)

if __name__ == "__main__":
    migrate()
