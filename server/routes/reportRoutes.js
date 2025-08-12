import express from 'express';
import ReportController from '../controllers/ReportController.js';

const router = express.Router();
const reportController = new ReportController();

// Report CRUD operations
router.get('/', reportController.getReports.bind(reportController));
router.get('/:reportId', reportController.getReportById.bind(reportController));

// Report analytics and metrics
router.get('/:reportId/metrics', reportController.getReportMetrics.bind(reportController));
router.get('/:reportId/timeline', reportController.getReportTimeline.bind(reportController));

// Export functionality
router.get('/:reportId/export/pdf', reportController.exportToPDF.bind(reportController));
router.get('/:reportId/export/json', reportController.exportToJSON.bind(reportController));

// Collaboration features
router.post('/:reportId/annotations', reportController.addAnnotation.bind(reportController));

// Report comparison
router.post('/compare', reportController.compareReports.bind(reportController));

// Search and filtering
router.post('/search', reportController.searchReports.bind(reportController));

export default router;