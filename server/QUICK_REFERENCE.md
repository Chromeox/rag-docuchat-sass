# DocuChat Security Quick Reference

## 🚀 Quick Start

### Run Migration
```bash
cd /Users/chromeo/Projects/AI-Portfolio/rag-docuchat-sass/server
source venv/bin/activate
python migrations/add_user_quotas.py
```

### Run Tests
```bash
python test_security_enhancements.py
```

### Start Server
```bash
uvicorn app.main:app --reload
```

---

## 📊 Quota Limits

| Tier | Documents | Storage | Queries/Day |
|------|-----------|---------|-------------|
| **Free** | 50 | 500MB | 1,000 |
| **Pro** | 1,000 | 10GB | 50,000 |
| **Enterprise** | ∞ | ∞ | ∞ |

---

## 🔌 API Endpoints

### Check Quota Usage
```bash
curl -H "X-User-ID: user123" \
  http://localhost:8000/api/upload/quota
```

### Upload with Validation
```bash
curl -X POST -H "X-User-ID: user123" \
  -F "files=@document.pdf" \
  http://localhost:8000/api/upload
```

### Chat with Sanitization
```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -H "X-User-ID: user123" \
  -d '{"question": "What is this document about?"}'
```

---

## 🛡️ Security Features

### Input Sanitization
- ✅ HTML tag removal
- ✅ Control character stripping
- ✅ Path traversal prevention
- ✅ User ID validation

### File Validation
- ✅ MIME type verification
- ✅ Executable detection (PE/ELF/Mach-O)
- ✅ PDF content scanning (/JavaScript, /Launch, etc.)
- ✅ Zip bomb protection (compression ratio + size)
- ✅ Size limits (10MB per file)

### Quota Enforcement
- ✅ Document count limits
- ✅ Storage space limits
- ✅ Daily query limits
- ✅ Automatic reset at midnight UTC

---

## 🔧 Common Tasks

### Upgrade User Tier
```python
from app.services.quota_service import QuotaService
from app.db.database import SessionLocal

db = SessionLocal()
quota_service = QuotaService(db)
quota_service.upgrade_tier("user_abc123", "pro")
db.close()
```

### Recalculate User Usage
```python
quota_service.recalculate_usage("user_abc123")
```

### Check Current Usage
```python
stats = quota_service.get_usage_stats("user_abc123")
print(f"Documents: {stats['documents']['used']}/{stats['documents']['limit']}")
print(f"Storage: {stats['storage']['used_mb']}MB/{stats['storage']['limit_mb']}MB")
print(f"Queries: {stats['queries']['used_today']}/{stats['queries']['limit_per_day']}")
```

---

## 📝 Error Responses

### Quota Exceeded (403)
```json
{
  "detail": "Document limit reached (50/50). Delete old documents or upgrade your plan.\n\nUpgrade to Pro for: Unlimited documents, 10GB storage, unlimited queries"
}
```

### File Validation Failed (400)
```json
{
  "detail": "File validation failed: PDF contains potentially dangerous code: /JavaScript"
}
```

### Invalid Input (400)
```json
{
  "detail": "Invalid filename: Filename must have an extension"
}
```

---

## 🔍 Monitoring

### Check Quota Violations
```sql
-- Users near limits
SELECT user_id, document_count, tier
FROM user_quotas
WHERE (document_count > 45 AND tier = 'free')
   OR (document_count > 900 AND tier = 'pro');
```

### High Query Users
```sql
SELECT user_id, queries_today, tier
FROM user_quotas
WHERE queries_today > 900
ORDER BY queries_today DESC
LIMIT 10;
```

### Storage Usage
```sql
SELECT
  user_id,
  tier,
  ROUND(total_storage_bytes / (1024.0 * 1024.0), 2) as mb_used
FROM user_quotas
WHERE total_storage_bytes > 450 * 1024 * 1024
ORDER BY total_storage_bytes DESC;
```

---

## 🎯 Key Files

| File | Purpose |
|------|---------|
| `/app/services/quota_service.py` | Quota management logic |
| `/app/utils/sanitize.py` | Input sanitization functions |
| `/app/utils/file_validator.py` | File validation & scanning |
| `/app/api/upload.py` | Upload endpoint with 12 security layers |
| `/app/api/chat.py` | Chat endpoint with sanitization |
| `/migrations/add_user_quotas.py` | Database migration script |
| `/test_security_enhancements.py` | Comprehensive test suite |

---

## 🚨 Troubleshooting

### Issue: Quota count doesn't match documents
**Solution**: Recalculate usage
```python
quota_service.recalculate_usage("user_id")
```

### Issue: File validation too strict
**Solution**: Update MIME type mapping in `/app/utils/file_validator.py`

### Issue: Need different tier limits
**Solution**: Edit `QuotaService.TIER_LIMITS` in `/app/services/quota_service.py`

### Issue: User ID validation failing
**Solution**: Check format - must be alphanumeric + underscores/dashes only

---

## 📚 Documentation

- **Full Security Guide**: `SECURITY_FEATURES.md` (421 lines)
- **Implementation Details**: `SECURITY_IMPLEMENTATION.md` (current status)
- **Quick Reference**: This file

---

## ✅ Pre-Launch Checklist

- [x] Database migration run
- [x] All tests passing
- [x] Security features documented
- [ ] Environment variables set
- [ ] Monitoring configured
- [ ] Alerts set up for quota violations
- [ ] Stripe webhooks configured (for upgrades)
- [ ] Admin dashboard deployed (optional)

---

**Last Updated**: 2026-01-18
**Version**: 1.0.0
**Status**: Production Ready ✅
