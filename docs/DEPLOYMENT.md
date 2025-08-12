# Deployment Guide

This guide covers various deployment options for Reporter Engine.

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)

1. **Create docker-compose.yml**:

```yaml
version: '3.8'

services:
  reporter-engine:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - CLIENT_URL=http://localhost:3001
    volumes:
      - ./data:/app/server/data
      - ./uploads:/app/server/uploads
    restart: unless-stopped

  # Optional: Add nginx for reverse proxy
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - reporter-engine
    restart: unless-stopped
```

2. **Create Dockerfile**:

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S reporter -u 1001

# Copy package files
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=builder --chown=reporter:nodejs /app/dist ./dist
COPY --from=builder --chown=reporter:nodejs /app/server ./server

# Create necessary directories
RUN mkdir -p server/data server/uploads && \
    chown -R reporter:nodejs server/data server/uploads

# Switch to non-root user
USER reporter

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (res) => { \
    if (res.statusCode === 200) { \
      process.exit(0) \
    } else { \
      process.exit(1) \
    } \
  }).on('error', () => process.exit(1))"

# Start application
CMD ["node", "server/index.js"]
```

3. **Deploy**:

```bash
docker-compose up -d
```

### Using Docker Only

```bash
# Build image
docker build -t reporter-engine .

# Run container
docker run -d \
  --name reporter-engine \
  -p 3001:3001 \
  -v $(pwd)/data:/app/server/data \
  -v $(pwd)/uploads:/app/server/uploads \
  -e NODE_ENV=production \
  reporter-engine
```

## ☁️ Cloud Deployment

### Vercel (Frontend + Serverless Functions)

1. **Install Vercel CLI**:
```bash
npm i -g vercel
```

2. **Create vercel.json**:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server/index.js",
      "use": "@vercel/node"
    },
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/server/index.js"
    },
    {
      "src": "/(.*)",
      "dest": "/dist/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

3. **Deploy**:
```bash
vercel --prod
```

### Heroku

1. **Create Procfile**:
```
web: node server/index.js
```

2. **Create heroku.yml** (for container deployment):
```yaml
build:
  docker:
    web: Dockerfile
run:
  web: node server/index.js
```

3. **Deploy**:
```bash
# Using Git
git add .
git commit -m "Deploy to Heroku"
git push heroku main

# Using Heroku CLI
heroku create your-app-name
heroku config:set NODE_ENV=production
heroku config:set CLIENT_URL=https://your-app-name.herokuapp.com
git push heroku main
```

### AWS EC2

1. **Launch EC2 instance** (Ubuntu 20.04 LTS)

2. **Install dependencies**:
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install nginx (optional)
sudo apt install nginx -y
```

3. **Deploy application**:
```bash
# Clone repository
git clone https://github.com/Qeagle/reporter-engine.git
cd reporter-engine

# Install dependencies
npm install

# Build application
npm run build

# Start with PM2
pm2 start server/index.js --name "reporter-engine"
pm2 startup
pm2 save
```

4. **Configure nginx** (optional):
```nginx
server {
    listen 80;
    server_name your-domain.com;

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
}
```

### DigitalOcean App Platform

1. **Create app.yaml**:
```yaml
name: reporter-engine
services:
- name: web
  source_dir: /
  github:
    repo: Qeagle/reporter-engine
    branch: main
  run_command: node server/index.js
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: NODE_ENV
    value: "production"
  - key: PORT
    value: "8080"
  http_port: 8080
```

2. **Deploy via CLI**:
```bash
doctl apps create --spec app.yaml
```

### Railway

1. **Connect GitHub repository**
2. **Set environment variables**:
   - `NODE_ENV=production`
   - `PORT=$PORT` (Railway provides this)
3. **Deploy automatically on push**

## 🔒 Production Configuration

### Environment Variables

```bash
# Required
NODE_ENV=production
PORT=3001

# Optional AI features
GROQ_API_KEY=your_groq_api_key
OPENAI_API_KEY=your_openai_api_key

# Security
JWT_SECRET=your_strong_jwt_secret
SESSION_SECRET=your_session_secret

# CORS
CLIENT_URL=https://your-domain.com

# Database (if using external DB)
DATABASE_URL=postgresql://user:pass@host:port/db

# Storage (if using cloud storage)
AZURE_STORAGE_CONNECTION_STRING=your_azure_connection
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
```

### SSL/HTTPS Configuration

#### Using Let's Encrypt with Certbot

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

#### Using Cloudflare

1. **Add your domain to Cloudflare**
2. **Update nameservers**
3. **Enable SSL/TLS encryption**
4. **Configure origin certificates**

### Performance Optimization

#### PM2 Cluster Mode

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'reporter-engine',
    script: 'server/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm Z'
  }]
};
```

#### Nginx Configuration

```nginx
upstream reporter_engine {
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
    server 127.0.0.1:3004;
}

server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    location / {
        proxy_pass http://reporter_engine;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static file caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## 📊 Monitoring

### Health Checks

```bash
# Simple health check
curl http://localhost:3001/api/health

# Detailed monitoring with Uptime Robot
# Add webhook URL to monitor /api/health endpoint
```

### Logging

```javascript
// Add to server/index.js
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'reporter-engine' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}
```

### Metrics with Prometheus

```javascript
// Add to server/index.js
import prometheus from 'prom-client';

// Create metrics
const httpDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

// Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpDuration.observe(
      { method: req.method, route: req.route?.path || req.path, status_code: res.statusCode },
      duration
    );
  });
  next();
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(prometheus.register.metrics());
});
```

## 🔄 CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to production
        env:
          DEPLOY_HOST: ${{ secrets.DEPLOY_HOST }}
          DEPLOY_USER: ${{ secrets.DEPLOY_USER }}
          DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
        run: |
          echo "$DEPLOY_KEY" > deploy_key
          chmod 600 deploy_key
          ssh -i deploy_key -o StrictHostKeyChecking=no $DEPLOY_USER@$DEPLOY_HOST << 'EOF'
            cd /path/to/reporter-engine
            git pull origin main
            npm ci
            npm run build
            pm2 restart reporter-engine
          EOF
```

## 🚨 Troubleshooting

### Common Issues

1. **Port conflicts**: Change PORT in environment variables
2. **Permission issues**: Ensure proper file permissions for uploads directory
3. **Memory issues**: Increase Node.js memory limit with `--max-old-space-size=4096`
4. **SSL certificate issues**: Verify certificate paths and permissions

### Performance Tuning

1. **Enable compression**: Use gzip middleware
2. **Database optimization**: Add indexes for frequently queried fields
3. **Caching**: Implement Redis for session storage
4. **CDN**: Use CloudFlare or AWS CloudFront for static assets

This deployment guide covers the most common scenarios. For specific requirements or issues, please refer to the platform-specific documentation or create an issue in the repository.
