import express from 'express';
import ReportController from '../controllers/ReportController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import { filterByProjectAccess } from '../middleware/rbacMiddleware.js';

const router = express.Router();
const reportController = new ReportController();

// Report CRUD operations
router.get('/', authMiddleware, filterByProjectAccess(), reportController.getReports.bind(reportController));
router.get('/:reportId/metrics', authMiddleware, reportController.getReportMetrics.bind(reportController));
router.get('/:reportId', authMiddleware, reportController.getReportById.bind(reportController));
router.delete('/:reportId', authMiddleware, reportController.deleteReport.bind(reportController));

// Export functionality (with auth)
router.get('/:reportId/export/pdf', authMiddleware, reportController.exportToPDF.bind(reportController));
router.get('/:reportId/export/json', authMiddleware, reportController.exportToJSON.bind(reportController));

// Report comparison
router.post('/compare', authMiddleware, reportController.compareReports.bind(reportController));

// Search and filtering
router.post('/search', authMiddleware, filterByProjectAccess(), reportController.searchReports.bind(reportController));

export default router;