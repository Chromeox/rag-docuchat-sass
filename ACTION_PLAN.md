# DocuChat Project - Strategic Action Plan

**Date:** January 19, 2026
**Goal:** Production-ready white-label RAG chatbot for small business clients
**Timeline:** Complete core fixes today, voice features as stretch goal

---

## 🎯 Project Vision Summary

**Market Position:**
- Target: Small businesses (can't afford enterprise solutions)
- Pitch: Deploy custom AI chatbot in 2 hours vs 2 months
- Pricing: $1,500 setup + $200-500/month retainer
- Differentiator: Voice chat support (stretch feature)

**Use Cases:**
1. Portfolio piece for Vancouver job search
2. Service offering for small businesses
3. Learning experience building production AI systems

---

## 🚨 Critical Issues (Fix Today)

### Issue #1: Database Not Initialized - 500 Errors
**Problem:** `init_db()` is commented out in `app/main.py` (line 34)
**Impact:** ALL API requests fail (upload, conversations, documents)
**Root Cause:** Database tables don't exist

**Fix:**
```python
# server/app/main.py
@app.on_event("startup")
def startup():
    init_db()  # UNCOMMENT THIS
```

**Steps:**
1. Uncomment `init_db()` in server/app/main.py
2. Commit and push to trigger Railway redeploy
3. Verify database tables are created
4. Test upload again

**Priority:** 🔴 CRITICAL - Nothing works without this

---

### Issue #2: Rename Vercel Project "client" → "docu-chat"
**Problem:** Generic name "client" not descriptive
**Impact:** Confusing for portfolio/clients
**Risk:** May break environment variables, domains, integrations

**Safe Approach:**
Renaming in Vercel dashboard updates:
- ✅ Project URL slug
- ✅ Dashboard references
- ⚠️ Need to verify: Custom domain, environment variables, Clerk satellite domains

**Steps:**
1. **Before rename:** Document current settings
   - Custom domain: chat.gethobbi.com
   - Environment variables: 3 (NEXT_PUBLIC_API_URL, CLERK keys)
   - Clerk satellite domains: chat.gethobbi.com

2. **Rename in Vercel:**
   - Settings → General → Project Name → "docu-chat"
   - Save

3. **Verify after rename:**
   - Custom domain still works: https://chat.gethobbi.com
   - Environment variables intact
   - New project URL: vercel.com/chromeoxs-projects/docu-chat

4. **Update Clerk if needed:**
   - Check if satellite domain needs updating
   - Should auto-update, but verify

**Priority:** 🟡 MEDIUM - Can do after database fix

---

### Issue #3: GitHub Auto-Deploy Not Connected
**Problem:** Manual `vercel --prod` required for every deploy
**Impact:** Slow iteration, manual work

**Steps:**
1. Go to: https://vercel.com/chromeoxs-projects/client/settings/git
2. Click "Connect Git Repository"
3. Select: Chromeox/rag-docuchat-sass
4. Set Root Directory: `client`
5. Production Branch: `main`
6. Save

**Priority:** 🟢 LOW - Nice to have, but manual works

---

## 📋 Execution Order (Next 2 Hours)

### Phase 1: Fix Database (30 min)
- [ ] Uncomment init_db() in server/app/main.py
- [ ] Commit: "fix: enable database initialization on startup"
- [ ] Push to Railway (triggers automatic deploy)
- [ ] Wait for Railway build (~2 min)
- [ ] Check logs: `railway logs --tail 20`
- [ ] Verify no more 500 errors

### Phase 2: Test Upload Flow (15 min)
- [ ] Go to https://chat.gethobbi.com
- [ ] Sign in with existing account
- [ ] Drag-and-drop a PDF file
- [ ] Verify upload succeeds
- [ ] Ask a question about the document
- [ ] Verify RAG response works

### Phase 3: Rename Vercel Project (10 min)
- [ ] Document current settings (domain, env vars)
- [ ] Rename in Vercel dashboard: client → docu-chat
- [ ] Verify custom domain still works
- [ ] Verify environment variables intact
- [ ] Test site loads at chat.gethobbi.com

### Phase 4: Connect GitHub Auto-Deploy (10 min)
- [ ] Vercel dashboard → Git settings
- [ ] Connect Chromeox/rag-docuchat-sass
- [ ] Set root directory: client
- [ ] Test with small commit
- [ ] Verify auto-deploy triggers

### Phase 5: Full End-to-End Test (20 min)
- [ ] Sign up flow (new account)
- [ ] Upload 3 different file types (PDF, DOCX, TXT)
- [ ] Ask questions about each document
- [ ] Test conversation history
- [ ] Test document manager
- [ ] Test mobile responsiveness
- [ ] Test delete document

### Phase 6: Documentation (30 min)
- [ ] Update README with architecture diagram
- [ ] Create CLIENT_DEMO_SCRIPT.md for sales pitches
- [ ] Create VOICE_FEATURE_ROADMAP.md for stretch goal
- [ ] Update DEPLOYMENT_GUIDE.md with lessons learned

### Phase 7: Portfolio Preparation (15 min)
- [ ] Take screenshots of working app
- [ ] Record 2-min demo video
- [ ] Create one-page PDF about project
- [ ] Add to portfolio website

---

## 🎤 Voice Chat Feature Roadmap (Stretch Goal)

**Phase 1: Research (2-4 hours)**
- [ ] Evaluate OpenAI Realtime API vs alternatives
- [ ] Test voice input/output latency
- [ ] Estimate costs per minute of voice chat
- [ ] Design UI for voice interaction

**Phase 2: Implementation (8-12 hours)**
- [ ] Add voice input button to chat UI
- [ ] Integrate speech-to-text (OpenAI Whisper)
- [ ] Stream text responses to text-to-speech
- [ ] Add voice activity detection
- [ ] Test with real documents

**Phase 3: Polish (4-6 hours)**
- [ ] Add "thinking" animations during voice
- [ ] Support multiple languages
- [ ] Add voice settings (speed, accent)
- [ ] Mobile voice support

**Total Estimate:** 14-22 hours (2-3 days part-time)

**Cost Impact:**
- OpenAI Whisper: ~$0.006/minute
- OpenAI TTS: ~$0.015/minute
- Total: ~$0.02/minute voice chat
- 100 minutes/month: +$2/month infrastructure cost

**Pricing Adjustment:**
- Voice feature: +$500 setup fee
- +$100/month for voice support
- Covers API costs + premium feature

---

## 🏆 Success Metrics

**Technical:**
- [ ] < 2s response time for text queries
- [ ] < 5s for voice responses
- [ ] 99% uptime over 30 days
- [ ] Zero 500 errors in production

**Business:**
- [ ] 3 client demos scheduled
- [ ] 1 paid client within 30 days
- [ ] 5 job applications submitted (portfolio piece)
- [ ] Positive feedback from beta users

**Learning:**
- [ ] Understand RAG architecture deeply
- [ ] Master Vercel + Railway deployment
- [ ] Learn voice AI integration
- [ ] Build reusable deployment system

---

## 📞 Next Steps After Today

**Week 1:**
- Polish UI based on feedback
- Add analytics tracking
- Create sales website

**Week 2:**
- Reach out to 10 small businesses
- Schedule 3 demos
- Refine pitch based on feedback

**Week 3:**
- Start voice chat feature
- Build demo video
- Apply to jobs with portfolio piece

**Month 2:**
- Land first paying client
- Use feedback to improve
- Add team features

---

## 🎯 Current Status

**Completed ✅:**
- Custom domain setup (chat.gethobbi.com)
- Drag-and-drop inline upload UI
- CORS configuration
- Clerk authentication
- Railway backend deployed
- Vercel frontend deployed

**In Progress 🚧:**
- Database initialization (critical bug)
- GitHub auto-deploy setup

**Not Started ❌:**
- Voice chat feature
- Analytics dashboard
- Team features
- Marketing website

---

## Let's Execute! 🚀

Ready to start with **Phase 1: Fix Database**?
