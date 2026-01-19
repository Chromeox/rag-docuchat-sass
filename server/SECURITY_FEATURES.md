# DocuChat Security Features

## Overview

Comprehensive security enhancements implemented to prevent resource abuse, injection attacks, and malicious file uploads.

## 1. User Quotas System

### Tier-Based Limits

| Feature | Free Tier | Pro Tier | Enterprise |
|---------|-----------|----------|------------|
| Max Documents | 50 | 1,000 | Unlimited |
| Storage Limit | 500MB | 10GB | Unlimited |
| Queries/Day | 1,000 | 50,000 | Unlimited |

### Implementation

**Database Schema:**
```python
class UserQuota:
    user_id: str (PK)
    tier: str  # free | pro | enterprise
    document_count: int
    total_storage_bytes: int
    queries_today: int
    last_query_reset: date
```

**Service Methods:**
- `check_document_quota(user_id, file_size)` - Validate before upload
- `check_query_quota(user_id)` - Validate before chat
- `increment_document_count(user_id, file_size)` - Track uploads
- `decrement_document_count(user_id, file_size)` - Track deletions
- `increment_query_count(user_id)` - Track chat queries
- `get_usage_stats(user_id)` - Get current usage
- `upgrade_tier(user_id, new_tier)` - Change subscription

### API Endpoints

**GET /api/upload/quota**
```json
{
  "tier": "free",
  "documents": {
    "used": 15,
    "limit": 50,
    "unlimited": false
  },
  "storage": {
    "used_bytes": 52428800,
    "used_mb": 50.0,
    "limit_bytes": 524288000,
    "limit_mb": 500,
    "unlimited": false
  },
  "queries": {
    "used_today": 42,
    "limit_per_day": 1000,
    "unlimited": false,
    "resets_at": "midnight UTC"
  }
}
```

### Error Responses

**403 Forbidden - Document Limit**
```json
{
  "detail": "Document limit reached (50/50). Delete old documents or upgrade your plan.\n\nUpgrade to Pro for: Unlimited documents, 10GB storage, unlimited queries"
}
```

**403 Forbidden - Storage Limit**
```json
{
  "detail": "Storage limit exceeded. Current: 495.5MB, File: 10.2MB, Limit: 500MB. Delete old documents or upgrade your plan."
}
```

**403 Forbidden - Query Limit**
```json
{
  "detail": "Daily query limit reached (1000/1000). Limit resets at midnight UTC or upgrade your plan."
}
```

## 2. Input Sanitization

### Message Sanitization

**Function:** `sanitize_message(message, max_length=10000)`

**Removes:**
- HTML tags (`<script>`, `<iframe>`, etc.)
- Control characters (null bytes, etc.)
- Excessive whitespace
- HTML entities (decoded first)

**Example:**
```python
Input:  "<script>alert('xss')</script>Hello\x00World"
Output: "alert('xss')HelloWorld"
```

### Filename Sanitization

**Function:** `sanitize_filename(filename, max_length=255)`

**Prevents:**
- Path traversal (`../../../etc/passwd`)
- Special shell characters
- Hidden files (leading dots)
- Invalid extensions

**Example:**
```python
Input:  "../../../malicious|<>:file.pdf"
Output: "malicious_file.pdf"
```

### User ID Validation

**Function:** `validate_user_id(user_id)`

**Validates:**
- Alphanumeric + underscores/dashes only
- Length ≤ 255 characters
- Not empty

**Example:**
```python
Valid:   "user_abc123", "valid-user-id"
Invalid: "user@example.com", "user/path", ""
```

## 3. File Validation

### Multi-Layer Validation

**1. Extension Check**
- Allowed: `.pdf`, `.txt`, `.md`, `.docx`, `.doc`, `.csv`, `.json`, `.py`, `.js`, `.jsx`, `.ts`, `.tsx`, `.html`, `.css`

**2. MIME Type Verification**
```python
Extension: .pdf
Expected:  application/pdf
Detected:  (checked via mimetypes)
```

**3. Executable Detection**
- Windows PE (MZ signature)
- Linux ELF (0x7fELF)
- macOS Mach-O (0xcafebabe)

**4. PDF Content Scanning**

Scans for dangerous patterns:
- `/JavaScript` - Embedded JavaScript
- `/Launch` - Launch external programs
- `/SubmitForm` - Form submission to external URLs
- `/GoToR` - Go to remote resources
- `/OpenAction` - Auto-execute actions
- `/AA` - Additional Actions (triggers)

**5. Zip Bomb Detection**

For `.zip` and `.docx` files:
- Checks compression ratio (max 100:1)
- Validates extracted size (max 100MB)

**Example:**
```python
Compressed:    1MB
Extracted:     150MB
Ratio:         150:1
Result:        REJECTED (suspicious compression)
```

### Validation Flow

```
1. Upload file → temp location (.tmp)
2. Run comprehensive validation
3. If PASS → rename to final location
4. If FAIL → delete temp file, return error
5. Update database + quotas
```

## 4. API Integration

### Upload Endpoint Security

**POST /api/upload**

```python
Security Layers:
1. Rate limiting (10/minute)
2. User ID validation
3. Filename sanitization
4. Extension check
5. Size validation (10MB max)
6. Document quota check
7. Storage quota check
8. MIME type verification
9. Malicious content detection
10. Zip bomb protection
11. PDF executable scanning
12. Quota tracking
```

### Chat Endpoint Security

**POST /api/chat**

