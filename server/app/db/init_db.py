from app.db.database import engine
from app.db.models import Base
import sqlalchemy.exc

def init_db():
    print("[INIT_DB] Starting database initialization...")
    try:
        Base.metadata.create_all(bind=engine, checkfirst=True)
        print("[INIT_DB] ✓ Database tables verified/created successfully!")
    except sqlalchemy.exc.ProgrammingError as e:
        if "already exists" in str(e):
            print(f"[INIT_DB] ✓ Database tables already exist (OK)")
        else:
            print(f"[INIT_DB] ✗ Database error: {e}")
            raise
    except Exception as e:
        print(f"[INIT_DB] ✗ Unexpected error: {e}")
        raise
