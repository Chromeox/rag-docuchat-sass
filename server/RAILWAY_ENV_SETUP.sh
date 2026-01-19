#!/bin/bash

# Railway Environment Variables Setup Script
# Run this after adding PostgreSQL database to your Railway project

echo "🚂 Setting up Railway environment variables..."

# Clerk Authentication
railway variables set CLERK_SECRET_KEY="your_clerk_secret_key_here"
railway variables set CLERK_PUBLISHABLE_KEY="pk_test_Z29yZ2VvdXMtZ2xpZGVyLTk0LmNsZXJrLmFjY291bnRzLmRldiQ"

# LLM Configuration
railway variables set LLM_PROVIDER="groq"
railway variables set GROQ_API_KEY="your_groq_api_key_here"
railway variables set GROQ_MODEL="llama-3.3-70b-versatile"

# Embedding Configuration
railway variables set EMBEDDING_PROVIDER="huggingface"

# LangChain Configuration
railway variables set LANGCHAIN_TRACING_V2="false"
railway variables set LANGCHAIN_API_KEY=""

# CORS Configuration (will update after Vercel deployment)
railway variables set ALLOWED_ORIGINS="http://localhost:3000"

echo "✅ Environment variables set!"
echo ""
echo "Next steps:"
echo "1. Run: railway up"
echo "2. Run: railway domain"
echo "3. Save your backend URL for Vercel"
