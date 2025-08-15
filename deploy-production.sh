#!/bin/bash

# Production Deployment Script for Azure VM
# This script sets up and runs the Reporter Engine in production mode

echo "🚀 Starting Reporter Engine Production Deployment..."

# Set production environment
export NODE_ENV=production

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

# Build the frontend
echo "🏗️  Building frontend..."
npm run build

if [ ! -d "dist" ]; then
    echo "❌ Frontend build failed. dist directory not found."
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found. Creating a basic one..."
    cat > .env << EOL
NODE_ENV=production
PORT=3001
JWT_SECRET=$(openssl rand -hex 32)
CLIENT_URL=http://localhost:3001
EOL
    echo "✅ Basic .env file created. Please review and update as needed."
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
echo "   http://localhost:3001 (or your configured port)"
echo ""
echo "📱 Both frontend and backend will be served from the same port"
echo "💡 Make sure to configure your firewall to allow traffic on port 3001"
