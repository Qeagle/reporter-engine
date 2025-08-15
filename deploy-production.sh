#!/bin/bash

# Production Deployment Script for Azure VM
# This script sets up and runs the Reporter Engine in production mode

echo "🚀 Starting Reporter Engine Production Deployment..."

# Default port (can be overridden)
DEPLOY_PORT=${DEPLOY_PORT:-3002}

# Check if port is available
echo "🔍 Checking if port $DEPLOY_PORT is available..."
if lsof -Pi :$DEPLOY_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "❌ Port $DEPLOY_PORT is already in use. Checking what's using it:"
    lsof -i :$DEPLOY_PORT 2>/dev/null || netstat -tlnp 2>/dev/null | grep $DEPLOY_PORT
    echo ""
    echo "💡 You can specify a different port by running:"
    echo "   DEPLOY_PORT=3003 ./deploy-production.sh"
    exit 1
fi

echo "✅ Port $DEPLOY_PORT is available"

# Set production environment
export NODE_ENV=production
export PORT=$DEPLOY_PORT

# Check if required dependencies are installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Get the public IP address of the VM
PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || echo "localhost")

# Create/update .env file with dynamic configuration
echo "⚙️  Configuring environment for port $DEPLOY_PORT..."
cat > .env << EOL
NODE_ENV=production
PORT=$DEPLOY_PORT
JWT_SECRET=$(openssl rand -hex 32)
CLIENT_URL=http://$PUBLIC_IP:$DEPLOY_PORT
API_BASE_URL=http://$PUBLIC_IP:$DEPLOY_PORT/api
WEBSOCKET_URL=ws://$PUBLIC_IP:$DEPLOY_PORT
EOL

# Create Vite environment file for frontend build
echo "🔧 Creating Vite environment configuration..."
cat > .env.production << EOL
VITE_API_URL=http://$PUBLIC_IP:$DEPLOY_PORT
VITE_WS_URL=ws://$PUBLIC_IP:$DEPLOY_PORT
EOL

# Build the frontend with the correct environment variables
echo "🏗️  Building frontend with port $DEPLOY_PORT configuration..."
npm run build

if [ ! -d "dist" ]; then
    echo "❌ Frontend build failed. dist directory not found."
    exit 1
fi

# Create necessary directories
mkdir -p server/uploads
mkdir -p server/data
mkdir -p server/data/reports
mkdir -p server/data/backup

# Set proper permissions
chmod -R 755 server/uploads
chmod -R 755 server/data

echo "✅ Setup complete!"
echo ""
echo "🎯 To start the application:"
echo "   npm start"
echo ""
echo "🌐 The application will be available at:"
echo "   http://$PUBLIC_IP:$DEPLOY_PORT"
echo "   http://localhost:$DEPLOY_PORT"
echo ""
echo "📱 Both frontend and backend will be served from port $DEPLOY_PORT"
echo "💡 Make sure to configure your firewall to allow traffic on port $DEPLOY_PORT"
echo ""
echo "🔧 Environment configured:"
echo "   - API URL: http://$PUBLIC_IP:$DEPLOY_PORT"
echo "   - WebSocket URL: ws://$PUBLIC_IP:$DEPLOY_PORT"
echo "   - Frontend build uses these URLs automatically"
