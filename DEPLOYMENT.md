# Production Deployment Guide

## Overview
This guide shows how to deploy the Reporter Engine on any port using environment variables, making it flexible for different server configurations.

## Quick Deployment

### 1. Default Deployment (Port 3002)
```bash
# Clone the repository
git clone --branch development https://github.com/Qeagle/reporter-engine.git
cd reporter-engine

# Run deployment script
./deploy-production.sh

# Start the application
npm start
```

### 2. Custom Port Deployment
```bash
# Deploy on a specific port (e.g., port 8080)
DEPLOY_PORT=8080 ./deploy-production.sh

# Start the application
npm start
```

### 3. Manual Port Configuration
If you prefer manual configuration:

```bash
# Set your desired port
export PORT=3002

# Create .env file
cat > .env << EOL
NODE_ENV=production
PORT=3002
JWT_SECRET=$(openssl rand -hex 32)
CLIENT_URL=http://your-server-ip:3002
EOL

# Create Vite environment file
cat > .env.production << EOL
VITE_API_URL=http://your-server-ip:3002
EOL

# Build and start
npm run build
npm start
```

## Environment Variables

### Backend (.env)
- `NODE_ENV`: Environment mode (production/development)
- `PORT`: Server port (default: 3001)
- `JWT_SECRET`: Secret key for JWT tokens
- `CLIENT_URL`: Frontend URL for CORS

### Frontend (.env.production)
- `VITE_API_URL`: Backend API URL
- `VITE_WS_URL`: WebSocket URL (optional)

## Port Checking

The deployment script automatically:
1. Checks if the target port is available
2. Shows what's using the port if it's busy
3. Allows you to specify a different port
4. Configures all services to use the chosen port

## Firewall Configuration

Make sure your firewall allows traffic on your chosen port:

```bash
# For Ubuntu/Debian
sudo ufw allow 3002

# For CentOS/RHEL
sudo firewall-cmd --add-port=3002/tcp --permanent
sudo firewall-cmd --reload
```

## Running as a Service

To run as a systemd service:

1. Update the service file with your port:
```bash
# Edit the service file
sudo nano /etc/systemd/system/reporter-engine.service

# Update WorkingDirectory and Environment variables
Environment=PORT=3002
```

2. Install and start the service:
```bash
sudo systemctl enable reporter-engine
sudo systemctl start reporter-engine
```

## Troubleshooting

### Port Already in Use
```bash
# Check what's using the port
sudo lsof -i :3002

# Use a different port
DEPLOY_PORT=3003 ./deploy-production.sh
```

### Service Not Accessible
1. Check firewall settings
2. Verify the service is running: `sudo systemctl status reporter-engine`
3. Check logs: `sudo journalctl -u reporter-engine -f`

### Environment Variables Not Working
1. Ensure `.env` and `.env.production` files exist
2. Restart the service after changing environment variables
3. Check that the build process completed successfully

## Multi-Environment Setup

You can run multiple instances on different ports:

```bash
# Instance 1 (testing)
DEPLOY_PORT=3002 ./deploy-production.sh
npm start &

# Instance 2 (staging)
DEPLOY_PORT=3003 ./deploy-production.sh
npm start &
```

Each instance will have its own configuration and database.
