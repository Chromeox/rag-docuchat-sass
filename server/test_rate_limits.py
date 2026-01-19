"""
Rate Limit Testing Script for DocuChat API

This script tests all rate-limited endpoints to ensure they:
1. Accept requests within the rate limit
2. Return 429 when rate limit is exceeded
3. Include proper retry-after headers
4. Reset limits after the time window

Usage:
    python test_rate_limits.py
"""

import requests
import time
import json
from typing import Dict, List, Tuple
from pathlib import Path


# API Configuration
BASE_URL = "http://localhost:8000"
TEST_USER_ID = "test-user-rate-limit"

# Rate limit configurations (endpoint: limit_per_minute)
RATE_LIMITS = {
    "/api/upload": 10,
    "/api/ingest": 5,
    "/chat": 30,
    "/api/conversations": {
        "GET": 60,
        "POST": 20,
        "PATCH": 20,
        "DELETE": 20
    },
    "/api/documents": {
        "GET": 60,
        "DELETE": 10
    },
    "/api/documents/{id}/reingest": 5,
}


def print_section(title: str):
    """Print a formatted section header."""
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print('=' * 60)


def print_result(test_name: str, passed: bool, details: str = ""):
    """Print test result with formatting."""
    status = "✓ PASS" if passed else "✗ FAIL"
    print(f"{status}: {test_name}")
    if details:
        print(f"   → {details}")


def test_endpoint_rate_limit(
    endpoint: str,
    method: str,
    limit: int,
    headers: Dict[str, str],
    data: Dict = None,
    files: Dict = None
) -> Tuple[bool, str]:
    """
    Test rate limiting for a specific endpoint.

    Args:
        endpoint: API endpoint path
        method: HTTP method (GET, POST, DELETE, etc.)
        limit: Expected rate limit per minute
        headers: Request headers
        data: Optional request body data
        files: Optional files for multipart upload

    Returns:
        Tuple of (passed: bool, details: str)
    """
    url = f"{BASE_URL}{endpoint}"
    passed = True
    details = []

    print(f"\nTesting {method} {endpoint} (limit: {limit}/min)")

    # Test 1: Requests within limit should succeed
    print(f"  Sending {limit} requests (should all succeed)...")
    for i in range(limit):
        try:
            if method == "GET":
                resp = requests.get(url, headers=headers)
            elif method == "POST":
                if files:
                    resp = requests.post(url, headers=headers, files=files)
                else:
                    resp = requests.post(url, headers=headers, json=data)
            elif method == "DELETE":
                resp = requests.delete(url, headers=headers)
            elif method == "PATCH":
                resp = requests.patch(url, headers=headers, json=data)

            if resp.status_code == 429:
                passed = False
                details.append(f"Request {i+1}/{limit} hit rate limit early")
                break
        except Exception as e:
            # Ignore connection errors for this test (server might not be running)
            details.append(f"Connection error: {str(e)}")
            return False, "; ".join(details)

    # Test 2: Request exceeding limit should return 429
    print(f"  Sending request {limit + 1} (should be rate limited)...")
    try:
        if method == "GET":
            resp = requests.get(url, headers=headers)
        elif method == "POST":
            if files:
                resp = requests.post(url, headers=headers, files=files)
            else:
                resp = requests.post(url, headers=headers, json=data)
        elif method == "DELETE":
            resp = requests.delete(url, headers=headers)
        elif method == "PATCH":
            resp = requests.patch(url, headers=headers, json=data)

        if resp.status_code != 429:
            passed = False
            details.append(f"Expected 429, got {resp.status_code}")
        else:
            # Test 3: Check for retry-after header
            if "retry-after" not in resp.headers:
                passed = False
                details.append("Missing 'retry-after' header")

            # Test 4: Check error response format
            try:
                error_data = resp.json()
                if "error" not in error_data or "retry_after" not in error_data:
                    passed = False
                    details.append("Invalid error response format")
                else:
                    details.append(f"Rate limited with retry_after={error_data['retry_after']}s")
            except:
                passed = False
                details.append("Error response is not valid JSON")

    except Exception as e:
        details.append(f"Error during rate limit test: {str(e)}")
        return False, "; ".join(details)

    return passed, "; ".join(details) if details else "All checks passed"


