from app.db.database import engine
from app.db.models import Base

def init_db():
    print("[INIT_DB] Starting database initialization...")
    try:
        Base.metadata.create_all(bind=engine)
        print("[INIT_DB] ✓ Database tables created successfully!")
    except Exception as e:
        print(f"[INIT_DB] ✗ Error creating tables: {e}")
