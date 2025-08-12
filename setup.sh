#!/bin/bash

# Reporter Engine - Development Setup Script
# This script helps set up the development environment quickly

set -e

echo "🚀 Setting up Reporter Engine development environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js v18 or higher."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | sed 's/v//')
REQUIRED_VERSION="18.0.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    print_error "Node.js version $NODE_VERSION is installed, but version $REQUIRED_VERSION or higher is required."
    exit 1
fi

print_success "Node.js version $NODE_VERSION is compatible"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm."
    exit 1
fi

print_success "npm is available"

# Install dependencies
print_status "Installing dependencies..."
if npm ci; then
    print_success "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# Setup environment file
if [ ! -f ".env" ]; then
    print_status "Setting up environment file..."
    cp .env.example .env
    print_success "Environment file created from .env.example"
    print_warning "Please edit .env file with your actual API keys if you plan to use AI features"
else
    print_warning ".env file already exists, skipping creation"
fi

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p server/data/reports
mkdir -p server/uploads
mkdir -p logs

# Copy example data files if they don't exist
if [ ! -f "server/data/users.json" ]; then
    cp server/data/users.example.json server/data/users.json
    print_success "Created users.json from example"
fi

if [ ! -f "server/data/projects.json" ]; then
    cp server/data/projects.example.json server/data/projects.json
    print_success "Created projects.json from example"
fi

# Run linting to check code quality
print_status "Running code quality checks..."
if npm run lint; then
    print_success "Code quality checks passed"
else
    print_warning "Code quality checks found issues. Run 'npm run lint:fix' to auto-fix some issues."
fi

# Try to build the application
print_status "Building application..."
if npm run build; then
    print_success "Application built successfully"
else
    print_error "Build failed. Please check the errors above."
    exit 1
fi

# Print setup completion message
echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "📋 What's next:"
echo "  1. Edit .env file with your API keys (optional for AI features)"
echo "  2. Start development server: npm run dev"
echo "  3. Open browser: http://localhost:5173"
echo "  4. Login with admin/admin123"
echo ""
echo "📖 Useful commands:"
echo "  npm run dev       - Start development server (frontend + backend)"
echo "  npm run server    - Start only backend server"
echo "  npm run build     - Build for production"
echo "  npm run lint      - Check code quality"
echo "  npm run lint:fix  - Fix code quality issues"
echo ""
echo "📚 Documentation:"
echo "  README.md         - Main documentation"
echo "  docs/API.md       - API documentation"
echo "  docs/DEPLOYMENT.md - Deployment guide"
echo "  CONTRIBUTING.md   - Contribution guidelines"
echo ""
print_success "Happy coding! 🚀"
