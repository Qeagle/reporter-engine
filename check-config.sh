#!/bin/bash

echo "🔧 Reporter Engine Port Configuration Summary"
echo "=============================================="
echo ""

echo "📋 Current Configuration:"
echo "  Frontend (Vite): Port 80"
echo "  Backend (Node.js): Port 3001"
echo "  HMR WebSocket: Port 24678"
echo ""

echo "🔍 Checking configuration files..."
echo ""

# Check vite.config.ts
echo "📄 vite.config.ts:"
grep -n "port:" /Users/babu/Desktop/reporter/vite.config.ts | head -5
echo ""

# Check package.json scripts
echo "📄 package.json key scripts:"
grep -A5 -B1 "frontend\|backend\|server\|preview" /Users/babu/Desktop/reporter/package.json | grep -E "frontend|backend|server|preview" | head -10
echo ""

# Check .env file
echo "📄 .env configuration:"
grep -E "PORT|CLIENT_URL|VITE_API_URL" /Users/babu/Desktop/reporter/.env
echo ""

# Check if ports are currently in use
echo "🔍 Port Status Check:"
echo "Port 80 (Frontend):"
if lsof -Pi :80 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "  ⚠️  Port 80 is in use"
    lsof -Pi :80 -sTCP:LISTEN
else
    echo "  ✅ Port 80 is available"
fi

echo ""
echo "Port 3001 (Backend):"
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "  ⚠️  Port 3001 is in use"
    lsof -Pi :3001 -sTCP:LISTEN
else
    echo "  ✅ Port 3001 is available"
fi

echo ""
echo "Port 24678 (HMR):"
if lsof -Pi :24678 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "  ⚠️  Port 24678 is in use"
    lsof -Pi :24678 -sTCP:LISTEN
else
    echo "  ✅ Port 24678 is available"
fi

echo ""
echo "🚀 Quick Start Commands:"
echo "  Development: ./start-dev.sh (or npm run dev)"
echo "  Production:  ./deploy-prod.sh"
echo ""
echo "🌐 Access URLs:"
echo "  Development Frontend: http://localhost:80"
echo "  Development Backend:  http://localhost:3001"
echo "  API Health Check:     http://localhost:3001/api/health"
echo ""
echo "⚠️  Note: Port 80 requires root/sudo privileges"
echo "   Alternative: Use nginx reverse proxy from port 80 to 3001"
