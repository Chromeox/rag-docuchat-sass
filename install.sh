#!/bin/bash
# DocuChat One-Click Installer
# Usage: curl -fsSL https://raw.githubusercontent.com/Chromeox/rag-docuchat-sass/main/install.sh | bash

set -e

echo "============================================"
echo "   DocuChat Enterprise Installer v1.0"
echo "============================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Detect OS
OS="$(uname -s)"
ARCH="$(uname -m)"

echo -e "${BLUE}Detected: $OS ($ARCH)${NC}"
echo ""

# Check for Docker
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Docker not found. Installing...${NC}"
    if [ "$OS" = "Darwin" ]; then
        echo "Please install Docker Desktop from https://docker.com/products/docker-desktop"
        echo "Then run this script again."
        exit 1
    else
        curl -fsSL https://get.docker.com | sh
        sudo usermod -aG docker $USER
        echo -e "${GREEN}Docker installed! You may need to log out and back in.${NC}"
    fi
fi

# Check Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Install directory
INSTALL_DIR="${DOCUCHAT_DIR:-$HOME/docuchat}"
echo -e "${BLUE}Installing to: $INSTALL_DIR${NC}"

mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# Clone or update repo
if [ -d ".git" ]; then
    echo "Updating existing installation..."
    git pull origin main
else
    echo "Downloading DocuChat..."
    git clone https://github.com/Chromeox/rag-docuchat-sass.git .
fi

cd client

# Create env file if not exists
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo ""
    echo -e "${YELLOW}================================================${NC}"
    echo -e "${YELLOW}IMPORTANT: Configure your environment variables${NC}"
    echo -e "${YELLOW}================================================${NC}"
    echo ""
    echo "Edit the file: $INSTALL_DIR/client/.env"
    echo ""
    echo "Required:"
    echo "  - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (get from clerk.com)"
    echo "  - CLERK_SECRET_KEY (get from clerk.com)"
    echo ""
    echo "Optional:"
    echo "  - OPENAI_API_KEY (for cloud LLM instead of local)"
    echo ""
    read -p "Press Enter to continue after editing .env, or Ctrl+C to exit..."
fi

# Start services
echo ""
echo "Starting DocuChat services..."
docker compose pull 2>/dev/null || true
docker compose up -d

# Wait for services to start
echo "Waiting for services to initialize..."
sleep 10

# Pull LLM model if using Ollama
if docker ps | grep -q ollama; then
    echo ""
    echo "Downloading AI model (this may take 2-5 minutes)..."
    docker exec docuchat-client-ollama-1 ollama pull llama3.2:3b 2>/dev/null || \
    docker exec ollama ollama pull llama3.2:3b 2>/dev/null || \
    echo -e "${YELLOW}Note: Could not auto-pull model. Run manually: ollama pull llama3.2:3b${NC}"
fi

# Get local IP for network access
LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || ipconfig getifaddr en0 2>/dev/null || echo "localhost")

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}   DocuChat installed successfully! 🎉${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "Access DocuChat:"
echo "  - Local:   http://localhost:3000"
echo "  - Network: http://$LOCAL_IP:3000"
echo ""
echo "Useful commands:"
echo "  cd $INSTALL_DIR/client"
echo "  docker compose logs -f     # View logs"
echo "  docker compose restart     # Restart services"
echo "  docker compose down        # Stop services"
echo ""
echo "Documentation: $INSTALL_DIR/client/SETUP.md"
echo ""
