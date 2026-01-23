# DocuChat Enterprise Deployment Guide

## Deployment Models

### 1. Cloud SaaS (Simplest)
**You host everything, they pay subscription**

```
┌─────────────────────────────────────────────────────┐
│                    YOUR CLOUD                        │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌────────┐ │
│  │ Vercel  │  │ FastAPI │  │ Vector  │  │ OpenAI │ │
│  │ Frontend│──│ Backend │──│   DB    │──│  API   │ │
│  └─────────┘  └─────────┘  └─────────┘  └────────┘ │
└─────────────────────────────────────────────────────┘
         ▲
         │ HTTPS
         ▼
┌─────────────────┐
│ Client Browser  │
└─────────────────┘
```

**Pros:** Easy to deploy, maintain, update
**Cons:** Data leaves their network, ongoing API costs
**Pricing:** $99-499/mo per seat + usage

---

### 2. On-Premise (Enterprise)
**Deploy to their servers, they own infrastructure**

```
┌─────────────────────────────────────────────────────┐
│               CLIENT'S INFRASTRUCTURE                │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌────────┐ │
│  │ Docker  │  │ FastAPI │  │ Chroma/ │  │ Local  │ │
│  │ Frontend│──│ Backend │──│ Weaviate│──│  LLM   │ │
│  └─────────┘  └─────────┘  └─────────┘  └────────┘ │
└─────────────────────────────────────────────────────┘
```

**Pros:** Data never leaves their network, full control
**Cons:** Higher setup cost, they manage infrastructure
**Pricing:** $10k-50k setup + $2k-10k/mo license

---

### 3. Hybrid (Best of Both)
**Their data stays local, LLM in cloud**

```
┌─────────────────────────────────────────────────────┐
│               CLIENT'S INFRASTRUCTURE                │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐             │
│  │ Frontend│  │ Backend │  │ Vector  │             │
│  │ (Docker)│──│ (Docker)│──│   DB    │             │
│  └─────────┘  └─────────┘  └─────────┘             │
└──────────────────────┬──────────────────────────────┘
                       │ Embeddings + Queries only
                       │ (no raw documents)
                       ▼
              ┌─────────────────┐
              │  YOUR CLOUD     │
              │  OpenAI / Claude│
              └─────────────────┘
```

**Pros:** Sensitive docs stay local, powerful cloud LLMs
**Cons:** Some data (embeddings) leaves network
**Pricing:** $5k setup + $500-2k/mo + API usage

---

### 4. Fully Local (Air-Gapped)
**Everything runs on their hardware, no internet required**

```
┌─────────────────────────────────────────────────────┐
│           CLIENT'S LOCAL HARDWARE                    │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌────────┐ │
│  │ Frontend│  │ Backend │  │ Chroma  │  │ Ollama │ │
│  │         │──│         │──│ (local) │──│ Llama3 │ │
│  └─────────┘  └─────────┘  └─────────┘  └────────┘ │
│                                                      │
│  Hardware: Server with GPU or Jetson Orin           │
└─────────────────────────────────────────────────────┘
```

**Pros:** Complete data sovereignty, works offline
**Cons:** Limited model capabilities, hardware cost
**Pricing:** $15k-30k setup + hardware + $1k/mo support

---

## Hardware Options for Local LLM

### Option A: Standard Server with GPU
```
Dell PowerEdge R750 + NVIDIA A10 (24GB)
- Cost: ~$15,000-25,000
- Can run: Llama 3 70B (quantized), Mixtral 8x7B
- Performance: ~30 tokens/sec
- Power: 500-800W
```

### Option B: NVIDIA Jetson AGX Orin
```
NVIDIA Jetson AGX Orin 64GB
- Cost: ~$2,000-2,500
- Can run: Llama 3 8B, Mistral 7B, Phi-3
- Performance: ~15-20 tokens/sec
- Power: 15-60W (edge-friendly)
- Size: Small form factor
```

### Option C: Mac Studio (M2 Ultra)
```
Mac Studio M2 Ultra (192GB unified memory)
- Cost: ~$8,000-10,000
- Can run: Llama 3 70B, Mixtral
- Performance: ~25-40 tokens/sec
- Power: 200W
- Bonus: Great for demos/dev
```

### Option D: Cloud GPU (Fallback)
```
AWS/GCP/Azure GPU instances
- Cost: $1-4/hour (on-demand)
- Can run: Any model size
- Use for: Burst capacity, testing
```

---

## Data Integration Patterns

### Pattern 1: Document Upload (Current)
```
User uploads files → Process → Vector DB → Query
```
**Best for:** Ad-hoc document analysis, small teams

### Pattern 2: File System Sync
```python
# Watch a shared drive / NAS
from watchdog.observers import Observer

class DocWatcher:
    def on_created(self, event):
        # Auto-ingest new documents
        ingest_document(event.src_path)

# Point at their network share
observer.schedule(DocWatcher(), "/mnt/company-docs", recursive=True)
```
**Best for:** Teams with existing file servers

### Pattern 3: CRM Integration (Salesforce, HubSpot)
```python
# Salesforce connector
from simple_salesforce import Salesforce

sf = Salesforce(username, password, security_token)

# Sync knowledge articles, case notes, product docs
articles = sf.query("SELECT Id, Title, Body FROM Knowledge__kav")
for article in articles['records']:
    ingest_document(article['Body'], metadata={'source': 'salesforce'})
```
**Best for:** Sales teams, support teams

