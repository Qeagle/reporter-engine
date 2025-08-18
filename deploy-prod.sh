#!/bin/bash

# Production deployment script for Reporter Engine
echo "🚀 Deploying Reporter Engine to Production (Same Machine)..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if running as root for port 80
if [ "$EUID" -ne 0 ] && [ "$(id -u)" != "0" ]; then
    print_warning "Port 80 requires root privileges. Consider using nginx reverse proxy."
fi

# Step 1: Clean previous builds
print_step "1. Cleaning previous builds..."
npm run clean
rm -rf dist

# Step 2: Install/update dependencies
print_step "2. Installing dependencies..."
npm install --production=false

# Step 3: Build frontend for production
print_step "3. Building frontend for production..."
npm run build:production

if [ ! -d "dist" ]; then
    print_error "Frontend build failed! dist directory not created."
    exit 1
fi

print_status "Frontend built successfully!"

# Step 4: Check ports
print_step "4. Checking port availability..."
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    print_error "Port 3001 is already in use. Stopping existing process..."
    pkill -f "node server/index.js" || true
    sleep 2
fi

# Step 5: Database verification
print_step "5. Verifying database..."
if [ -f "server/data/database.sqlite" ]; then
    print_status "Database found: server/data/database.sqlite"
else
    print_warning "Database not found. Will be created on first run."
fi

# Step 6: Create production scripts
print_step "6. Creating production startup scripts..."

cat > start-production.sh << 'EOF'
#!/bin/bash

echo "🚀 Starting Reporter Engine in Production Mode..."
echo ""
echo "Configuration:"
echo "  Frontend: Served by backend on port 3001"
echo "  Backend: http://localhost:3001"
echo "  Access: http://localhost:3001"
echo ""

# Set production environment
export NODE_ENV=production
export PORT=3001

# Start the application
node server/index.js
EOF

chmod +x start-production.sh

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'reporter-engine',
    script: 'server/index.js',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '1G',
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    log_file: 'logs/combined.log',
    time: true
  }]
};
EOF

mkdir -p logs

# Create nginx configuration for port 80
cat > nginx.conf.template << 'EOF'
server {
    listen 80;
    server_name localhost;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
EOF

# Final instructions
print_step "7. Production deployment complete!"
echo ""
print_status "📁 Frontend built and ready in ./dist"
print_status "⚙️  Production scripts created:"
print_status "   - start-production.sh (Direct start)"
print_status "   - ecosystem.config.js (PM2 process manager)"
print_status "   - nginx.conf.template (Nginx reverse proxy)"
echo ""
print_status "🚀 Start Options:"
echo ""
echo "Option 1 - Direct start:"
echo "  ./start-production.sh"
echo "  Access: http://localhost:3001"
echo ""
echo "Option 2 - Using PM2 (recommended):"
echo "  npm install -g pm2"
echo "  pm2 start ecosystem.config.js"
echo "  pm2 startup && pm2 save"
echo ""
echo "Option 3 - Using Nginx for port 80:"
echo "  1. sudo apt install nginx"
echo "  2. sudo cp nginx.conf.template /etc/nginx/sites-available/reporter-engine"
echo "  3. sudo ln -s /etc/nginx/sites-available/reporter-engine /etc/nginx/sites-enabled/"
echo "  4. sudo nginx -t && sudo systemctl reload nginx"
echo "  5. ./start-production.sh"
echo "  Access: http://localhost (port 80)"
echo ""
print_status "🌐 Application configuration:"
print_status "   Backend: http://localhost:3001"
print_status "   Database: SQLite (existing data preserved)"
print_status "   Environment: Production"
