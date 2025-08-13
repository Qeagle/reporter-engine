import FailureAnalysisService from '../services/FailureAnalysisService.js';

const failureAnalysisService = new FailureAnalysisService();

class FailureAnalysisController {
  /**
   * Get failure analysis summary
   */
  async getSummary(req, res) {
    try {
      const { projectId } = req.params;
      const filters = {
        timeWindow: req.query.timeWindow || '30',
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        testSearch: req.query.testSearch,
        selectedRuns: req.query.runs ? (Array.isArray(req.query.runs) ? req.query.runs : [req.query.runs]) : []
      };

      const summary = failureAnalysisService.getSummary(parseInt(projectId), filters);
      
      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Error getting failure analysis summary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get failure analysis summary'
      });
    }
  }

  /**
   * Get test case failures
   */
  async getTestCaseFailures(req, res) {
    try {
      const { projectId } = req.params;
      const filters = {
        timeWindow: req.query.timeWindow || '30',
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        testSearch: req.query.testSearch,
        selectedRuns: req.query.runs ? (Array.isArray(req.query.runs) ? req.query.runs : [req.query.runs]) : []
      };

      const failures = failureAnalysisService.getTestCaseFailures(parseInt(projectId), filters);
      
      res.json({
        success: true,
        data: failures
      });
    } catch (error) {
      console.error('Error getting test case failures:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get test case failures'
      });
    }
  }

  /**
   * Get suite/run failures
   */
  async getSuiteRunFailures(req, res) {
    try {
      const { projectId } = req.params;
      const filters = {
        timeWindow: req.query.timeWindow || '30',
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        testSearch: req.query.testSearch,
        selectedRuns: req.query.runs ? (Array.isArray(req.query.runs) ? req.query.runs : [req.query.runs]) : []
      };

      const failures = failureAnalysisService.getSuiteRunFailures(parseInt(projectId), filters);
      
      res.json({
        success: true,
        data: failures
      });
    } catch (error) {
      console.error('Error getting suite run failures:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get suite run failures'
      });
    }
  }

  /**
   * Get failure groups
   */
  async getFailureGroups(req, res) {
    try {
      const { projectId } = req.params;
      const filters = {
        timeWindow: req.query.timeWindow || '30',
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        testSearch: req.query.testSearch,
        selectedRuns: req.query.runs ? (Array.isArray(req.query.runs) ? req.query.runs : [req.query.runs]) : []
      };

      const groups = failureAnalysisService.getFailureGroups(parseInt(projectId), filters);
      
      res.json({
        success: true,
        data: groups
      });
    } catch (error) {
      console.error('Error getting failure groups:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get failure groups'
      });
    }
  }

  /**
   * Auto-classify failures
   */
  async autoClassify(req, res) {
    try {
      const { projectId } = req.params;
      const filters = {
        timeWindow: req.query.timeWindow || '30',
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        testSearch: req.query.testSearch,
        selectedRuns: req.query.runs ? (Array.isArray(req.query.runs) ? req.query.runs : [req.query.runs]) : []
      };

      const result = failureAnalysisService.autoClassify(parseInt(projectId), filters);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error auto-classifying failures:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to auto-classify failures'
      });
    }
  }

  /**
   * Reclassify a test case failure
   */
  async reclassifyFailure(req, res) {
    try {
      const { testCaseId } = req.params;
      const { primaryClass, subClass } = req.body;

      const result = failureAnalysisService.reclassifyFailure(
        parseInt(testCaseId), 
        primaryClass, 
        subClass
      );
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error reclassifying failure:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reclassify failure'
      });
    }
  }

  /**
   * Get evidence for a test case
   */
  async getEvidence(req, res) {
    try {
      const { testCaseId } = req.params;

      const evidence = failureAnalysisService.getEvidence(parseInt(testCaseId));
      
      res.json({
        success: true,
        data: evidence
      });
    } catch (error) {
      console.error('Error getting evidence:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get evidence'
      });
    }
  }

  /**
   * Get suggested fixes for a test case
   */
  async getSuggestedFixes(req, res) {
    try {
      const { testCaseId } = req.params;

      const suggestions = failureAnalysisService.getSuggestedFixes(parseInt(testCaseId));
      
      res.json({
        success: true,
        data: suggestions
      });
    } catch (error) {
      console.error('Error getting suggested fixes:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get suggested fixes'
      });
    }
  }
}

export default FailureAnalysisController;
