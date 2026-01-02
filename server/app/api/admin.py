from fastapi import APIRouter, Depends
from app.core.deps import require_role

router = APIRouter()

@router.get("/stats")
def system_stats(user=Depends(require_role("admin"))):
    return {"status": "System healthy"}
