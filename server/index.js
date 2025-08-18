import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import { Server as socketIo } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Import routes
import testRoutes from './routes/testRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import authRoutes from './routes/authRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import invitationRoutes from './routes/invitationRoutes.js';
import defectRoutes from './routes/defectRoutes.js';
import failureAnalysisRoutes from './routes/failureAnalysisRoutes.js';
import trendRoutes from './routes/trendRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import annotationRoutes from './routes/annotationRoutes.js';

// Import middleware
import authMiddleware from './middleware/authMiddleware.js';
import errorHandler from './middleware/errorHandler.js';

// Import services
import DatabaseService from './services/DatabaseService.js';
import ReportService from './services/ReportService.js';
import WebSocketService from './services/WebSocketService.js';

const app = express();
const server = http.createServer(app);
const io = new socketIo(server, {
  cors: {
    origin: [
      process.env.CLIENT_URL || "http://localhost",
      "http://localhost",
      "http://127.0.0.1",
      "http://localhost:80",
      /^http:\/\/localhost(:\d+)?$/ // Allow localhost with any port
    ],
    methods: ["GET", "POST"],
    credentials: true
  },
  allowEIO3: true,
  transports: ['websocket', 'polling']
});

// Initialize database
const databaseService = new DatabaseService();

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, // Disable CSP that might block HTTP resources
  hsts: false, // Disable HSTS for HTTP deployments
  crossOriginOpenerPolicy: false // Disable COOP header that causes warnings
}));
app.use(cors({
  origin: [
    process.env.CLIENT_URL || "http://localhost",
    "http://localhost",
    "http://127.0.0.1", 
    "http://localhost:80",
    /^http:\/\/localhost(:\d+)?$/ // Allow localhost with any port
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Disposition', 'Content-Length', 'Content-Type']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files for uploads
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Add CORS headers for uploaded files
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});

app.use('/uploads', express.static(uploadsDir));

// Serve static frontend files in production
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '..', 'dist');
  
  // Ensure dist directory exists
  if (fs.existsSync(frontendPath)) {
    app.use(express.static(frontendPath, {
      maxAge: '1d', // Cache static assets for 1 day
      etag: true,
      setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      }
    }));
    
    // Serve index.html for all non-API routes (SPA routing)
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
        return next();
      }
      res.sendFile(path.join(frontendPath, 'index.html'));
    });
    
    console.log(`📁 Serving static files from: ${frontendPath}`);
  } else {
    console.warn(`⚠️  Frontend build not found at: ${frontendPath}`);
    console.warn(`   Run 'npm run build:production' to build the frontend`);
  }
}

// Initialize services
const reportService = new ReportService();
const webSocketService = new WebSocketService(io);

// Make services available to routes
app.locals.databaseService = databaseService;
app.locals.reportService = reportService;
app.locals.webSocketService = webSocketService;

// Public routes
app.use('/api/auth', authRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/invitations', invitationRoutes);

// Protected routes
app.use('/api/tests', testRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/defects', defectRoutes);
app.use('/api/analysis', failureAnalysisRoutes);
app.use('/api/trends', trendRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/annotations', annotationRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    database: 'SQLite with RBAC'
  });
});

// Database health check
app.get('/api/health/database', (req, res) => {
  try {
    const userCount = databaseService.db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const projectCount = databaseService.db.prepare('SELECT COUNT(*) as count FROM projects').get().count;
    const testRunCount = databaseService.db.prepare('SELECT COUNT(*) as count FROM test_runs').get().count;
    
    res.json({
      status: 'healthy',
      database: 'SQLite',
      statistics: {
        users: userCount,
        projects: projectCount,
        testRuns: testRunCount
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Error handling
app.use(errorHandler);

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('join-report', (reportId) => {
    socket.join(`report-${reportId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  databaseService.close();
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  databaseService.close();
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Reporter Engine v2.0 server running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  if (process.env.NODE_ENV === 'production') {
    console.log(`🌐 Production Mode: Frontend served from backend`);
    console.log(`🔗 Main Access: http://localhost (port 80 → ${PORT})`);
  } else {
    console.log(`🔗 API Health: http://localhost:${PORT}/api/health`);
  }
  console.log(`🗄️  Database: SQLite with RBAC enabled`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export { app, server, io };