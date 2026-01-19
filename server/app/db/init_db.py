from app.db.database import engine
from app.db.models import Base
import sqlalchemy.exc

def init_db():
    """
    Initialize database tables if they don't exist.
    Handles case where tables already exist gracefully.
    """
    print("[INIT_DB] Starting database initialization...")
    try:
        # checkfirst=True should prevent duplicate table errors
        Base.metadata.create_all(bind=engine, checkfirst=True)
        print("[INIT_DB] ✓ Database tables verified/created successfully!")
    except sqlalchemy.exc.ProgrammingError as e:
        # Handle duplicate table/index errors gracefully
        error_msg = str(e).lower()
        if "already exists" in error_msg or "duplicate" in error_msg:
            print(f"[INIT_DB] ✓ Database tables already exist (OK)")
            # Don't raise - this is expected in production
            return
        else:
            print(f"[INIT_DB] ✗ Database error: {e}")
            raise
    except Exception as e:
        error_msg = str(e).lower()
        # Also catch any other "already exists" errors
        if "already exists" in error_msg or "duplicate" in error_msg:
            print(f"[INIT_DB] ✓ Tables exist, continuing startup...")
            return
        print(f"[INIT_DB] ✗ Unexpected error: {e}")
        raise
