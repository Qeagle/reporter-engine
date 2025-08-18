import express from 'express';
import DefectController from '../controllers/DefectController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();
const defectController = new DefectController();

// All defect routes require authentication
router.use(authMiddleware);

// Project-specific defect endpoints
router.get('/projects/:projectId/summary', defectController.getSummary.bind(defectController));
router.get('/projects/:projectId/test-cases', defectController.getTestCaseDefects.bind(defectController));
router.get('/projects/:projectId/suite-runs', defectController.getSuiteRunDefects.bind(defectController));
router.get('/projects/:projectId/groups', defectController.getDefectGroups.bind(defectController));

// Action endpoints
router.post('/projects/:projectId/auto-classify', defectController.autoClassify.bind(defectController));
router.post('/projects/:projectId/deep-analyze', defectController.deepAnalyze.bind(defectController));
router.post('/projects/:projectId/deduplicate', defectController.deduplicate.bind(defectController));
router.post('/projects/:projectId/push-to-jira', defectController.pushToJira.bind(defectController));

// Individual defect endpoints
router.post('/:defectId/reclassify', defectController.reclassifyDefect.bind(defectController));
router.get('/:defectId/evidence', defectController.getEvidence.bind(defectController));
router.get('/:defectId/suggested-fixes', defectController.getSuggestedFixes.bind(defectController));

export default router;
