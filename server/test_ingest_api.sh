#!/bin/bash

# Test script for the ingestion API endpoints
# Make sure the server is running: uvicorn app.main:app --reload

BASE_URL="http://localhost:8000"

echo "==========================================="
echo "RAG DocuChat - Ingestion API Test"
echo "==========================================="
echo ""

# Test 1: Check ingestion status (should be not_ready initially)
echo "1. Checking ingestion status (before ingestion)..."
echo "GET $BASE_URL/api/ingest/status"
echo ""
curl -s "$BASE_URL/api/ingest/status" | python3 -m json.tool
echo ""
echo ""

# Test 2: Trigger ingestion
echo "2. Triggering document ingestion..."
echo "POST $BASE_URL/api/ingest"
echo ""
curl -s -X POST "$BASE_URL/api/ingest" | python3 -m json.tool
echo ""
echo ""

# Test 3: Check ingestion status again (should be ready now)
echo "3. Checking ingestion status (after ingestion)..."
echo "GET $BASE_URL/api/ingest/status"
echo ""
curl -s "$BASE_URL/api/ingest/status" | python3 -m json.tool
echo ""
echo ""

echo "==========================================="
echo "Test Complete!"
echo "==========================================="
echo ""
echo "Next steps:"
echo "- Upload more documents via POST /api/upload"
echo "- Re-run ingestion to index new documents"
echo "- Test chat with questions about your documents"
