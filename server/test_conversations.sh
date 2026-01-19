#!/bin/bash
# Test script for conversation history API

API_URL="http://localhost:8000/api"
USER_ID="test-user-123"

echo "=== Testing Conversation History API ==="
echo ""

# Test 1: Create a new conversation
echo "1. Creating a new conversation..."
CONV_RESPONSE=$(curl -s -X POST "$API_URL/conversations" \
  -H "Content-Type: application/json" \
  -d "{\"user_id\": \"$USER_ID\", \"title\": \"Test Conversation\"}")

echo "Response: $CONV_RESPONSE"
CONV_ID=$(echo $CONV_RESPONSE | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
echo "Created conversation ID: $CONV_ID"
echo ""

# Test 2: List conversations for user
echo "2. Listing conversations for user..."
curl -s "$API_URL/conversations?user_id=$USER_ID" | python3 -m json.tool
echo ""

# Test 3: Send a chat message (this should create messages)
echo "3. Sending a chat message..."
curl -s -X POST "http://localhost:8000/chat" \
  -H "Content-Type: application/json" \
  -d "{\"question\": \"Hello, this is a test message\", \"user_id\": \"$USER_ID\", \"conversation_id\": $CONV_ID}"
echo ""
echo ""

# Test 4: Get conversation messages
echo "4. Getting conversation messages..."
curl -s "$API_URL/conversations/$CONV_ID/messages" | python3 -m json.tool
echo ""

# Test 5: Update conversation title
echo "5. Updating conversation title..."
curl -s -X PATCH "$API_URL/conversations/$CONV_ID" \
  -H "Content-Type: application/json" \
  -d "{\"title\": \"Updated Test Conversation\"}" | python3 -m json.tool
echo ""

# Test 6: List conversations again to see update
echo "6. Listing conversations again..."
curl -s "$API_URL/conversations?user_id=$USER_ID" | python3 -m json.tool
echo ""

echo "=== Tests Complete ==="
echo "To delete test conversation, run:"
echo "curl -X DELETE $API_URL/conversations/$CONV_ID"