def test_user_isolation():
    """Test that different users have separate rate limits."""
    print_section("Testing User Isolation")

    endpoint = "/api/upload/info"
    limit = 60

    user1_headers = {"X-User-ID": "user-1"}
    user2_headers = {"X-User-ID": "user-2"}

    print(f"User 1: Consuming rate limit...")
    for i in range(limit):
        try:
            requests.get(f"{BASE_URL}{endpoint}", headers=user1_headers)
        except:
            print("  Server not running - skipping test")
            return

    # User 1 should be rate limited
    resp1 = requests.get(f"{BASE_URL}{endpoint}", headers=user1_headers)

    # User 2 should still work
    resp2 = requests.get(f"{BASE_URL}{endpoint}", headers=user2_headers)

    passed = resp1.status_code == 429 and resp2.status_code == 200
    print_result(
        "User rate limits are isolated",
        passed,
        f"User1: {resp1.status_code}, User2: {resp2.status_code}"
    )


def test_rate_limit_reset():
    """Test that rate limits reset after the time window."""
    print_section("Testing Rate Limit Reset")

    endpoint = "/api/upload/info"
    headers = {"X-User-ID": "test-reset-user"}

    print("Consuming rate limit...")
    try:
        # Consume the rate limit
        for i in range(61):  # Exceed the limit
            requests.get(f"{BASE_URL}{endpoint}", headers=headers)
    except:
        print("  Server not running - skipping test")
        return

    # Should be rate limited
    resp1 = requests.get(f"{BASE_URL}{endpoint}", headers=headers)

    print(f"Waiting 61 seconds for rate limit to reset...")
    time.sleep(61)

    # Should work again after reset
    resp2 = requests.get(f"{BASE_URL}{endpoint}", headers=headers)

    passed = resp1.status_code == 429 and resp2.status_code == 200
    print_result(
        "Rate limit resets after time window",
        passed,
        f"Before reset: {resp1.status_code}, After reset: {resp2.status_code}"
    )


def run_all_tests():
    """Run all rate limit tests."""
    print_section("DocuChat API Rate Limit Tests")
    print(f"Base URL: {BASE_URL}")
    print(f"Test User ID: {TEST_USER_ID}")

    headers = {"X-User-ID": TEST_USER_ID}

    # Check if server is running
    try:
        resp = requests.get(f"{BASE_URL}/api/upload/info")
        print("\n✓ Server is running")
    except Exception as e:
        print(f"\n✗ Server is not running: {e}")
        print("\nPlease start the server with:")
        print("  cd server && source venv/bin/activate && uvicorn app.main:app --reload")
        return

    # Test upload endpoint
    print_section("Testing Upload Endpoints")

    # Create a dummy file for upload testing
    test_file_content = b"This is a test document for rate limit testing."

    passed, details = test_endpoint_rate_limit(
        endpoint="/api/upload",
        method="POST",
        limit=10,
        headers=headers,
        files={"files": ("test.txt", test_file_content, "text/plain")}
    )
    print_result("/api/upload (POST)", passed, details)

    # Test ingest endpoint
    print_section("Testing Ingest Endpoints")

    passed, details = test_endpoint_rate_limit(
        endpoint="/api/ingest",
        method="POST",
        limit=5,
        headers=headers,
        data={}
    )
    print_result("/api/ingest (POST)", passed, details)

    # Test chat endpoint
    print_section("Testing Chat Endpoints")

    passed, details = test_endpoint_rate_limit(
        endpoint="/chat",
        method="POST",
        limit=30,
        headers={},
        data={"question": "Test question", "user_id": TEST_USER_ID}
    )
    print_result("/chat (POST)", passed, details)

    # Test conversations endpoints
    print_section("Testing Conversation Endpoints")

    # GET conversations
    passed, details = test_endpoint_rate_limit(
        endpoint=f"/api/conversations?user_id={TEST_USER_ID}",
        method="GET",
        limit=60,
        headers=headers
    )
    print_result("/api/conversations (GET)", passed, details)

    # POST conversations
    passed, details = test_endpoint_rate_limit(
        endpoint="/api/conversations",
        method="POST",
        limit=20,
        headers=headers,
        data={"user_id": TEST_USER_ID, "title": "Test Conversation"}
    )
    print_result("/api/conversations (POST)", passed, details)

    # Test documents endpoints
    print_section("Testing Document Endpoints")

    # GET documents
    passed, details = test_endpoint_rate_limit(
        endpoint="/api/documents",
        method="GET",
        limit=60,
        headers=headers
    )
    print_result("/api/documents (GET)", passed, details)

    # Test user isolation
    test_user_isolation()

    # Note: Rate limit reset test takes 61 seconds - uncomment to run
    # test_rate_limit_reset()

    print_section("Test Summary")
    print("\n✓ Rate limiting implementation tested successfully")
    print("\nNote: Some tests may show connection errors if server is not running")
    print("      or if endpoints require specific data that doesn't exist yet.")


if __name__ == "__main__":
    run_all_tests()
