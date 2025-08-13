import express from 'express';
import ProjectController from '../controllers/ProjectController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import { 
  requireProjectPermission, 
  filterByProjectAccess, 
  addUserPermissions 
} from '../middleware/rbacMiddleware.js';

const router = express.Router();
const projectController = new ProjectController();

// Get all projects (filtered by user access)
router.get('/', authMiddleware, filterByProjectAccess(), projectController.getAllProjects.bind(projectController));

// Get project by ID
router.get('/:projectId', authMiddleware, projectController.getProjectById.bind(projectController));

// Create new project
router.post('/', authMiddleware, addUserPermissions(), projectController.createProject.bind(projectController));

// Update project
router.put('/:projectId', authMiddleware, projectController.updateProject.bind(projectController));

// Delete project
router.delete('/:projectId', authMiddleware, projectController.deleteProject.bind(projectController));

// Get project statistics
router.get('/:projectId/stats', authMiddleware, projectController.getProjectStats.bind(projectController));

// Project member management
router.get('/:projectId/members', authMiddleware, projectController.getProjectMembers.bind(projectController));
router.post('/:projectId/members', authMiddleware, projectController.addProjectMember.bind(projectController));

export default router;
