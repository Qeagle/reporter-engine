import express from 'express';
import AnnotationController from '../controllers/AnnotationController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Annotation CRUD routes
router.post('/projects/:projectId/annotations', AnnotationController.createAnnotation);
router.get('/projects/:projectId/annotations', AnnotationController.getAnnotations);
router.get('/annotations/:annotationId', AnnotationController.getAnnotation);

// Assignment and status management
router.put('/annotations/:annotationId/assignment', AnnotationController.updateAssignment);
router.put('/annotations/:annotationId/status', AnnotationController.updateStatus);
router.put('/annotations/:annotationId/edit', AnnotationController.updateAnnotation);

// Comments
router.post('/annotations/:annotationId/comments', AnnotationController.addComment);

// Project members for assignment dropdown
router.get('/projects/:projectId/members', AnnotationController.getProjectMembers);

// Test runs and test cases for annotation form
router.get('/projects/:projectId/test-runs', AnnotationController.getProjectTestRuns);
router.get('/test-runs/:testRunId/test-cases', AnnotationController.getTestRunCases);

// Notifications
router.get('/notifications', AnnotationController.getNotifications);
router.put('/notifications/:notificationId/read', AnnotationController.markNotificationRead);
router.put('/notifications/read-all', AnnotationController.markAllNotificationsRead);

// Statistics
router.get('/projects/:projectId/annotations/stats', AnnotationController.getStats);

// Watchers
router.put('/annotations/:annotationId/watch', AnnotationController.toggleWatcher);

export default router;
