import DefectService from '../services/DefectService.js';

class DefectController {
  constructor() {
    this.defectService = new DefectService();
  }

  /**
   * Get defect summary for a project
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

      const summary = this.defectService.getSummary(parseInt(projectId), filters);

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Error getting defect summary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get defect summary'
      });
    }
  }

  /**
   * Get test case defects
   */
  async getTestCaseDefects(req, res) {
    try {
      const { projectId } = req.params;
      const filters = {
        timeWindow: req.query.timeWindow || '30',
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        testSearch: req.query.testSearch,
        selectedRuns: req.query.runs ? (Array.isArray(req.query.runs) ? req.query.runs : [req.query.runs]) : []
      };

      const testCases = this.defectService.getTestCaseDefects(parseInt(projectId), filters);

      res.json({
        success: true,
        data: testCases
      });
    } catch (error) {
      console.error('Error getting test case defects:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get test case defects'
      });
    }
  }

  /**
   * Get suite/run defects (grouped view)
   */
  async getSuiteRunDefects(req, res) {
    try {
      const { projectId } = req.params;
      // This would be implemented based on how you want to group by suites/runs
      
      res.json({
        success: true,
        data: [] // Placeholder
      });
    } catch (error) {
      console.error('Error getting suite/run defects:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get suite/run defects'
      });
    }
  }

  /**
   * Get defect groups (deduplicated view)
   */
  async getDefectGroups(req, res) {
    try {
      const { projectId } = req.params;
      const filters = {
        timeWindow: req.query.timeWindow || '30',
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        testSearch: req.query.testSearch,
        selectedRuns: req.query.runs ? (Array.isArray(req.query.runs) ? req.query.runs : [req.query.runs]) : []
      };

      // Get defect groups with member counts
      const query = `
        SELECT 
          dg.*,
          COUNT(dgm.test_case_id) as member_count
        FROM defect_groups dg
        LEFT JOIN defect_group_members dgm ON dg.id = dgm.group_id
        LEFT JOIN test_cases tc ON dgm.test_case_id = tc.id
        LEFT JOIN test_runs tr ON tc.test_run_id = tr.id
        WHERE tr.project_id = ?
        GROUP BY dg.id
        ORDER BY dg.last_seen DESC
      `;

      const groups = this.defectService.db.db.prepare(query).all(parseInt(projectId));

      res.json({
        success: true,
        data: groups.map(group => ({
          id: group.id,
          signatureHash: group.signature_hash,
          primaryClass: group.primary_class,
          subClass: group.sub_class,
          representativeError: group.representative_error,
          firstSeen: group.first_seen,
          lastSeen: group.last_seen,
          occurrenceCount: group.occurrence_count,
          memberCount: group.member_count
        }))
      });
    } catch (error) {
      console.error('Error getting defect groups:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get defect groups'
      });
    }
  }

  /**
   * Run auto-classification
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

      const results = this.defectService.autoClassify(parseInt(projectId), filters);

      res.json({
        success: true,
        data: {
          classified: results.length,
          results: results
        },
        message: `Successfully classified ${results.length} failures`
      });
    } catch (error) {
      console.error('Error in auto-classification:', error);
      res.status(500).json({
        success: false,
        error: 'Auto-classification failed'
      });
    }
  }

  /**
   * Run deep analysis (placeholder for future AI integration)
   */
  async deepAnalyze(req, res) {
    try {
      const { projectId } = req.params;
      
      // Placeholder - this would integrate with AI services for more sophisticated analysis
      res.json({
        success: true,
        message: 'Deep analysis completed (placeholder)'
      });
    } catch (error) {
      console.error('Error in deep analysis:', error);
      res.status(500).json({
        success: false,
        error: 'Deep analysis failed'
      });
    }
  }

  /**
   * Run deduplication
   */
  async deduplicate(req, res) {
    try {
      const { projectId } = req.params;
      const filters = {
        timeWindow: req.query.timeWindow || '30',
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        testSearch: req.query.testSearch,
        selectedRuns: req.query.runs ? (Array.isArray(req.query.runs) ? req.query.runs : [req.query.runs]) : []
      };

      const results = this.defectService.deduplicate(parseInt(projectId), filters);

      res.json({
        success: true,
        data: results,
        message: `Created ${results.length} defect groups`
      });
    } catch (error) {
      console.error('Error in deduplication:', error);
      res.status(500).json({
        success: false,
        error: 'Deduplication failed'
      });
    }
  }

  /**
   * Push defects to Jira (placeholder)
   */
  async pushToJira(req, res) {
    try {
      const { projectId } = req.params;
      
      // Placeholder - this would integrate with Jira API
      res.json({
        success: true,
        message: 'Pushed to Jira (placeholder)'
      });
    } catch (error) {
      console.error('Error pushing to Jira:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to push to Jira'
      });
    }
  }

  /**
   * Reclassify a defect manually
   */
  async reclassifyDefect(req, res) {
    try {
      const { defectId } = req.params;
      const { primaryClass, subClass } = req.body;
      const userId = req.user?.userId || req.user?.id;

      if (!primaryClass) {
        return res.status(400).json({
          success: false,
          error: 'Primary class is required'
        });
      }

      // Update classification
      const updateQuery = `
        UPDATE defect_classifications 
        SET primary_class = ?, sub_class = ?, is_manually_classified = 1, classified_by = ?
        WHERE id = ?
      `;

      this.defectService.db.db.prepare(updateQuery).run(
        primaryClass,
        subClass,
        userId,
        parseInt(defectId)
      );

      // Log the change
      const logQuery = `
        INSERT INTO defect_audit_log 
        (classification_id, action, new_primary_class, new_sub_class, changed_by)
        VALUES (?, 'reclassified', ?, ?, ?)
      `;

      this.defectService.db.db.prepare(logQuery).run(
        parseInt(defectId),
        primaryClass,
        subClass,
        userId
      );

      res.json({
        success: true,
        message: 'Defect reclassified successfully'
      });
    } catch (error) {
      console.error('Error reclassifying defect:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reclassify defect'
      });
    }
  }

  /**
   * Get evidence for a defect
   */
  async getEvidence(req, res) {
    try {
      const { defectId } = req.params;

      const query = `
        SELECT 
          dc.evidence_data,
          tc.error_message,
          tc.stack_trace,
          tc.name as test_name
        FROM defect_classifications dc
        JOIN test_cases tc ON dc.test_case_id = tc.id
        WHERE dc.id = ?
      `;

      const result = this.defectService.db.db.prepare(query).get(parseInt(defectId));

      if (!result) {
        return res.status(404).json({
          success: false,
          error: 'Defect not found'
        });
      }

      const evidence = result.evidence_data ? JSON.parse(result.evidence_data) : {};
      
      res.json({
        success: true,
        data: {
          testName: result.test_name,
          errorMessage: result.error_message,
          stackTrace: result.stack_trace,
          ...evidence
        }
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
   * Get suggested fixes for automation script errors
   */
  async getSuggestedFixes(req, res) {
    try {
      const { defectId } = req.params;

      const query = `
        SELECT primary_class, sub_class, evidence_data
        FROM defect_classifications
        WHERE id = ?
      `;

      const result = this.defectService.db.db.prepare(query).get(parseInt(defectId));

      if (!result) {
        return res.status(404).json({
          success: false,
          error: 'Defect not found'
        });
      }

      let suggestions = [];

      if (result.primary_class === 'Automation Script Error') {
        switch (result.sub_class) {
          case 'Wait_Timeout':
            suggestions = [
              'Increase explicit wait timeout',
              'Add proper wait conditions (visibility, clickability)',
              'Implement retry mechanism for flaky elements'
            ];
            break;
          case 'Locator_Break':
            suggestions = [
              'Use data-test-id attributes for stable selectors',
              'Add fallback locators in Page Object Model',
              'Update selectors to match current DOM structure'
            ];
            break;
          case 'Stale_Element':
            suggestions = [
              'Re-find element before interaction',
              'Use fresh locators instead of cached elements',
              'Add wait for element to be refreshed'
            ];
            break;
          default:
            suggestions = [
              'Review test script logic',
              'Check for missing assertions or validations',
              'Verify test data and preconditions'
            ];
        }
      }

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

export default DefectController;
