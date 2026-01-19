# Rate Limiting Quick Reference

## TL;DR

All DocuChat API endpoints are rate-limited to prevent abuse. Users get limits based on their tier (Free/Pro/Enterprise).

---

## Current Limits (Free Tier)

| Endpoint | Limit | Use Case |
|----------|-------|----------|
| `/api/upload` | 10/min | Document upload |
| `/api/ingest` | 5/min | Vector DB creation |
| `/chat` | 30/min | Chat messages |
| `/api/conversations` (GET) | 60/min | List/view conversations |
| `/api/conversations` (POST/PATCH/DELETE) | 20/min | Create/update conversations |
| `/api/documents` (GET) | 60/min | List/view documents |
| `/api/documents` (DELETE) | 10/min | Delete documents |

---

## Adding Rate Limit to New Endpoint

```python
from fastapi import APIRouter, Request
from app.core.rate_limiter import limiter

router = APIRouter()

@router.post("/my-endpoint")
@limiter.limit("10/minute")  # Add this line
async def my_endpoint(request: Request):  # Add Request parameter
    # Your code here
    pass
```

**Important**: Must add `request: Request` parameter!

---

## Error Response

When rate limit exceeded:

```json
{
  "error": "Rate limit exceeded",
  "detail": "Too many requests. Please try again in 45 seconds.",
  "retry_after": 45,
  "endpoint": "/api/upload"
}
```

Status: `429 Too Many Requests`
Headers: `Retry-After: 45`

---

## Client-Side Handling

### Python
```python
import time
import requests

response = requests.post(url, headers=headers, data=data)

if response.status_code == 429:
    retry_after = response.json()["retry_after"]
    time.sleep(retry_after)
    # Retry request
```

### JavaScript
```javascript
const response = await fetch(url, options);

if (response.status === 429) {
  const data = await response.json();
  await new Promise(r => setTimeout(r, data.retry_after * 1000));
  // Retry request
}
```

---

## Testing

```bash
# Start server
uvicorn app.main:app --reload

# Run tests (in another terminal)
python test_rate_limits.py
```

---

## Production Setup

**Switch to Redis** (required for multiple workers):

1. Edit `/app/core/rate_limiter.py`:
```python
limiter = Limiter(
    key_func=get_user_id_or_ip,
    storage_uri="redis://localhost:6379"  # Change from "memory://"
)
```

2. Start Redis:
```bash
redis-server
```

---

## Changing Limits

Edit `/app/core/rate_limiter.py`:

```python
RATE_LIMITS = {
    "free": {
        "upload": "10/minute",  # Change this
        "chat": "30/minute",    # Or this
        # ...
    }
}
```

Or per-endpoint:

```python
@router.post("/my-endpoint")
@limiter.limit("50/minute")  # Change limit here
async def my_endpoint(request: Request):
    pass
```

---

## Monitoring

Check logs for rate limit violations:
```bash
grep "Rate limit exceeded" logs/app.log
```

Or use Redis CLI:
```bash
redis-cli
> KEYS *  # See all rate limit keys
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| All requests return 429 | Check if time window is too short |
| Different users share limits | Verify `X-User-ID` header is sent |
| Rate limit not applied | Add `@limiter.limit()` decorator |
| Missing `Request` parameter | Add `request: Request` to function |

---

## Subscription Tiers

| Tier | Upload | Chat | Conversations |
|------|--------|------|---------------|
| Free | 10/min | 30/min | 60/min (read) |
| Pro | 50/min | 100/min | 200/min (read) |
| Enterprise | 200/min | 500/min | 1000/min (read) |

Full details: See `/app/core/rate_limiter.py` → `RATE_LIMITS`

---

## Resources

- **Full Docs**: `RATE_LIMITING.md`
- **Implementation**: `IMPLEMENTATION_SUMMARY.md`
- **Test Script**: `test_rate_limits.py`
- **Rate Limiter**: `/app/core/rate_limiter.py`
