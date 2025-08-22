import express from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import TestController from '../controllers/TestController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    console.log(`📁 File upload: ${file.originalname}, mimetype: ${file.mimetype}`);
    const allowedTypes = [
      'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/avi',
      'text/plain', 'application/json', 'application/zip',
      'application/octet-stream' // For various binary files
    ];
    if (allowedTypes.includes(file.mimetype) || file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      console.log(`❌ Rejected file type: ${file.mimetype}`);
      cb(new Error('Invalid file type'), false);
    }
  }
});

const testController = new TestController();

// Test execution endpoints (require authentication)
router.post('/start', authMiddleware, testController.startTestExecution.bind(testController));
router.post('/result', authMiddleware, testController.reportTestResult.bind(testController));
router.post('/update', authMiddleware, testController.updateTestExecution.bind(testController));
router.post('/complete', authMiddleware, testController.completeTestExecution.bind(testController));
router.post('/artifact', authMiddleware, upload.single('file'), testController.uploadArtifact.bind(testController));

// Test step endpoints
router.post('/step', authMiddleware, testController.addTestStep.bind(testController));

// Batch operations
router.post('/batch/results', authMiddleware, testController.batchTestResults.bind(testController));

// Serve uploaded artifacts (public access)
router.get('/artifacts/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '../uploads', filename);
  
  // Set appropriate headers based on file type
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.avi': 'video/avi',
    '.zip': 'application/zip',
    '.json': 'application/json',
    '.txt': 'text/plain'
  };
  
  const mimeType = mimeTypes[ext] || 'application/octet-stream';
  res.setHeader('Content-Type', mimeType);
  
  // For images and videos, allow inline viewing
  if (mimeType.startsWith('image/') || mimeType.startsWith('video/')) {
    res.setHeader('Content-Disposition', 'inline');
  } else {
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filename)}"`);
  }
  
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Error serving artifact:', err);
      res.status(404).json({ error: 'Artifact not found' });
    }
  });
});

// Secure artifacts endpoint with authentication (for API access)
router.get('/secure-artifacts/:filename', authMiddleware, (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '../uploads', filename);
  
  // Set appropriate headers based on file type
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.avi': 'video/avi',
    '.zip': 'application/zip',
    '.json': 'application/json',
    '.txt': 'text/plain'
  };
  
  const mimeType = mimeTypes[ext] || 'application/octet-stream';
  res.setHeader('Content-Type', mimeType);
  
  // For images and videos, allow inline viewing
  if (mimeType.startsWith('image/') || mimeType.startsWith('video/')) {
    res.setHeader('Content-Disposition', 'inline');
  } else {
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filename)}"`);
  }
  
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Error serving artifact:', err);
      res.status(404).json({ error: 'Artifact not found' });
    }
  });
});

export default router;