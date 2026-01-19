"""
Rate Limiter Configuration for DocuChat API

This module configures rate limiting using slowapi to prevent API abuse
and control costs. Currently uses in-memory storage for development.
For production, switch to Redis for distributed rate limiting.
"""

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from typing import Callable
import time


def get_user_id_or_ip(request: Request) -> str:
    """
    Get user_id from request state or fall back to IP address.

    This function is used as the key_func for rate limiting.
    It prioritizes user_id over IP address for more accurate rate limiting.

    Priority:
    1. user_id from request.state (set by authentication middleware)
    2. X-User-ID header (Clerk user ID)
    3. IP address (fallback for unauthenticated requests)

    Args:
        request: FastAPI Request object

    Returns:
        String identifier for rate limiting (user_id or IP)
    """
    # Try to get user_id from request state (set by auth middleware)
    if hasattr(request.state, "user_id") and request.state.user_id:
        return f"user:{request.state.user_id}"

    # Try to get user_id from X-User-ID header
    user_id = request.headers.get("X-User-ID")
    if user_id:
        return f"user:{user_id}"

    # Try to get user_id from query params (for GET requests)
    user_id_param = request.query_params.get("user_id")
    if user_id_param:
        return f"user:{user_id_param}"

    # Fallback to IP address
    return f"ip:{get_remote_address(request)}"


# Initialize limiter with custom key function
# Using in-memory storage for development
# For production with multiple workers, use Redis:
# from slowapi.util import get_remote_address
# from slowapi import Limiter
# limiter = Limiter(
#     key_func=get_user_id_or_ip,
#     storage_uri="redis://localhost:6379"
# )
limiter = Limiter(
    key_func=get_user_id_or_ip,
    default_limits=["1000/hour"],  # Global default rate limit
    storage_uri="memory://"
)


def custom_rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """
    Custom error handler for rate limit exceeded errors.

    Provides user-friendly error messages with retry information.

    Args:
        request: FastAPI Request object
        exc: RateLimitExceeded exception

    Returns:
        JSONResponse with error details and retry_after header
    """
    # Calculate retry_after time
    retry_after = int(exc.retry_after) if hasattr(exc, 'retry_after') else 60

    # Get the endpoint that was rate limited
    endpoint = request.url.path

    # Create user-friendly error message based on endpoint
    endpoint_messages = {
        "/api/upload": "Too many upload requests. Please try again in {retry_after} seconds.",
        "/api/ingest": "Too many ingestion requests. Please try again in {retry_after} seconds.",
        "/chat": "Too many chat messages. Please try again in {retry_after} seconds.",
        "/api/conversations": "Too many conversation requests. Please try again in {retry_after} seconds.",
        "/api/documents": "Too many document requests. Please try again in {retry_after} seconds.",
    }

    # Find matching message
    message = "Rate limit exceeded. Please try again in {retry_after} seconds."
    for path, msg in endpoint_messages.items():
        if endpoint.startswith(path):
            message = msg
            break

    message = message.format(retry_after=retry_after)

    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={
            "error": "Rate limit exceeded",
            "detail": message,
            "retry_after": retry_after,
            "endpoint": endpoint
        },
        headers={
            "Retry-After": str(retry_after),
            "X-RateLimit-Reset": str(int(time.time()) + retry_after)
        }
    )


# Rate limit tiers for different subscription levels (future use with Stripe)
RATE_LIMITS = {
    "free": {
        "upload": "10/minute",
        "ingest": "5/minute",
        "chat": "30/minute",
        "conversations_read": "60/minute",
        "conversations_write": "20/minute",
        "documents_read": "60/minute",
        "documents_write": "10/minute",
    },
    "pro": {
        "upload": "50/minute",
        "ingest": "20/minute",
        "chat": "100/minute",
        "conversations_read": "200/minute",
        "conversations_write": "50/minute",
        "documents_read": "200/minute",
        "documents_write": "50/minute",
    },
    "enterprise": {
        "upload": "200/minute",
        "ingest": "100/minute",
        "chat": "500/minute",
        "conversations_read": "1000/minute",
        "conversations_write": "200/minute",
        "documents_read": "1000/minute",
        "documents_write": "200/minute",
    }
}


def get_user_tier(user_id: str) -> str:
    """
    Get user's subscription tier.

    Currently returns 'free' for all users.
    TODO: Integrate with Stripe to get actual subscription tier.

    Args:
        user_id: User's Clerk ID

    Returns:
        Subscription tier ('free', 'pro', or 'enterprise')
    """
    # TODO: Query database or Stripe for user's subscription tier
    # For now, all users are on free tier
    return "free"


def get_rate_limit(endpoint_type: str, user_id: str = None) -> str:
    """
    Get rate limit for a specific endpoint and user.

    Args:
        endpoint_type: Type of endpoint (e.g., 'upload', 'chat')
        user_id: Optional user ID to determine subscription tier

    Returns:
        Rate limit string (e.g., '10/minute')
    """
    tier = get_user_tier(user_id) if user_id else "free"
    return RATE_LIMITS.get(tier, RATE_LIMITS["free"]).get(endpoint_type, "10/minute")
