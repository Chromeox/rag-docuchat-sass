# DocuChat White-Label Deployment Guide

## Quick Setup (2 Hours)

### Prerequisites
- Client's custom domain (e.g., docs.clientcompany.com)
- Client's brand colors/logo
- Railway account
- Vercel account
- Clerk account

---

## Step 1: Environment Setup (15 min)

### Railway (Backend)
```bash
# Create new Railway project
railway init

# Add PostgreSQL database
railway add

# Set environment variables
railway variables set LLM_PROVIDER=groq
railway variables set GROQ_MODEL=llama-3.3-70b-versatile
railway variables set EMBEDDING_PROVIDER=openai

# Client's API keys
railway variables set GROQ_API_KEY=<client-key>
railway variables set OPENAI_API_KEY=<client-key>
railway variables set CLERK_SECRET_KEY=<from-clerk>
railway variables set CLERK_PUBLISHABLE_KEY=<from-clerk>

# CORS (add client's domain)
railway variables set ALLOWED_ORIGINS=https://docs.clientcompany.com

# Deploy
railway up
```

### Vercel (Frontend)
```bash
# Deploy to Vercel
cd client
vercel --prod

# Set environment variables
vercel env add NEXT_PUBLIC_API_URL production  # Railway URL
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY production
vercel env add CLERK_SECRET_KEY production

# Add custom domain
vercel domains add docs.clientcompany.com
```

---

## Step 2: Clerk Configuration (10 min)

1. Create new Clerk application
2. Add client's domain as satellite domain
3. Copy API keys to Railway + Vercel
4. Configure sign-up/sign-in pages

---

## Step 3: Branding Customization (30 min)

### Colors (Tailwind Config)
```javascript
// client/tailwind.config.ts
theme: {
  extend: {
    colors: {
      primary: "#CLIENT_PRIMARY_COLOR",    // Replace blue-600
      secondary: "#CLIENT_SECONDARY_COLOR", // Replace purple-600
      accent: "#CLIENT_ACCENT_COLOR"        // Replace green-600
    }
  }
}
```

### Logo
```bash
# Replace logo
cp client-logo.png client/public/logo.png

# Update in components/Header.tsx
<Image src="/logo.png" alt="Client Name" />
```

### Company Name
```bash
# Global find/replace
find client/app -type f -name "*.tsx" -exec sed -i '' 's/DocuChat/ClientName/g' {} +
```

---

## Step 4: Domain & DNS (15 min)

### At Client's Domain Registrar:
```
Type: CNAME
Name: docs (or subdomain)
Value: cname.vercel-dns.com
```

### Verify in Vercel:
- Domain shows as "Ready"
- SSL certificate issued (automatic)

---

## Step 5: Testing Checklist (30 min)

- [ ] Sign up flow works
- [ ] Upload PDF document
- [ ] Ask questions about document
- [ ] Streaming responses work
- [ ] Conversation history saves
- [ ] Delete document works
- [ ] Mobile responsive

---

## Step 6: Client Handoff (30 min)

### Deliver:
1. **Access Credentials**
   - Clerk dashboard access
   - Railway dashboard access (optional)
   - Admin account

2. **Documentation**
   - User guide (how to upload docs)
   - Admin guide (how to manage users)
   - Troubleshooting guide

3. **Support Plan**
   - Monthly retainer for updates
   - Bug fixes included
   - Feature requests (additional cost)

---

## Pricing Model

### Setup Package: $1,500
- Custom domain setup
- Brand customization
- Initial deployment
- Testing & QA
- User training

### Monthly Retainer: $200-500
- Infrastructure costs (Railway + Vercel)
- Bug fixes & updates
- Support (email/Slack)
- Usage monitoring

### Add-ons:
- Voice chat feature: +$500 setup, +$100/month
- Custom integrations: $500-2000
- Team features: +$300/month
- Analytics dashboard: +$400 setup

---

## Tech Stack (For Client Presentation)

**Frontend:**
- Next.js 14 (React framework)
- TypeScript (type safety)
- Tailwind CSS (modern styling)
- Clerk (authentication)

**Backend:**
- FastAPI (Python web framework)
- PostgreSQL (database)
- OpenAI (embeddings)
- Groq (LLM inference)

**Infrastructure:**
- Vercel (frontend hosting)
- Railway (backend hosting)
- Auto-scaling
- 99.9% uptime SLA

---

## Maintenance Schedule

### Weekly:
- Monitor error logs
- Check API usage/costs

### Monthly:
- Review performance metrics
- Client check-in call
- Feature requests discussion

### Quarterly:
- Dependency updates
- Security patches
- Cost optimization review

---

## Emergency Contacts

**Infrastructure Issues:**
- Railway: dashboard.railway.app
- Vercel: vercel.com/dashboard
- Clerk: dashboard.clerk.com

**Developer Support:**
- Your contact info
- Response time: 24-48 hours
- Emergency: Same day

---

## Future Roadmap

### Phase 2 (Voice Features)
- Real-time voice input
- Text-to-speech responses
- OpenAI Realtime API integration
- Multi-language support

### Phase 3 (Team Features)
- Workspace management
- Role-based access control
- Team document sharing
- Usage analytics

### Phase 4 (Enterprise)
- SSO integration
- Custom AI models
- On-premise deployment
- Advanced security
