#!/bin/bash

# React Dev Insight Pro - Setup Script
# This script initializes the development environment

set -e

echo "🚀 Setting up React Dev Insight Pro..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    echo "Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${YELLOW}Warning: Node.js version 18+ is recommended (found v$NODE_VERSION)${NC}"
fi

echo -e "${GREEN}✓${NC} Node.js $(node -v) detected"

# Check for npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} npm $(npm -v) detected"

# Navigate to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

echo ""
echo -e "${BLUE}Installing dependencies...${NC}"
npm install

echo ""
echo -e "${BLUE}Setting up environment...${NC}"

# Create .env file if it doesn't exist
if [ ! -f "packages/server/.env" ]; then
    cp packages/server/.env.example packages/server/.env 2>/dev/null || cat > packages/server/.env << EOF
# React Dev Insight Pro - Server Configuration

# Anthropic API Key (required for AI analysis)
# Get your key from: https://console.anthropic.com
ANTHROPIC_API_KEY=

# Server Configuration
PORT=3847
HOST=localhost

# Enable debug logging
DEBUG=false
EOF
    echo -e "${GREEN}✓${NC} Created packages/server/.env"
    echo -e "${YELLOW}⚠${NC} Don't forget to add your ANTHROPIC_API_KEY to packages/server/.env"
else
    echo -e "${GREEN}✓${NC} packages/server/.env already exists"
fi

# Build the injector
echo ""
echo -e "${BLUE}Building injector...${NC}"
cd packages/injector
npm run build 2>/dev/null || echo -e "${YELLOW}⚠${NC} Injector build skipped (run 'npm run build' in packages/injector manually)"
cd "$PROJECT_ROOT"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Setup complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Next steps:"
echo ""
echo "  1. Add your Anthropic API key to packages/server/.env"
echo ""
echo "  2. Start the development servers:"
echo -e "     ${BLUE}npm run dev${NC}"
echo ""
echo "  3. Open http://localhost:5173 in your browser"
echo ""
echo "  4. Make sure your React app is running on http://localhost:3000"
echo "     (or configure the target URL in the dev tools)"
echo ""
echo -e "${YELLOW}Documentation:${NC} See README.md for detailed usage instructions"
echo ""
