import { Router } from 'express';
import FailureAnalysisController from '../controllers/FailureAnalysisController.js';

const router = Router();
const failureAnalysisController = new FailureAnalysisController();

// Project-level analysis routes
router.get('/projects/:projectId/summary', failureAnalysisController.getSummary);
router.get('/projects/:projectId/test-cases', failureAnalysisController.getTestCaseFailures);
router.get('/projects/:projectId/suite-runs', failureAnalysisController.getSuiteRunFailures);
router.get('/projects/:projectId/groups', failureAnalysisController.getFailureGroups);
router.post('/projects/:projectId/auto-classify', failureAnalysisController.autoClassify);

// Test case level routes
router.post('/test-cases/:testCaseId/reclassify', failureAnalysisController.reclassifyFailure);
router.get('/test-cases/:testCaseId/evidence', failureAnalysisController.getEvidence);
router.get('/test-cases/:testCaseId/suggested-fixes', failureAnalysisController.getSuggestedFixes);

export default router;
