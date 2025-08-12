import express from 'express';
import AIAnalysisController from '../controllers/AIAnalysisController.js';

const router = express.Router();
const aiController = AIAnalysisController;

// AI Analysis routes
router.post('/reports/:reportId/analyze', aiController.analyzeReport.bind(aiController));
router.get('/reports/:reportId/analysis', aiController.getAnalysis.bind(aiController));
router.post('/reports/:reportId/analyze/background', aiController.startBackgroundAnalysis.bind(aiController));

// Cluster details
router.get('/reports/:reportId/clusters/:clusterId', aiController.getClusterDetails.bind(aiController));

// Cache management
router.delete('/cache', aiController.clearCache.bind(aiController));

// Statistics
router.get('/stats', aiController.getAnalysisStats.bind(aiController));

export default router;
