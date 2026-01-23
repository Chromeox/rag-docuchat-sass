# DocuChat - Complete Setup & Deployment Guide

## Table of Contents
1. [Quick Start (Development)](#quick-start-development)
2. [Cloud Deployment](#cloud-deployment)
3. [Local/On-Premise Deployment](#local-on-premise-deployment)
4. [Client Installation Script](#client-installation-script)
5. [Environment Variables Reference](#environment-variables-reference)
6. [Troubleshooting](#troubleshooting)

---

## Quick Start (Development)

### Prerequisites
- Node.js 18+
- npm or yarn
- Git

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/Chromeox/rag-docuchat-sass.git
cd rag-docuchat-sass/client

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local

# 4. Edit .env.local with your keys:
#    - Get Clerk keys from https://clerk.com
#    - Set API URL (default: http://localhost:8000)

# 5. Run development server
npm run dev

# 6. Open http://localhost:3000
```

---

## Cloud Deployment

### Option A: Vercel (Recommended - Easiest)

**Cost:** Free tier available, ~$20/mo for Pro

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login to Vercel
vercel login

# 3. Deploy
cd client
vercel deploy --prod

# 4. Set environment variables in Vercel Dashboard:
#    - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
#    - CLERK_SECRET_KEY
#    - NEXT_PUBLIC_API_URL (your backend URL)
```

**Vercel Dashboard Setup:**
1. Go to https://vercel.com/dashboard
2. Import your GitHub repo
3. Add environment variables in Settings → Environment Variables
4. Redeploy

---

### Option B: Vercel + Railway (Full Stack)

**Cost:** ~$25-50/mo total

**Architecture:**
```
Vercel (Frontend) → Railway (Backend) → Railway (PostgreSQL/ChromaDB)
```

**Step 1: Deploy Backend to Railway**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Create new project
railway init

# Deploy backend
cd ../server  # or wherever your FastAPI backend is
railway up

# Get your backend URL (e.g., https://docuchat-backend.railway.app)
```

**Step 2: Deploy Frontend to Vercel**
```bash
cd ../client
vercel deploy --prod

# Set NEXT_PUBLIC_API_URL to your Railway backend URL
```

---

### Option C: DigitalOcean/Hetzner VPS (Budget)

**Cost:** $20-50/mo for 4GB+ RAM droplet

**Step 1: Create VPS**
- DigitalOcean: https://digitalocean.com (use Ubuntu 22.04)
- Hetzner: https://hetzner.com (cheaper, EU-based)

**Step 2: SSH into server and run:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Clone repo
git clone https://github.com/Chromeox/rag-docuchat-sass.git
cd rag-docuchat-sass/client

# Create environment file
cp .env.example .env
nano .env  # Edit with your values

# Start services
docker compose up -d

# Install Caddy for HTTPS (reverse proxy)
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy -y

# Configure Caddy
sudo nano /etc/caddy/Caddyfile
```

**Caddyfile content:**
```
yourdomain.com {
    reverse_proxy localhost:3000
}

api.yourdomain.com {
    reverse_proxy localhost:8000
}
```

```bash
# Restart Caddy
sudo systemctl restart caddy
```

---

## Local/On-Premise Deployment

### Option A: Mac Mini M4 ($599)

**Best for:** Small offices, demos, privacy-focused clients

**Step 1: Initial Setup**
```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Docker Desktop
brew install --cask docker

# Install Ollama (local LLM)
brew install ollama

# Start Ollama service
ollama serve &

# Pull a model (choose based on needs)
ollama pull llama3.2:3b      # Fast, good for most tasks (2GB)
# OR
ollama pull llama3.1:8b      # Better quality, slower (4.7GB)
# OR
ollama pull mistral:7b       # Great balance (4.1GB)
```

**Step 2: Clone and Configure**
```bash
# Clone repo
git clone https://github.com/Chromeox/rag-docuchat-sass.git
cd rag-docuchat-sass/client

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
nano .env.local
```

**Step 3: Start Services**
```bash
# Option A: Run directly (development style)
npm run dev

# Option B: Run with Docker (production style)
docker compose up -d
```

**Step 4: Access**
- Open http://localhost:3000
- Or from other devices on network: http://mac-mini-ip:3000

---

### Option B: Jetson Orin ($499-$2000)

**Best for:** Edge deployment, low power, always-on

**Step 1: Flash JetPack OS**
- Download JetPack from NVIDIA
- Flash to Jetson using SDK Manager

**Step 2: Install Dependencies**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Ollama for ARM
curl -fsSL https://ollama.com/install.sh | sh

# Pull model optimized for Jetson
ollama pull llama3.2:3b
```

**Step 3: Deploy DocuChat**
```bash
git clone https://github.com/Chromeox/rag-docuchat-sass.git
cd rag-docuchat-sass/client

# Use ARM-compatible compose file
docker compose -f docker-compose.arm.yml up -d
```

---

### Option C: Windows PC/Server

**Step 1: Install Prerequisites**
```powershell
# Install WSL2 (Windows Subsystem for Linux)
wsl --install

# Install Docker Desktop
# Download from https://docker.com/products/docker-desktop

# Install Ollama
# Download from https://ollama.com/download/windows
```

**Step 2: In WSL2 Terminal**
```bash
git clone https://github.com/Chromeox/rag-docuchat-sass.git
cd rag-docuchat-sass/client
docker compose up -d
```

---

## Client Installation Script

For easy client deployment, use this one-liner:

```bash
curl -fsSL https://raw.githubusercontent.com/Chromeox/rag-docuchat-sass/main/install.sh | bash
```

**Create this file in repo root:**

```bash
#!/bin/bash
# install.sh - DocuChat One-Click Installer

set -e

echo "============================================"
echo "   DocuChat Enterprise Installer v1.0"
echo "============================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check for Docker
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Docker not found. Installing...${NC}"
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    echo -e "${GREEN}Docker installed!${NC}"
fi

# Check for Docker Compose
if ! docker compose version &> /dev/null; then
    echo -e "${YELLOW}Docker Compose not found. Installing...${NC}"
    sudo apt install docker-compose-plugin -y
fi

# Create directory
INSTALL_DIR="$HOME/docuchat"
mkdir -p $INSTALL_DIR
cd $INSTALL_DIR

# Clone or update repo
if [ -d ".git" ]; then
    echo "Updating existing installation..."
    git pull
else
    echo "Downloading DocuChat..."
    git clone https://github.com/Chromeox/rag-docuchat-sass.git .
fi

cd client

# Create default env if not exists
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo -e "${YELLOW}Please edit $INSTALL_DIR/client/.env with your configuration${NC}"
fi

# Start services
echo "Starting DocuChat..."
docker compose up -d

# Pull LLM model
echo "Downloading AI model (this may take a few minutes)..."
docker exec docuchat-ollama-1 ollama pull llama3.2:3b 2>/dev/null || true

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}   DocuChat installed successfully!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "Access DocuChat at: http://localhost:3000"
echo ""
echo "Next steps:"
echo "1. Edit configuration: nano $INSTALL_DIR/client/.env"
echo "2. Restart if needed: cd $INSTALL_DIR/client && docker compose restart"
echo "3. View logs: cd $INSTALL_DIR/client && docker compose logs -f"
echo ""
```

---

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key | `pk_test_xxx` |
| `CLERK_SECRET_KEY` | Clerk secret key | `sk_test_xxx` |
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:8000` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `LLM_MODEL` | Ollama model to use | `llama3.2:3b` |
| `EMBEDDING_MODEL` | Embedding model | `nomic-embed-text` |
| `OPENAI_API_KEY` | OpenAI key (if using cloud LLM) | - |
| `CHROMA_HOST` | ChromaDB host | `chromadb` |
| `CHROMA_PORT` | ChromaDB port | `8000` |

### Getting Clerk Keys

1. Go to https://clerk.com
2. Create a new application
3. Go to API Keys in dashboard
4. Copy Publishable Key and Secret Key

---

## Troubleshooting

### Common Issues

**Port 3000 already in use:**
```bash
# Find what's using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or change port in docker-compose.yml
```

**Docker permission denied:**
```bash
sudo usermod -aG docker $USER
# Log out and back in
```

**Ollama model download fails:**
```bash
# Check Ollama is running
ollama list

# Manually pull model
ollama pull llama3.2:3b
```

**Backend connection refused:**
```bash
# Check backend is running
docker compose ps

# Check logs
docker compose logs backend

# Restart backend
docker compose restart backend
```

**Out of memory (local LLM):**
```bash
# Use a smaller model
ollama pull phi3:mini  # Only 2.3GB

# Or use cloud LLM instead (set OPENAI_API_KEY)
```

### Logs & Debugging

```bash
# View all logs
docker compose logs -f

# View specific service
docker compose logs -f frontend
docker compose logs -f backend
docker compose logs -f ollama

# Check container status
docker compose ps

# Restart everything
docker compose down && docker compose up -d

# Full reset (removes data!)
docker compose down -v
docker compose up -d
```

### Support

- GitHub Issues: https://github.com/Chromeox/rag-docuchat-sass/issues
- Email: [your-email]

---

## Deployment Checklist

### Before Going Live

- [ ] Set up Clerk authentication
- [ ] Configure environment variables
- [ ] Test document upload and query
- [ ] Set up HTTPS (Caddy/nginx/Cloudflare)
- [ ] Configure backup strategy
- [ ] Set up monitoring (optional)
- [ ] Test on target hardware

### Security Checklist

- [ ] HTTPS enabled
- [ ] Clerk authentication working
- [ ] API rate limiting configured
- [ ] File upload size limits set
- [ ] No sensitive data in git
- [ ] Regular security updates planned
