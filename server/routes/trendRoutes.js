import express from 'express';
import TrendAnalysisService from '../services/TrendAnalysisService.js';
import authMiddleware from '../middleware/authMiddleware.js';
import { requirePermission, filterByProjectAccess } from '../middleware/rbacMiddleware.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authMiddleware);

/**
 * GET /api/trends/data
 * Get trend data for pass/fail analysis
 */
router.get('/data', authMiddleware, filterByProjectAccess(), async (req, res) => {
  try {
    const {
      projectId,
      timeRange = '30d',
      groupBy = 'day',
      testSuite,
      environment,
      branch
    } = req.query;

    // Convert projectId to number if provided
    const filters = {
      projectId: projectId ? parseInt(projectId) : null,
      timeRange,
      groupBy,
      testSuite,
      environment,
      branch
    };

    const trendData = await TrendAnalysisService.getTrendData(filters);
    
    res.json({
      success: true,
      data: trendData
    });
  } catch (error) {
    console.error('Error getting trend data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get trend data',
      error: error.message
    });
  }
});

/**
 * GET /api/trends/summary
 * Get trend summary statistics
 */
router.get('/summary', authMiddleware, filterByProjectAccess(), async (req, res) => {
  try {
    const {
      projectId,
      timeRange = '30d',
      testSuite,
      environment,
      branch
    } = req.query;

    const filters = {
      projectId: projectId ? parseInt(projectId) : null,
      timeRange,
      testSuite,
      environment,
      branch
    };

    const summary = await TrendAnalysisService.getTrendSummary(filters);
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error getting trend summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get trend summary',
      error: error.message
    });
  }
});

/**
 * GET /api/trends/test-suites
 * Get test suite performance trends
 */
router.get('/test-suites', authMiddleware, filterByProjectAccess(), async (req, res) => {
  try {
    const {
      projectId,
      timeRange = '30d',
      groupBy = 'day'
    } = req.query;

    const filters = {
      projectId: projectId ? parseInt(projectId) : null,
      timeRange,
      groupBy
    };

    const suiteTrends = await TrendAnalysisService.getTestSuiteTrends(filters);
    
    res.json({
      success: true,
      data: suiteTrends
    });
  } catch (error) {
    console.error('Error getting test suite trends:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get test suite trends',
      error: error.message
    });
  }
});

/**
 * GET /api/trends/environments
 * Get environment comparison trends
 */
router.get('/environments', authMiddleware, filterByProjectAccess(), async (req, res) => {
  try {
    const {
      projectId,
      timeRange = '30d',
      groupBy = 'day'
    } = req.query;

    const filters = {
      projectId: projectId ? parseInt(projectId) : null,
      timeRange,
      groupBy
    };

    const envTrends = await TrendAnalysisService.getEnvironmentTrends(filters);
    
    res.json({
      success: true,
      data: envTrends
    });
  } catch (error) {
    console.error('Error getting environment trends:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get environment trends',
      error: error.message
    });
  }
});

/**
 * GET /api/trends/flaky-tests
 * Get flaky test trends
 */
router.get('/flaky-tests', authMiddleware, filterByProjectAccess(), async (req, res) => {
  try {
    const {
      projectId,
      timeRange = '30d',
      groupBy = 'day'
    } = req.query;

    const filters = {
      projectId: projectId ? parseInt(projectId) : null,
      timeRange,
      groupBy
    };

    const flakyTrends = await TrendAnalysisService.getFlakyTestTrends(filters);
    
    res.json({
      success: true,
      data: flakyTrends
    });
  } catch (error) {
    console.error('Error getting flaky test trends:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get flaky test trends',
      error: error.message
    });
  }
});

/**
 * GET /api/trends/filters
 * Get available filter options (test suites, environments, branches)
 */
router.get('/filters', authMiddleware, filterByProjectAccess(), async (req, res) => {
  try {
    const { projectId } = req.query;
    
    const filterOptions = await TrendAnalysisService.getFilterOptions(
      projectId ? parseInt(projectId) : null
    );
    
    res.json({
      success: true,
      data: filterOptions
    });
  } catch (error) {
    console.error('Error getting filter options:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get filter options',
      error: error.message
    });
  }
});

export default router;