```python
Security Layers:
1. Rate limiting (30/minute)
2. User ID validation
3. Message sanitization
4. Query quota check
5. Query count tracking
```

### Delete Endpoint Security

**DELETE /api/documents/{id}**

```python
Security Actions:
1. Verify ownership
2. Delete file
3. Delete DB record
4. Update quota (decrement counts)
5. Rebuild vector store
```

## 5. Rate Limiting

Applied via `@limiter.limit()` decorator:

| Endpoint | Limit | Purpose |
|----------|-------|---------|
| POST /upload | 10/min | Prevent bulk uploads |
| POST /chat | 30/min | Prevent API abuse |
| GET /upload/info | 60/min | Public info |
| GET /upload/quota | 60/min | Usage checks |
| DELETE /documents/{id} | 10/min | Prevent bulk deletions |

## 6. Migration Guide

### Step 1: Install Dependencies

Already included in `requirements.txt`:
- `fastapi`
- `sqlalchemy`
- Standard library only (no new deps needed)

### Step 2: Run Database Migration

```bash
cd /Users/chromeo/Projects/AI-Portfolio/rag-docuchat-sass/server
python migrations/add_user_quotas.py
```

This will:
1. Create `user_quotas` table
2. Initialize quotas for existing users
3. Calculate current usage from documents

### Step 3: Test Implementation

```bash
python test_security_enhancements.py
```

Tests:
- ✓ Input sanitization
- ✓ File validation
- ✓ Quota enforcement
- ✓ Integration

### Step 4: Verify Endpoints

```bash
# Start server
uvicorn app.main:app --reload

# Test quota endpoint
curl -H "X-User-ID: test_user" http://localhost:8000/api/upload/quota

# Test upload with validation
curl -X POST -H "X-User-ID: test_user" \
  -F "files=@test.pdf" \
  http://localhost:8000/api/upload
```

## 7. Security Best Practices

### For Developers

1. **Always sanitize user input** before processing
2. **Check quotas** before expensive operations
3. **Validate files** comprehensively (not just extensions)
4. **Track usage** for quota enforcement
5. **Log security events** for monitoring

### For Production

1. **Monitor quota usage** for abuse patterns
2. **Set up alerts** for quota violations
3. **Regular security audits** of uploaded files
4. **Review logs** for injection attempts
5. **Update tier limits** based on usage patterns

## 8. Common Attack Scenarios

### Scenario 1: Path Traversal Attack

**Attack:**
```bash
filename: "../../../etc/passwd"
```

**Defense:**
```python
sanitize_filename() → "etc_passwd"
```

### Scenario 2: XSS in Chat

**Attack:**
```json
{"question": "<script>alert('xss')</script>"}
```

**Defense:**
```python
sanitize_message() → "alert('xss')"
```

### Scenario 3: Malicious PDF

**Attack:**
```
PDF with embedded JavaScript:
/JavaScript "app.alert('malicious')"
```

**Defense:**
```python
scan_pdf_content() → HTTPException 400
"PDF contains potentially dangerous code: /JavaScript"
```

### Scenario 4: Zip Bomb

**Attack:**
```
1MB file → extracts to 10GB
```

**Defense:**
```python
check_zip_bomb() → HTTPException 400
"Compressed file extracts to 10240.0MB, exceeds maximum 100MB"
```

### Scenario 5: Resource Exhaustion

**Attack:**
```
Upload 1000 documents to exhaust storage
```

**Defense:**
```python
check_document_quota() → HTTPException 403
"Document limit reached (50/50). Upgrade to Pro"
```

## 9. Monitoring & Alerts

### Key Metrics to Track

1. **Quota Violations** - Users hitting limits
2. **Rejected Files** - Failed validations
3. **Sanitization Events** - Input cleaning
4. **Rate Limit Hits** - API abuse attempts
5. **Tier Distribution** - Free vs Pro vs Enterprise

### Logging Examples

```python
# Quota violation
logger.warning(f"User {user_id} exceeded document quota: {count}/{limit}")

# Malicious file detected
logger.critical(f"Malicious PDF detected from user {user_id}: {filename}")

# Sanitization applied
logger.info(f"Sanitized message from user {user_id}: removed {tags_count} HTML tags")
```

## 10. Future Enhancements

### Planned Features

1. **IP-based rate limiting** (in addition to user-based)
2. **File signature verification** (using `python-magic`)
3. **Virus scanning integration** (ClamAV)
4. **Content-based file type detection** (replace mimetypes)
5. **Automated tier upgrades** (Stripe integration)
6. **Admin dashboard** for quota management
7. **Usage analytics** and reporting
8. **Webhook notifications** for quota events

### Optional Dependencies

For enhanced security:

```bash
# Deep file inspection
pip install python-magic

# Virus scanning
pip install pyclamd

# Advanced PDF parsing
pip install PyPDF2
```

---

## Summary

✓ **Quotas**: 3-tier system with document, storage, and query limits
✓ **Sanitization**: HTML removal, path traversal prevention, input validation
✓ **File Validation**: MIME type, executable detection, PDF scanning, zip bombs
✓ **Rate Limiting**: Per-endpoint limits to prevent abuse
✓ **API Integration**: All endpoints secured with multiple layers
✓ **Database**: UserQuota table with automatic usage tracking
✓ **Testing**: Comprehensive test suite for all features
✓ **Migration**: Scripts to add features to existing systems

**Result:** Production-ready security for SaaS RAG application preventing resource abuse and malicious content.
