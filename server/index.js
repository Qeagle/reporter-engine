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
      process.env.CLIENT_URL || "http://localhost:5173"
    ],
    methods: ["GET", "POST"]
  }
});

// Initialize database
const databaseService = new DatabaseService();

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: [
    process.env.CLIENT_URL || "http://localhost:5173", 
    "http://localhost:5174"
  ],
  credentials: true
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

server.listen(PORT, () => {
  console.log(`🚀 Reporter Engine v2.0 server running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`🔗 API Health: http://localhost:${PORT}/api/health`);
  console.log(`🗄️  Database: SQLite with RBAC enabled`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export { app, server, io };