# DocuChat API Rate Limiting Documentation

## Overview

Comprehensive rate limiting has been implemented across all DocuChat API endpoints to prevent abuse and control costs. The system uses `slowapi` with in-memory storage for development, with easy migration path to Redis for production.

## Implementation Details

### Core Components

1. **Rate Limiter Configuration** (`app/core/rate_limiter.py`)
   - Custom key function that prioritizes user_id over IP address
   - Tiered rate limits for different subscription levels
   - Custom error handler with user-friendly messages
   - Support for future Stripe integration

2. **Rate Limiting Strategy**
   - **Development**: In-memory storage (suitable for single-worker development)
   - **Production**: Redis support ready (commented out, uncomment for production)
   - **Key Function**: Rate limits per user_id (from X-User-ID header or query params)
   - **Fallback**: IP-based rate limiting for unauthenticated requests

### Rate Limits by Endpoint

#### Upload Endpoints
| Endpoint | Method | Rate Limit | Description |
|----------|--------|------------|-------------|
| `/api/upload` | POST | 10/minute | Document upload |
| `/api/upload/info` | GET | 60/minute | Upload configuration info |
| `/api/upload/quota` | GET | 60/minute | User quota information |

#### Ingestion Endpoints
| Endpoint | Method | Rate Limit | Description |
|----------|--------|------------|-------------|
| `/api/ingest` | POST | 5/minute | Trigger document ingestion |
| `/api/ingest/status` | GET | 60/minute | Check ingestion status |

#### Chat Endpoints
| Endpoint | Method | Rate Limit | Description |
|----------|--------|------------|-------------|
| `/chat` | POST | 30/minute | Send chat messages |

#### Conversation Endpoints
| Endpoint | Method | Rate Limit | Description |
|----------|--------|------------|-------------|
| `/api/conversations` | GET | 60/minute | List all conversations |
| `/api/conversations` | POST | 20/minute | Create conversation |
| `/api/conversations/{id}` | GET | 60/minute | Get conversation details |
| `/api/conversations/{id}` | PATCH | 20/minute | Update conversation |
| `/api/conversations/{id}` | DELETE | 20/minute | Delete conversation |
| `/api/conversations/{id}/messages` | GET | 60/minute | Get conversation messages |

#### Document Endpoints
| Endpoint | Method | Rate Limit | Description |
|----------|--------|------------|-------------|
| `/api/documents` | GET | 60/minute | List documents |
| `/api/documents/{id}` | GET | 60/minute | Get document details |
| `/api/documents/{id}` | DELETE | 10/minute | Delete document |
| `/api/documents/{id}/reingest` | POST | 5/minute | Re-ingest document |

## Subscription Tiers

Rate limits are configurable per subscription tier (ready for Stripe integration):

### Free Tier (Default)
```python
{
    "upload": "10/minute",
    "ingest": "5/minute",
    "chat": "30/minute",
    "conversations_read": "60/minute",
    "conversations_write": "20/minute",
    "documents_read": "60/minute",
    "documents_write": "10/minute",
}
```

### Pro Tier (Future)
```python
{
    "upload": "50/minute",
    "ingest": "20/minute",
    "chat": "100/minute",
    "conversations_read": "200/minute",
    "conversations_write": "50/minute",
    "documents_read": "200/minute",
    "documents_write": "50/minute",
}
```

### Enterprise Tier (Future)
```python
{
    "upload": "200/minute",
    "ingest": "100/minute",
    "chat": "500/minute",
    "conversations_read": "1000/minute",
    "conversations_write": "200/minute",
    "documents_read": "1000/minute",
    "documents_write": "200/minute",
}
```

## Error Responses

When a rate limit is exceeded, the API returns:

### Status Code
```
429 Too Many Requests
```

### Response Headers
```
Retry-After: 45
X-RateLimit-Reset: 1704067200
```

### Response Body
```json
{
  "error": "Rate limit exceeded",
  "detail": "Too many upload requests. Please try again in 45 seconds.",
  "retry_after": 45,
  "endpoint": "/api/upload"
}
```

## Usage Examples

### Python Client
```python
import requests
import time

BASE_URL = "http://localhost:8000"
headers = {"X-User-ID": "user_123"}

try:
    response = requests.post(
        f"{BASE_URL}/api/upload",
        headers=headers,
        files={"files": open("document.pdf", "rb")}
    )
    response.raise_for_status()
except requests.exceptions.HTTPError as e:
    if e.response.status_code == 429:
        retry_after = e.response.json()["retry_after"]
        print(f"Rate limited. Retry after {retry_after} seconds")
        time.sleep(retry_after)
        # Retry the request
```

