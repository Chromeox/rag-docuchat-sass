# GitHub → Vercel Auto-Deploy Setup

## Quick Steps (5 minutes)

### 1. Go to Vercel Project Settings
URL: https://vercel.com/chromeoxs-projects/client/settings/git

### 2. Connect Git Repository
Click: **"Connect Git Repository"** button

### 3. Select GitHub Repository
- Choose: `Chromeox/rag-docuchat-sass`
- If not listed, click "Adjust GitHub App Permissions" to grant access

### 4. Configure Build Settings
**Root Directory:** `client` ⚠️ IMPORTANT
**Framework Preset:** Next.js (should auto-detect)
**Production Branch:** `main`

### 5. Save Configuration
Click **"Save"** - that's it!

---

## What Happens After Setup

### Automatic Deployments Trigger On:
✅ Every push to `main` branch
✅ Every pull request (preview deployment)
✅ Every merge to `main`

### Deployment Process:
1. You push code: `git push origin main`
2. GitHub webhook notifies Vercel
3. Vercel builds from `client/` directory
4. Deploys to production (~30-60 seconds)
5. Available at https://chat.gethobbi.com

### Preview Deployments:
- Every PR gets unique preview URL
- Test changes before merging
- Auto-deleted after PR merges

---

## Verify It's Working

After setup, test with a small change:

```bash
# Make a small change
echo "\n// GitHub integration test" >> client/app/layout.tsx

# Commit and push
git add .
git commit -m "test: verify GitHub auto-deploy"
git push origin main

# Check Vercel dashboard - should see new deployment in ~10 seconds
```

---

## Troubleshooting

### "Repository not found"
→ Grant Vercel access in GitHub settings
→ https://github.com/settings/installations

### "Build failed"
→ Check root directory is set to `client`
→ Verify environment variables are set

### "Domain not updating"
→ Wait 1-2 minutes for CDN propagation
→ Hard refresh browser (Cmd+Shift+R)

---

## Current Setup (Before GitHub Integration)

**How you deployed today:**
```bash
vercel --prod  # Manual CLI deployment
```

**After GitHub integration:**
```bash
git push origin main  # Automatic deployment!
```

Much easier! 🎉
