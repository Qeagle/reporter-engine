import express from 'express';
import projectController from '../controllers/ProjectController.js';

const router = express.Router();

// Get all projects
router.get('/', projectController.getAllProjects.bind(projectController));

// Get specific project
router.get('/:projectId', projectController.getProjectById.bind(projectController));

// Create new project
router.post('/', projectController.createProject.bind(projectController));

// Update project
router.put('/:projectId', projectController.updateProject.bind(projectController));

// Get project statistics
router.get('/:projectId/stats', projectController.getProjectStats.bind(projectController));

export default router;
