# 🚀 Deploy DocuChat to Railway - Step by Step

**Time Required**: 20-30 minutes
**Current Status**: Railway CLI installed ✅

---

## Step 1: Login to Railway

```bash
railway login
```

This will open your browser. Sign in with GitHub or email.

---

## Step 2: Initialize Project

```bash
cd /Users/chromeo/Projects/AI-Portfolio/rag-docuchat-sass/server

# Create new Railway project
railway init

# You'll be prompted:
# - "Enter project name": docuchat-portfolio-backend
# - "Select environment": production
```

---

## Step 3: Add PostgreSQL Database

```bash
# Add PostgreSQL to your project
railway add

# When prompted, select:
# - "PostgreSQL"

# Railway automatically sets DATABASE_URL environment variable
```

---

## Step 4: Add Redis (Optional but Recommended)

```bash
# Add Redis for production rate limiting
railway add

# When prompted, select:
# - "Redis"

# Railway automatically sets REDIS_URL environment variable
```

---

## Step 5: Set Environment Variables

```bash
# Set Clerk production keys
railway variables set CLERK_SECRET_KEY="your_clerk_secret_key_here"
railway variables set CLERK_PUBLISHABLE_KEY="pk_test_Z29yZ2VvdXMtZ2xpZGVyLTk0LmNsZXJrLmFjY291bnRzLmRldiQ"

# Set LLM configuration
railway variables set LLM_PROVIDER="groq"
railway variables set GROQ_API_KEY="your_groq_api_key_here"
railway variables set GROQ_MODEL="llama-3.3-70b-versatile"

# Set other configurations
railway variables set EMBEDDING_PROVIDER="huggingface"
railway variables set LANGCHAIN_TRACING_V2="false"
railway variables set LANGCHAIN_API_KEY=""

# CORS will be set after Vercel deployment
# For now, allow localhost
railway variables set ALLOWED_ORIGINS="http://localhost:3000"
```

---

## Step 6: Deploy Backend

```bash
# Deploy from server directory
railway up

# Railway will:
# ✓ Detect Python 3.11 (from runtime.txt)
# ✓ Install dependencies (requirements.txt)
# ✓ Start uvicorn with 2 workers
# ✓ Connect to PostgreSQL and Redis

# Watch the deployment
railway logs
```

---

## Step 7: Get Your Backend URL

```bash
# Generate a public domain
railway domain

# You'll get something like:
# docuchat-portfolio-backend-production.up.railway.app

# Save this URL - you'll need it for Vercel
```

---

## Step 8: Run Database Migration

```bash
# Option A: Run migration remotely
railway run python migrations/add_user_quotas.py

# Option B: Connect to Railway shell and run manually
railway run bash
# Inside shell:
python migrations/add_user_quotas.py
exit
```

---

## Step 9: Test Backend

```bash
# Test health endpoint
curl https://your-backend-url.up.railway.app/api/upload/info

# You should see JSON with security_features
```

---

## Step 10: Deploy Frontend to Vercel

```bash
cd /Users/chromeo/Projects/AI-Portfolio/rag-docuchat-sass/client

# Install Vercel CLI if needed
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# Follow prompts:
# - "Set up and deploy?" → Yes
# - "Which scope?" → Your account
# - "Link to existing project?" → No
# - "What's your project's name?" → docuchat-portfolio
# - "In which directory is your code located?" → ./
# - "Want to override settings?" → No

# Vercel will build and deploy
# You'll get: https://docuchat-portfolio.vercel.app
```

---

## Step 11: Configure Vercel Environment Variables

Go to Vercel dashboard: https://vercel.com/your-username/docuchat-portfolio

1. Click **Settings** → **Environment Variables**
2. Add these variables for **Production**:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_Z29yZ2VvdXMtZ2xpZGVyLTk0LmNsZXJrLmFjY291bnRzLmRldiQ
CLERK_SECRET_KEY=sk_test_dtmmCmOllVW8gBFvqD4h4QzargFc33NutsjdKNMipg
NEXT_PUBLIC_API_URL=https://your-backend-url.up.railway.app
```

3. Click **Save**
4. Redeploy:

```bash
vercel --prod
```

---

## Step 12: Update CORS on Railway

Now that you have your Vercel URL, update CORS:

```bash
cd /Users/chromeo/Projects/AI-Portfolio/rag-docuchat-sass/server