### Pattern 4: Database Connector
```python
# Connect to their existing database
import sqlalchemy

engine = create_engine(client_connection_string)

# Sync product catalog, inventory, etc.
products = engine.execute("SELECT * FROM products")
for product in products:
    doc = f"Product: {product.name}\nSKU: {product.sku}\nDescription: {product.description}"
    ingest_document(doc, metadata={'type': 'product', 'sku': product.sku})
```
**Best for:** E-commerce, inventory queries

### Pattern 5: API Aggregator
```python
# Pull from multiple sources
sources = [
    {"name": "Confluence", "client": ConfluenceClient(api_key)},
    {"name": "Notion", "client": NotionClient(api_key)},
    {"name": "Google Drive", "client": GoogleDriveClient(creds)},
    {"name": "SharePoint", "client": SharePointClient(creds)},
]

for source in sources:
    docs = source['client'].fetch_all()
    for doc in docs:
        ingest_document(doc, metadata={'source': source['name']})
```
**Best for:** Enterprises with scattered documentation

---

## Installation Script (On-Premise)

```bash
#!/bin/bash
# install-docuchat.sh

echo "=== DocuChat Enterprise Installer ==="

# Check requirements
command -v docker >/dev/null 2>&1 || { echo "Docker required"; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "Docker Compose required"; exit 1; }

# Create directories
mkdir -p /opt/docuchat/{data,models,logs}

# Pull images
docker pull ghcr.io/your-org/docuchat-frontend:latest
docker pull ghcr.io/your-org/docuchat-backend:latest
docker pull chromadb/chroma:latest
docker pull ollama/ollama:latest

# Generate config
cat > /opt/docuchat/docker-compose.yml << 'EOF'
version: '3.8'
services:
  frontend:
    image: ghcr.io/your-org/docuchat-frontend:latest
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8000
    depends_on:
      - backend

  backend:
    image: ghcr.io/your-org/docuchat-backend:latest
    ports:
      - "8000:8000"
    environment:
      - CHROMA_HOST=chromadb
      - OLLAMA_HOST=ollama
      - LLM_MODEL=llama3:8b
    volumes:
      - /opt/docuchat/data:/app/data
    depends_on:
      - chromadb
      - ollama

  chromadb:
    image: chromadb/chroma:latest
    ports:
      - "8001:8000"
    volumes:
      - /opt/docuchat/data/chroma:/chroma/chroma

  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - /opt/docuchat/models:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
EOF

# Start services
cd /opt/docuchat
docker-compose up -d

# Pull LLM model
docker exec docuchat-ollama ollama pull llama3:8b

echo "=== Installation Complete ==="
echo "Access DocuChat at http://localhost:3000"
```

---

## Security Checklist

### Network
- [ ] TLS/HTTPS everywhere
- [ ] Firewall rules (only expose 443)
- [ ] VPN for remote access
- [ ] No public internet access for air-gapped

### Authentication
- [ ] SSO/SAML integration (Okta, Azure AD)
- [ ] MFA required
- [ ] Session timeout (15-30 min)
- [ ] Audit logging

### Data
- [ ] Encryption at rest (AES-256)
- [ ] Encryption in transit (TLS 1.3)
- [ ] Data retention policies
- [ ] PII detection and masking
- [ ] Regular backups

### Compliance
- [ ] SOC 2 Type II
- [ ] GDPR (if EU data)
- [ ] HIPAA (if healthcare)
- [ ] Data residency requirements

---

## Pricing Strategy

| Tier | Model | Setup | Monthly | Includes |
|------|-------|-------|---------|----------|
| **Starter** | Cloud SaaS | $0 | $99/seat | 10GB docs, 1000 queries |
| **Pro** | Cloud SaaS | $0 | $299/seat | 100GB docs, unlimited queries |
| **Business** | Hybrid | $5,000 | $999/seat | On-prem data, cloud LLM |
| **Enterprise** | On-Premise | $25,000+ | Custom | Full local, SSO, support |

### Hardware Pricing (if they buy)
- Jetson Orin: $2,500 + $500 setup
- Server + GPU: $20,000 + $2,000 setup
- Ongoing support: $1,000-5,000/mo

### Your Margin
- Cloud: 70-80% margin (after OpenAI costs)
- On-Premise: 60-70% margin (one-time + recurring)
- Hardware resale: 20-30% markup

---

## Sales Process

1. **Discovery Call**
   - What documents do they have?
   - Where is data stored? (Cloud, on-prem, hybrid)
   - Compliance requirements?
   - Budget and timeline?

2. **Demo**
   - Show cloud version
   - Upload their sample docs
   - Demonstrate Q&A capabilities

3. **POC (2-4 weeks)**
   - Deploy in their environment
   - Connect to real data sources
   - Measure accuracy and performance

4. **Proposal**
   - Recommended deployment model
   - Integration scope
   - Pricing and timeline

5. **Implementation**
   - Deploy infrastructure
   - Connect data sources
   - Train users
   - Go live

---

## FAQ

**Q: Do you scrape their servers?**
A: No scraping. We integrate via:
- File system watchers (with permission)
- API connectors (CRM, databases)
- User uploads
- Scheduled syncs with their approval

**Q: Who owns the data?**
A: They own all their data. We process it, never sell/share it.

**Q: Can it work offline?**
A: Yes, with local LLM (Ollama + Llama). Performance varies by hardware.

**Q: What about updates?**
A: Cloud = automatic. On-prem = quarterly releases, they control when to update.
