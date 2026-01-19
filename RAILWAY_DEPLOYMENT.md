# 🚂 Railway Deployment Guide

**Purpose**: Deploy DocuChat to production (Railway + Vercel)

---

## 📋 Prerequisites

- Railway account (https://railway.app)
- Vercel account (https://vercel.com)
- Clerk account with production keys
- Groq API key (or OpenAI)

---

## Part 1: Backend Deployment (Railway)

### Step 1: Install Railway CLI

```bash
npm install -g @railway/cli

# Or using Homebrew
brew install railway
```

### Step 2: Login to Railway

```bash
railway login
```

This will open your browser for authentication.

### Step 3: Initialize Railway Project

```bash
cd /Users/chromeo/Projects/AI-Portfolio/rag-docuchat-sass/server

# Create new Railway project
railway init

# Follow prompts:
# - Project name: docuchat-backend-[yourname]
# - Environment: production
```

### Step 4: Add PostgreSQL Database

```bash
# Add PostgreSQL to your Railway project
railway add --database postgresql

# Railway automatically sets DATABASE_URL environment variable
```

### Step 5: Set Environment Variables

```bash
# Set all required environment variables
railway variables set CLERK_SECRET_KEY="sk_live_your_production_key"
railway variables set CLERK_PUBLISHABLE_KEY="pk_live_your_production_key"
railway variables set GROQ_API_KEY="gsk_your_groq_key"
railway variables set GROQ_MODEL="llama-3.3-70b-versatile"
railway variables set LLM_PROVIDER="groq"
railway variables set EMBEDDING_PROVIDER="huggingface"
railway variables set LANGCHAIN_TRACING_V2="false"

# For production, add Redis for rate limiting
railway add --database redis
railway variables set REDIS_URL='${{REDIS.REDIS_URL}}'
```

### Step 6: Create `railway.json` Configuration

```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "uvicorn app.main:app --host 0.0.0.0 --port $PORT",
    "healthcheckPath": "/api/upload/info",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Step 7: Create `Procfile` (Alternative)

```
web: uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 2
```

### Step 8: Deploy to Railway

```bash
# Deploy from current directory
railway up

# Railway will:
# 1. Detect Python project
# 2. Install requirements.txt
# 3. Run database migrations (if configured)
# 4. Start uvicorn server

# Watch deployment logs
railway logs
```

### Step 9: Get Your Backend URL

```bash
# Generate a public domain
railway domain

# You'll get: docuchat-backend-production.up.railway.app
```

### Step 10: Run Database Migrations

```bash
# Connect to Railway shell
railway run bash

# Inside Railway shell
python migrations/add_user_quotas.py

# Or run locally against Railway database
railway run python migrations/add_user_quotas.py
```

---

## Part 2: Frontend Deployment (Vercel)

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Deploy Frontend

```bash
cd /Users/chromeo/Projects/AI-Portfolio/rag-docuchat-sass/client

# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name: docuchat-frontend
# - Directory: ./
# - Override settings? No
```

### Step 3: Set Environment Variables in Vercel

In Vercel dashboard (https://vercel.com):

1. Go to your project → Settings → Environment Variables
2. Add these variables for **Production**:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_your_production_key
CLERK_SECRET_KEY=sk_live_your_production_key
NEXT_PUBLIC_API_URL=https://docuchat-backend-production.up.railway.app
```

3. Click "Save"
4. Redeploy: `vercel --prod`

---

## Part 3: Connect Everything

### Update Backend CORS

In `server/app/main.py`, update CORS to allow your Vercel domain:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Local dev
        "https://docuchat-frontend.vercel.app",  # Your Vercel domain
        "https://yourdomain.com",  # Custom domain if you have one
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Commit and redeploy:
```bash
cd server
railway up
```

### Update Clerk Redirect URLs

In Clerk Dashboard (https://dashboard.clerk.com):

1. Go to your production app
2. Navigate to: **Configure → Paths**
3. Add allowed redirect URLs:
   - `https://docuchat-frontend.vercel.app`
   - `https://yourdomain.com` (if using custom domain)

---

## Part 4: Test Deployment

### Health Check

```bash
# Test backend
curl https://docuchat-backend-production.up.railway.app/api/upload/info

# Should return JSON with security_features
```

### Full Flow Test

1. Visit your Vercel URL: `https://docuchat-frontend.vercel.app`
2. Sign in with Clerk
3. Upload a test PDF
4. Ask a question
5. Verify RAG response

---

## Part 5: Custom Domain (Optional)

### Backend Domain

In Railway dashboard:
1. Go to your backend service
2. Settings → Networking → Custom Domain
3. Add your domain: `api.docuchat.yourdomain.com`
4. Update DNS records as shown

### Frontend Domain

In Vercel dashboard:
1. Settings → Domains
2. Add domain: `docuchat.yourdomain.com`
3. Update DNS records

Update environment variables to use new domains.

---

## 🚨 Important: Update Rate Limiter for Production

In `server/app/core/rate_limiter.py`:

```python
import os

# Use Redis in production, memory in development
storage_uri = os.getenv("REDIS_URL", "memory://")
limiter = Limiter(key_func=get_user_id_or_ip, storage_uri=storage_uri)
```

This ensures rate limiting works across multiple Railway workers.

---

## 📊 Cost Estimates

### Your Portfolio Instance
- **Railway**: $5-10/month (Hobby plan)
  - PostgreSQL: Included
  - Redis: Included
  - 500 hours/month compute
- **Vercel**: Free (Hobby plan)
  - 100 GB bandwidth
  - Unlimited deployments
- **Clerk**: $25/month (Essential plan)
  - 10,000 MAU included
- **Groq**: Free tier
  - Rate limits apply

**Total**: ~$30-35/month for demo

---

## 🔧 Troubleshooting

### Build Fails on Railway

```bash
# Check Python version (Railway uses latest by default)
# Add runtime.txt to specify version
echo "python-3.11" > runtime.txt
```

### Database Connection Fails

```bash
# Verify DATABASE_URL is set
railway variables

# Check database is running
railway run psql $DATABASE_URL
```

### CORS Errors

- Verify Vercel URL is in CORS `allow_origins`
- Check Clerk redirect URLs match exactly
- Ensure `allow_credentials=True`

### Rate Limiting Not Working

- Verify REDIS_URL is set in production
- Check Redis addon is active in Railway

---

## 🎯 Post-Deployment Checklist

- [ ] Backend deployed and healthy
- [ ] Frontend deployed and accessible
- [ ] Database migrations run successfully
- [ ] Can sign up/sign in with Clerk
- [ ] Can upload documents
- [ ] Documents ingest successfully
- [ ] Can ask questions and get RAG responses
- [ ] Rate limiting works (test with multiple requests)
- [ ] CORS configured correctly
- [ ] Custom domains configured (if applicable)
- [ ] Environment variables set for production
- [ ] Monitoring enabled (Sentry/Railway logs)

---

## 📈 Next Steps

1. **Add Monitoring**: Set up Sentry for error tracking
2. **Configure Alerts**: Railway can alert on downtime
3. **Add Analytics**: Track usage for portfolio metrics
4. **Optimize Performance**: Add caching layer
5. **Document API**: Generate OpenAPI docs

---

Your DocuChat is now live! 🚀

**Demo URL**: https://docuchat-frontend.vercel.app
**API URL**: https://docuchat-backend-production.up.railway.app
