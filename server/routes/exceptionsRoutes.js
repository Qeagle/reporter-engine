import express from 'express';
import ExceptionsService from '../services/ExceptionsService.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

class ExceptionsController {
  constructor() {
    this.exceptionsService = new ExceptionsService();
  }

  /**
   * GET /api/exceptions/groups
   * Get all exception groups with filtering options
   */
  async getExceptionGroups(req, res) {
    try {
      const { 
        projectId, 
        timeRange = '30d',
        page = 1,
        limit = 20 
      } = req.query;

      const userId = req.user.role === 'admin' ? null : req.user.userId;
      
      const allGroups = this.exceptionsService.getExceptionGroups(projectId, timeRange, userId);
      
      // Apply pagination
      const offset = (page - 1) * limit;
      const paginatedGroups = allGroups.slice(offset, offset + parseInt(limit));
      
      // Remove full test details for list view (only include counts)
      const simplifiedGroups = paginatedGroups.map(group => ({
        signature: group.signature,
        errorType: group.errorType,
        representativeError: group.representativeError,
        firstSeen: group.firstSeen,
        lastSeen: group.lastSeen,
        occurrenceCount: group.occurrenceCount,
        affectedTestsCount: group.affectedTestsCount,
        projects: group.projects,
        environments: group.environments,
        frameworks: group.frameworks,
        testSuites: group.testSuites
      }));

      res.json({
        success: true,
        data: {
          groups: simplifiedGroups,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: allGroups.length,
            pages: Math.ceil(allGroups.length / limit)
          }
        }
      });

    } catch (error) {
      console.error('Error fetching exception groups:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch exception groups',
        details: error.message
      });
    }
  }

  /**
   * GET /api/exceptions/groups/:signature
   * Get detailed information about a specific exception group
   */
  async getExceptionGroupDetails(req, res) {
    try {
      const { signature } = req.params;
      const { projectId } = req.query;
      
      const userId = req.user.role === 'admin' ? null : req.user.userId;
      
      const groupDetails = this.exceptionsService.getExceptionGroupDetails(signature, projectId, userId);
      
      if (!groupDetails) {
        return res.status(404).json({
          success: false,
          error: 'Exception group not found'
        });
      }

      res.json({
        success: true,
        data: groupDetails
      });

    } catch (error) {
      console.error('Error fetching exception group details:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch exception group details',
        details: error.message
      });
    }
  }

  /**
   * GET /api/exceptions/stats
   * Get exception statistics for dashboard
   */
  async getExceptionStats(req, res) {
    try {
      const { projectId, timeRange = '30d' } = req.query;
      
      const userId = req.user.role === 'admin' ? null : req.user.userId;
      
      const stats = this.exceptionsService.getExceptionStats(projectId, timeRange, userId);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Error fetching exception stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch exception stats',
        details: error.message
      });
    }
  }
}

const exceptionsController = new ExceptionsController();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Exception routes
router.get('/groups', exceptionsController.getExceptionGroups.bind(exceptionsController));
router.get('/groups/:signature', exceptionsController.getExceptionGroupDetails.bind(exceptionsController));
router.get('/stats', exceptionsController.getExceptionStats.bind(exceptionsController));

export default router;