# Update CORS to include Vercel domain
railway variables set ALLOWED_ORIGINS="http://localhost:3000,https://docuchat-portfolio.vercel.app"

# Railway will automatically redeploy
```

---

## Step 13: Update Clerk Redirect URLs

1. Go to Clerk Dashboard: https://dashboard.clerk.com
2. Select your application
3. Navigate to: **Configure** → **Paths**
4. Add to **Allowed redirect URLs**:
   - `https://docuchat-portfolio.vercel.app`
   - `https://docuchat-portfolio.vercel.app/*`
5. Click **Save**

---

## Step 14: Test End-to-End

1. Visit your Vercel URL: `https://docuchat-portfolio.vercel.app`
2. Click "Sign In" (should work with Clerk)
3. Create an account or sign in
4. Upload a test PDF
5. Wait for ingestion
6. Ask a question
7. Verify you get a RAG-powered answer ✅

---

## 🎉 You're Live!

**Frontend**: https://docuchat-portfolio.vercel.app
**Backend**: https://your-backend-url.up.railway.app

---

## 📊 Monitor Your Deployment

### Railway Dashboard
```bash
# Open Railway dashboard
railway open
```

View:
- Deployment logs
- Database queries
- Resource usage
- Environment variables

### Vercel Dashboard
Go to: https://vercel.com/your-username/docuchat-portfolio

View:
- Build logs
- Runtime logs
- Analytics
- Deployments

---

## 🚨 Troubleshooting

### Backend won't deploy
```bash
# Check logs
railway logs

# Common issues:
# - Python version mismatch → Check runtime.txt
# - Missing dependencies → Verify requirements.txt
# - Database connection → Check DATABASE_URL is set
```

### Frontend can't connect to backend
```bash
# 1. Verify CORS includes Vercel URL
railway variables get ALLOWED_ORIGINS

# 2. Verify API URL is set in Vercel
# Go to Vercel → Settings → Environment Variables
# Check NEXT_PUBLIC_API_URL

# 3. Check Network tab in browser DevTools
# Look for CORS errors
```

### Clerk authentication fails
1. Verify redirect URLs in Clerk dashboard match your Vercel URL exactly
2. Check that Clerk keys are set in both Railway and Vercel
3. Try signing out and back in

### Database migration fails
```bash
# Connect to database directly
railway run psql $DATABASE_URL

# Check if tables exist
\dt

# If migrations didn't run, run manually:
railway run python migrations/add_user_quotas.py
```

---

## 💰 Cost Estimate

Your portfolio deployment will cost approximately:

- **Railway**: $5-10/month (Hobby plan)
  - PostgreSQL: Included
  - Redis: Included
  - 500 hours/month compute

- **Vercel**: $0/month (Hobby plan - free!)
  - 100 GB bandwidth
  - Serverless functions

- **Clerk**: $0-25/month
  - Free tier: 10,000 MAUs
  - Essential: $25/month if you need more

**Total**: ~$5-35/month

---

## 🔄 Making Updates

### Update Backend Code

```bash
cd /Users/chromeo/Projects/AI-Portfolio/rag-docuchat-sass/server

# Make your changes, then:
railway up

# Railway auto-deploys
```

### Update Frontend Code

```bash
cd /Users/chromeo/Projects/AI-Portfolio/rag-docuchat-sass/client

# Make your changes, then:
vercel --prod

# Or push to GitHub and enable auto-deploy:
# Vercel → Settings → Git → Enable Auto Deploy
```

---

## 📋 Next Steps After Deployment

1. **Add Custom Domain** (Optional)
   - Railway: Settings → Networking → Custom Domain
   - Vercel: Settings → Domains

2. **Set Up Monitoring**
   ```bash
   # Add Sentry for error tracking
   npm install @sentry/nextjs
   ```

3. **Create Demo Content**
   - Upload 5-10 sample PDFs
   - Create sample conversations
   - Record Loom demo video

4. **Update Portfolio**
   - Add live demo link to resume
   - Create case study blog post
   - Share on LinkedIn

---

## 🎯 Your Deployment URLs

Fill these in after deployment:

**Frontend**: https://_____________________.vercel.app
**Backend**: https://_____________________.up.railway.app
**Railway Dashboard**: https://railway.app/project/_____
**Vercel Dashboard**: https://vercel.com/_____/_____

---

**Ready to deploy? Run the commands above step by step!** 🚀

If you get stuck, check the troubleshooting section or reach out.
