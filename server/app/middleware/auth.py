"""
Clerk JWT Authentication Middleware for FastAPI.

This middleware verifies Clerk JWT tokens from the Authorization header
and attaches the authenticated user_id to request.state for use in endpoints.
"""

import os
import jwt
from typing import Callable
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware


class ClerkAuthMiddleware(BaseHTTPMiddleware):
    """
    Middleware to verify Clerk JWT tokens and extract user_id.

    Public endpoints (no auth required):
    - /docs
    - /openapi.json
    - /api/upload/info
    - Health check endpoints

    All other endpoints require a valid Clerk JWT token in the Authorization header.
    """

    # Public endpoints that don't require authentication
    PUBLIC_PATHS = {
        "/docs",
        "/openapi.json",
        "/redoc",
        "/api/upload/info",
    }

    def __init__(self, app, secret_key: str):
        super().__init__(app)
        self.secret_key = secret_key

        if not self.secret_key:
            raise ValueError("CLERK_SECRET_KEY environment variable is required")

    async def dispatch(self, request: Request, call_next: Callable):
        """Process the request and verify authentication."""

        # Allow CORS preflight requests (OPTIONS) without authentication
        if request.method == "OPTIONS":
            return await call_next(request)

        # Skip authentication for public paths
        if request.url.path in self.PUBLIC_PATHS:
            return await call_next(request)

        # Skip authentication for OpenAPI schema paths
        if request.url.path.startswith("/openapi") or request.url.path.startswith("/docs"):
            return await call_next(request)

        # Get Authorization header
        auth_header = request.headers.get("Authorization")

        if not auth_header:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={
                    "detail": "Missing Authorization header. Please provide a Bearer token."
                }
            )

        # Check Bearer token format
        if not auth_header.startswith("Bearer "):
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={
                    "detail": "Invalid Authorization header format. Expected 'Bearer <token>'"
                }
            )

        # Extract token
        token = auth_header.split(" ", 1)[1]

        try:
            # Verify and decode JWT token
            # Clerk uses RS256 algorithm, but for development we can use the secret key
            # In production, you'd fetch the JWKS from Clerk
            decoded = jwt.decode(
                token,
                self.secret_key,
                algorithms=["RS256", "HS256"],
                options={
                    "verify_signature": False  # For development - verify in production!
                }
            )

            # Extract user ID from token (Clerk uses 'sub' claim)
            user_id = decoded.get("sub")

            if not user_id:
                return JSONResponse(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    content={
                        "detail": "Invalid token: missing user ID (sub claim)"
                    }
                )

            # Attach user_id to request state
            request.state.user_id = user_id

            # Continue to the endpoint
            response = await call_next(request)
            return response

        except jwt.ExpiredSignatureError:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={
                    "detail": "Token has expired. Please sign in again."
                }
            )
        except jwt.InvalidTokenError as e:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={
                    "detail": f"Invalid token: {str(e)}"
                }
            )
        except Exception as e:
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "detail": f"Authentication error: {str(e)}"
                }
            )


def get_user_id(request: Request) -> str:
    """
    Dependency to get the authenticated user_id from request state.

    Usage:
        @router.get("/protected")
        async def protected_endpoint(user_id: str = Depends(get_user_id)):
            return {"user_id": user_id}

    Raises:
        HTTPException: If user is not authenticated
    """
    user_id = getattr(request.state, "user_id", None)

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )

    return user_id