### JavaScript Client
```javascript
const BASE_URL = "http://localhost:8000";
const headers = { "X-User-ID": "user_123" };

async function uploadWithRetry(file) {
  try {
    const formData = new FormData();
    formData.append("files", file);

    const response = await fetch(`${BASE_URL}/api/upload`, {
      method: "POST",
      headers,
      body: formData
    });

    if (response.status === 429) {
      const data = await response.json();
      console.log(`Rate limited. Retry after ${data.retry_after}s`);
      await new Promise(resolve => setTimeout(resolve, data.retry_after * 1000));
      return uploadWithRetry(file); // Retry
    }

    return await response.json();
  } catch (error) {
    console.error("Upload failed:", error);
  }
}
```

## Testing

A comprehensive test script is provided to verify rate limiting functionality:

```bash
# Start the server
cd server
source venv/bin/activate
uvicorn app.main:app --reload

# In another terminal, run tests
python test_rate_limits.py
```

### Test Coverage
The test script verifies:
1. ✓ Requests within limit succeed
2. ✓ Requests exceeding limit return 429
3. ✓ Response includes retry-after header
4. ✓ Error response has correct format
5. ✓ Different users have isolated rate limits
6. ✓ Rate limits reset after time window

## Production Deployment

### Switching to Redis

For production with multiple workers, switch to Redis:

1. **Install Redis**
   ```bash
   pip install redis
   ```

2. **Update `app/core/rate_limiter.py`**
   ```python
   # Comment out in-memory storage
   # limiter = Limiter(
   #     key_func=get_user_id_or_ip,
   #     storage_uri="memory://"
   # )

   # Uncomment Redis storage
   limiter = Limiter(
       key_func=get_user_id_or_ip,
       storage_uri="redis://localhost:6379"
   )
   ```

3. **Start Redis**
   ```bash
   redis-server
   ```

### Docker Compose Example

```yaml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

## Monitoring

### Log Rate Limit Violations

Rate limit violations are automatically logged. To add custom logging:

```python
# app/core/rate_limiter.py

def custom_rate_limit_handler(request: Request, exc: RateLimitExceeded):
    # Add logging
    import logging
    logger = logging.getLogger(__name__)
    logger.warning(
        f"Rate limit exceeded: {request.url.path} by {get_user_id_or_ip(request)}"
    )

    # ... rest of error handler
```

### Metrics Collection

For production monitoring, consider integrating:
- **Prometheus**: Track rate limit hits/misses
- **Grafana**: Visualize rate limit metrics
- **Sentry**: Alert on excessive rate limiting

## Future Enhancements

### Planned Features
1. **Stripe Integration**: Dynamic rate limits based on subscription tier
2. **Rate Limit Dashboard**: User-facing quota usage display
3. **Whitelist**: Bypass rate limits for trusted IPs/users
4. **Custom Limits**: Per-user rate limit overrides
5. **Burst Allowance**: Allow temporary bursts above the limit

### Custom Rate Limit Middleware

For advanced use cases, implement custom middleware:

```python
# app/middleware/custom_rate_limit.py

from fastapi import Request
from app.services.user_service import get_user_tier

async def dynamic_rate_limit_middleware(request: Request, call_next):
    user_id = request.headers.get("X-User-ID")
    if user_id:
        tier = get_user_tier(user_id)
        request.state.rate_limit_tier = tier
    response = await call_next(request)
    return response
```

## Troubleshooting

### Common Issues

1. **Rate limit not applied**
   - Check if endpoint has `@limiter.limit()` decorator
   - Verify limiter is registered in `app.main`
   - Ensure `Request` parameter is in function signature

2. **Different users share rate limits**
   - Verify `X-User-ID` header is being sent
   - Check `get_user_id_or_ip()` function is extracting user_id correctly

3. **Rate limit resets too quickly/slowly**
   - Rate limits are per-minute by default
   - Adjust time window: `@limiter.limit("10/hour")` or `@limiter.limit("100/day")`

4. **Memory issues with in-memory storage**
   - Switch to Redis for production
   - In-memory storage is only suitable for development

## Security Considerations

### Best Practices
1. ✓ Always rate limit by user_id, not just IP (prevents IP rotation attacks)
2. ✓ Set global default rate limit as fallback
3. ✓ Return 429 with retry-after (prevents hammering)
4. ✓ Log rate limit violations for monitoring
5. ✓ Use Redis in production for distributed rate limiting
6. ✓ Combine with authentication for maximum security

### Attack Mitigation
- **DDoS Protection**: Rate limits prevent resource exhaustion
- **Cost Control**: Limits on expensive operations (ingestion, chat)
- **Brute Force**: Slow down credential stuffing attacks
- **Scraping**: Prevent bulk data extraction

## References

- [slowapi Documentation](https://github.com/laurents/slowapi)
- [limits Documentation](https://limits.readthedocs.io/)
- [FastAPI Middleware](https://fastapi.tiangolo.com/tutorial/middleware/)
- [Redis Rate Limiting Patterns](https://redis.io/docs/manual/patterns/rate-limiter/)

---

**Last Updated**: 2026-01-18
**Version**: 1.0.0
**Author**: DocuChat Development Team
