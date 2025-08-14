import moment from 'moment';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import DatabaseService from '../services/DatabaseService.js';
import PDFService from '../services/PDFService.js';
import AnalyticsService from '../services/AnalyticsService.js';
import HtmlExportService from '../services/HtmlExportService.js';

class ReportController {
  constructor() {
    this.db = new DatabaseService();
    this.pdfService = new PDFService();
    this.analyticsService = new AnalyticsService();
    this.htmlExportService = new HtmlExportService();
  }

  async getReports(req, res) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        status, 
        environment, 
        framework,
        startDate,
        endDate,
        projectId
      } = req.query;

      // Build base query
      let baseQuery = `
        FROM test_runs tr 
        JOIN projects p ON tr.project_id = p.id 
        WHERE 1=1
      `;
      const params = [];

      // Filter by project if specified
      if (projectId) {
        const project = this.db.findProjectById(projectId) || this.db.findProjectByKey(projectId);
        
        if (!project) {
          return res.status(404).json({
            success: false,
            error: 'Project not found'
          });
        }

        // Check project access for non-admin users
        if (req.user.role !== 'admin') {
          const hasAccess = this.db.userHasProjectPermission(req.user.userId, project.id, 'test.read');
          if (!hasAccess) {
            return res.status(403).json({
              success: false,
              error: 'Access denied to this project'
            });
          }
        }

        baseQuery += ` AND tr.project_id = ?`;
        params.push(project.id);
      } else {
        // For non-admin users, filter by accessible projects
        if (req.user.role !== 'admin') {
          const userProjects = this.db.getUserProjects(req.user.userId);
          if (userProjects.length === 0) {
            return res.json({
              success: true,
              data: [],
              pagination: { page: 1, limit, total: 0, pages: 0 }
            });
          }
          
          const projectIds = userProjects.map(p => p.id);
          baseQuery += ` AND tr.project_id IN (${projectIds.map(() => '?').join(',')})`;
          params.push(...projectIds);
        }
      }

      // Apply other filters
      if (status) {
        baseQuery += ` AND tr.status = ?`;
        params.push(status);
      }

      if (environment) {
        baseQuery += ` AND tr.environment = ?`;
        params.push(environment);
      }

      if (framework) {
        baseQuery += ` AND tr.framework = ?`;
        params.push(framework);
      }

      if (startDate) {
        baseQuery += ` AND tr.started_at >= ?`;
        params.push(startDate);
      }

      if (endDate) {
        baseQuery += ` AND tr.end_time <= ?`;
        params.push(endDate);
      }

      // Get total count
      const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
      const totalResult = this.db.db.prepare(countQuery).get(...params);
      const total = totalResult.total;

      // Calculate pagination
      const offset = (page - 1) * limit;
      const pages = Math.ceil(total / limit);

      // Get paginated results
      const query = `
        SELECT 
          tr.*,
          p.name as project_name,
          p.key as project_key
        ${baseQuery}
        ORDER BY tr.started_at DESC
        LIMIT ? OFFSET ?
      `;
      
      const testRuns = this.db.db.prepare(query).all(...params, limit, offset);

      // Parse JSON fields and transform field names for UI compatibility
      const parsedTestRuns = testRuns.map(testRun => {
        // Get test cases for each report to enable author filtering
        const testCases = this.db.getTestCasesByRun(testRun.id);
        
        return {
          id: testRun.id,
          projectId: testRun.project_id,
          runKey: testRun.run_key,
          testSuite: testRun.test_suite,
          environment: testRun.environment,
          framework: testRun.framework,
          status: testRun.status,
          branch: testRun.branch,
          commitSha: testRun.commit_sha,
          ciUrl: testRun.ci_url,
          startTime: testRun.started_at,
          endTime: testRun.finished_at,
          triggeredBy: testRun.triggered_by,
          tags: JSON.parse(testRun.tags || '[]'), // Raw query, need to parse
          metadata: JSON.parse(testRun.metadata || '{}'), // Raw query, need to parse
          summary: JSON.parse(testRun.summary || '{}'), // Raw query, need to parse
          project_name: testRun.project_name,
          project_key: testRun.project_key,
          tests: testCases // Add test cases for author filtering
        };
      });

      res.json({
        success: true,
        data: parsedTestRuns,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages
        }
      });

    } catch (error) {
      console.error('Error fetching reports:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch reports',
        details: error.message
      });
    }
  }

  async getReportById(req, res) {
    try {
      const { reportId } = req.params;

      // Handle run_key format
      let testRun = this.db.findTestRunById(reportId);
      if (!testRun) {
        // Try to find by run_key
        const runByKey = this.db.findTestRunByKey(reportId);
        if (runByKey) {
          testRun = this.db.findTestRunById(runByKey.id);
        }
      }

      if (!testRun) {
        return res.status(404).json({
          success: false,
          error: 'Report not found'
        });
      }

      // Check access permissions for non-admin users
      if (req.user.role !== 'admin') {
        const hasAccess = this.db.userHasProjectPermission(req.user.userId, testRun.project_id, 'test.read');
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            error: 'Access denied to this report'
          });
        }
      }

      // Get project info
      const project = this.db.findProjectById(testRun.project_id);
      
      // Get test cases with steps and artifacts
      const testCases = this.db.getTestCasesByRun(testRun.id);
      const enrichedTestCases = testCases.map(testCase => {
        const steps = this.db.getTestStepsByCase(testCase.id);
        const artifacts = this.db.getTestArtifactsByCase(testCase.id);
        
        return {
          ...testCase,
          steps,
          artifacts
        };
      });

      // Transform test run data for UI compatibility
      // Note: findTestRunById already parses JSON fields, so no need to parse again
      const transformedTestRun = {
        id: testRun.id,
        projectId: testRun.project_id,
        runKey: testRun.run_key,
        testSuite: testRun.test_suite,
        environment: testRun.environment,
        framework: testRun.framework,
        status: testRun.status,
        branch: testRun.branch,
        commitSha: testRun.commit_sha,
        ciUrl: testRun.ci_url,
        startTime: testRun.started_at,
        endTime: testRun.finished_at,
        triggeredBy: testRun.triggered_by,
        tags: testRun.tags, // Already parsed by DatabaseService
        metadata: testRun.metadata, // Already parsed by DatabaseService
        summary: testRun.summary // Already parsed by DatabaseService
      };

      const result = {
        ...transformedTestRun,
        project: project,
        testCases: enrichedTestCases,
        tests: enrichedTestCases, // Alias for compatibility
        stats: testRun.summary // Already parsed object
      };

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Error fetching report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch report',
        details: error.message
      });
    }
  }  async getReportMetrics(req, res) {
    try {
      const { reportId } = req.params;
      
      // Try to find by ID first, then by run_key for backward compatibility
      let testRun = this.db.findTestRunById(reportId);
      
      if (!testRun) {
        const runByKey = this.db.db.prepare('SELECT * FROM test_runs WHERE run_key = ?').get(reportId);
        if (runByKey) {
          testRun = this.db.findTestRunById(runByKey.id);
        }
      }

      if (!testRun) {
        return res.status(404).json({
          success: false,
          error: 'Report not found'
        });
      }

      // Check access permissions for non-admin users
      if (req.user.role !== 'admin') {
        const hasAccess = this.db.userHasProjectPermission(req.user.userId, testRun.project_id, 'test.read');
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            error: 'Access denied to this report'
          });
        }
      }

      // Get test cases for metrics calculation
      const testCases = this.db.getTestCasesByRun(testRun.id);
      
      // Parse existing summary if available
      let existingSummary = {};
      if (testRun.summary) {
        // summary is already parsed by DatabaseService.findTestRunById
        existingSummary = typeof testRun.summary === 'object' ? testRun.summary : {};
      }
      
      // Calculate summary metrics
      const total = testCases.length || existingSummary.total || 0;
      const passed = testCases.filter(tc => tc.status === 'passed').length || existingSummary.passed || 0;
      const failed = testCases.filter(tc => tc.status === 'failed').length || existingSummary.failed || 0;
      const skipped = testCases.filter(tc => tc.status === 'skipped').length || existingSummary.skipped || 0;
      const passRate = total > 0 ? Math.round((passed / total) * 100) : (existingSummary.passRate || 0);
      
      // Calculate durations (convert to milliseconds if needed)
      const testDurations = testCases
        .filter(tc => tc.duration && tc.duration > 0)
        .map(tc => ({
          name: tc.title || tc.test_name || 'Unknown Test',
          duration: tc.duration
        }))
        .sort((a, b) => b.duration - a.duration);

      // Calculate failure reasons
      const failureReasons = [];
      const failedTests = testCases.filter(tc => tc.status === 'failed');
      if (failedTests.length > 0) {
        const reasonCounts = {};
        
        failedTests.forEach(tc => {
          const error = tc.error_message || tc.error || 'Unknown Error';
          // Extract first line of error message as reason
          const reason = error.split('\n')[0].trim();
          reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
        });

        Object.entries(reasonCounts).forEach(([reason, count]) => {
          failureReasons.push({
            reason,
            count,
            percentage: Math.round((count / failedTests.length) * 100)
          });
        });

        // Sort by count descending
        failureReasons.sort((a, b) => b.count - a.count);
      }

      // Environment info
      const environmentInfo = {
        name: testRun.environment || 'Unknown',
        framework: testRun.framework || 'Unknown',
        metadata: {}
      };

      // metadata is already parsed by DatabaseService.findTestRunById
      if (testRun.metadata && typeof testRun.metadata === 'object') {
        environmentInfo.metadata = testRun.metadata;
      }

      // Browser stats (if available in metadata)
      let browserStats = null;
      if (environmentInfo.metadata.browser) {
        const browser = environmentInfo.metadata.browser;
        browserStats = {
          [browser.toLowerCase()]: {
            total,
            passed,
            failed,
            passRate
          }
        };
      }

      // Calculate duration from summary or timestamps
      let duration = existingSummary.duration || 0;
      if (!duration && testRun.started_at && testRun.finished_at) {
        duration = new Date(testRun.finished_at).getTime() - new Date(testRun.started_at).getTime();
      }

      const metrics = {
        summary: {
          total,
          passed,
          failed,
          skipped,
          passRate,
          duration
        },
        testDurations,
        failureReasons,
        environmentInfo,
        browserStats
      };

      res.json({
        success: true,
        data: metrics
      });

    } catch (error) {
      console.error('Error fetching report metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch report metrics',
        details: error.message
      });
    }
  }

  async deleteReport(req, res) {
    try {
      const { reportId } = req.params;
      
      // Try to find by ID first, then by run_key for backward compatibility
      let testRun = this.db.findTestRunById(reportId);
      
      if (!testRun) {
        const runByKey = this.db.db.prepare('SELECT * FROM test_runs WHERE run_key = ?').get(reportId);
        if (runByKey) {
          testRun = this.db.findTestRunById(runByKey.id);
        }
      }

      if (!testRun) {
        return res.status(404).json({
          success: false,
          error: 'Report not found'
        });
      }

      // Check delete permissions
      if (req.user.role !== 'admin') {
        const hasPermission = this.db.userHasProjectPermission(req.user.userId, testRun.project_id, 'test.delete');
        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            error: 'Access denied: insufficient permissions to delete this report'
          });
        }
      }

      // Delete the test run (cascade will handle related records)
      this.db.db.prepare('DELETE FROM test_runs WHERE id = ?').run(testRun.id);

      res.json({
        success: true,
        message: 'Report deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete report',
        details: error.message
      });
    }
  }

  async exportToPDF(req, res) {
    try {
      const { reportId } = req.params;
      const userId = req.user?.id;

      const testRun = this.db.findTestRunById(reportId);
      if (!testRun) {
        return res.status(404).json({
          success: false,
          error: 'Report not found'
        });
      }

      // Check permissions
      if (req.user.role !== 'admin') {
        const hasAccess = this.db.userHasProjectPermission(req.user.userId, testRun.project_id, 'test.read');
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            error: 'Access denied to this report'
          });
        }
      }

      // Construct report data similar to JSON export
      const testCases = this.db.getTestCasesByRun(reportId);
      const enrichedTestCases = testCases.map(testCase => {
        const steps = this.db.getTestStepsByCase(testCase.id);
        const artifacts = this.db.getTestArtifactsByCase(testCase.id);
        
        return {
          ...testCase,
          steps,
          artifacts,
          metadata: typeof testCase.metadata === 'string' ? JSON.parse(testCase.metadata || '{}') : (testCase.metadata || {})
        };
      });

      const reportData = {
        ...testRun,
        tests: enrichedTestCases,
        summary: typeof testRun.summary === 'string' ? JSON.parse(testRun.summary || '{}') : (testRun.summary || {})
      };

      // Generate PDF using the PDF service
      const buffer = await this.pdfService.generateReportPDF(reportData);

      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="test-report-${testRun.id}.pdf"`);
      res.setHeader('Content-Length', buffer.length);

      // Send the PDF buffer
      res.send(buffer);
    } catch (error) {
      console.error('❌ Error in exportToPDF:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export PDF',
        details: error.message
      });
    }
  }

  async exportToJSON(req, res) {
    try {
      const { reportId } = req.params;
      const userId = req.user?.id;

      const testRun = this.db.findTestRunById(reportId);
      if (!testRun) {
        return res.status(404).json({
          success: false,
          error: 'Report not found'
        });
      }

      // Check permissions
      if (req.user.role !== 'admin') {
        const hasAccess = this.db.userHasProjectPermission(req.user.userId, testRun.project_id, 'test.read');
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            error: 'Access denied to this report'
          });
        }
      }

      const testCases = this.db.getTestCasesByRun(reportId);
      const reportData = {
        ...testRun,
        tests: testCases.map(tc => ({
          ...tc,
          steps: JSON.parse(tc.steps || '[]'),
          artifacts: JSON.parse(tc.artifacts || '[]'),
          metadata: JSON.parse(tc.metadata || '{}')
        })),
        summary: JSON.parse(testRun.summary || '{}')
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="report-${reportId}.json"`);
      res.json(reportData);
    } catch (error) {
      console.error('❌ Error in exportToJSON:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export JSON',
        details: error.message
      });
    }
  }

  async exportToHTML(req, res) {
    try {
      const { reportId } = req.params;
      const { includeArtifacts = true } = req.query; // Default to including artifacts
      const userId = req.user?.id;

      // Find test run by ID or run_key
      let testRun = this.db.findTestRunById(reportId);
      if (!testRun) {
        const runByKey = this.db.db.prepare('SELECT * FROM test_runs WHERE run_key = ?').get(reportId);
        if (runByKey) {
          testRun = this.db.findTestRunById(runByKey.id);
        }
      }

      if (!testRun) {
        return res.status(404).json({
          success: false,
          error: 'Report not found'
        });
      }

      // Check permissions
      if (req.user.role !== 'admin') {
        const hasAccess = this.db.userHasProjectPermission(req.user.userId, testRun.project_id, 'test.read');
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            error: 'Access denied to this report'
          });
        }
      }

      // Export to ZIP with option to include/exclude artifacts
      const exportResult = await this.htmlExportService.exportReportAsZip(testRun.id, { 
        includeArtifacts: includeArtifacts === 'true' 
      });

      console.log('Export result:', {
        exportId: exportResult.exportId,
        zipPath: exportResult.zipPath,
        zipFilename: exportResult.zipFilename
      });

      const exportType = includeArtifacts === 'true' ? 'full' : 'lite';
      const message = includeArtifacts === 'true' 
        ? 'Full report export with artifacts completed successfully'
        : 'Lite report export (HTML only) completed successfully';

      res.json({
        success: true,
        data: {
          exportId: exportResult.exportId,
          downloadUrl: `/api/reports/${reportId}/export/html/${exportResult.exportId}/download`,
          size: exportResult.size,
          type: exportType,
          message: message
        }
      });

    } catch (error) {
      console.error('❌ Error in exportToHTML:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export HTML report',
        details: error.message
      });
    }
  }

  /**
   * Get export size estimates for both lite and full options
   */
  async getExportSizeEstimates(req, res) {
    try {
      const { reportId } = req.params;

      // Find test run by ID or run_key
      let testRun = this.db.findTestRunById(reportId);
      if (!testRun) {
        const runByKey = this.db.db.prepare('SELECT * FROM test_runs WHERE run_key = ?').get(reportId);
        if (runByKey) {
          testRun = this.db.findTestRunById(runByKey.id);
        }
      }

      if (!testRun) {
        return res.status(404).json({
          success: false,
          error: 'Report not found'
        });
      }

      // Check permissions
      if (req.user.role !== 'admin') {
        const hasAccess = this.db.userHasProjectPermission(req.user.userId, testRun.project_id, 'test.read');
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            error: 'Access denied to this report'
          });
        }
      }

      const estimates = await this.htmlExportService.getExportSizeEstimates(testRun.id);

      res.json({
        success: true,
        data: estimates
      });

    } catch (error) {
      console.error('❌ Error getting export size estimates:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get export size estimates',
        details: error.message
      });
    }
  }

  async downloadZipExport(req, res) {
    // This method is now redundant since downloadHTMLExport handles ZIP files
    // Redirect to the main download handler
    return this.downloadHTMLExport(req, res);
  }

  async downloadHTMLExport(req, res) {
    try {
      const { reportId, exportId } = req.params;
      const userId = req.user?.id;

      // Verify report access
      let testRun = this.db.findTestRunById(reportId);
      if (!testRun) {
        const runByKey = this.db.db.prepare('SELECT * FROM test_runs WHERE run_key = ?').get(reportId);
        if (runByKey) {
          testRun = this.db.findTestRunById(runByKey.id);
        }
      }

      if (!testRun) {
        return res.status(404).json({
          success: false,
          error: 'Report not found'
        });
      }

      // Check permissions
      if (req.user.role !== 'admin') {
        const hasAccess = this.db.userHasProjectPermission(req.user.userId, testRun.project_id, 'test.read');
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            error: 'Access denied to this report'
          });
        }
      }

      // Get ZIP path (updated to serve ZIP instead of HTML)
      const zipPath = path.join(this.htmlExportService.exportsDir, `${exportId}.zip`);

      console.log('Download request:', {
        reportId,
        exportId,
        zipPath,
        exists: fs.existsSync(zipPath)
      });

      if (!fs.existsSync(zipPath)) {
        console.error(`ZIP file not found: ${zipPath}`);
        return res.status(404).json({
          success: false,
          error: 'Export not found or expired'
        });
      }

      // Validate ZIP file
      try {
        const stats = fs.statSync(zipPath);
        if (stats.size === 0) {
          return res.status(500).json({
            success: false,
            error: 'Export file is corrupted (empty file)'
          });
        }
        console.log(`Serving ZIP file: ${zipPath} (${stats.size} bytes)`);
      } catch (statError) {
        return res.status(500).json({
          success: false,
          error: 'Failed to read export file'
        });
      }

      // Set headers for ZIP download with proper MIME type
      const filename = `report-${testRun.test_suite || 'test-report'}-${exportId}.zip`;
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', fs.statSync(zipPath).size);

      // Stream the ZIP file with error handling
      const fileStream = fs.createReadStream(zipPath);
      
      fileStream.on('error', (streamError) => {
        console.error('Error streaming ZIP file:', streamError);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: 'Failed to stream export file'
          });
        }
      });
      
      fileStream.pipe(res);

    } catch (error) {
      console.error('❌ Error in downloadHTMLExport:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to download HTML export',
        details: error.message
      });
    }
  }

  async downloadZipExport(req, res) {
    // This method is now redundant since downloadHTMLExport handles ZIP files
    // Redirect to the main download handler
    return this.downloadHTMLExport(req, res);
  }

  async listHTMLExports(req, res) {
    try {
      const exports = this.htmlExportService.getAvailableExports();
      
      res.json({
        success: true,
        data: exports.map(exp => ({
          id: exp.id,
          createdAt: exp.createdAt,
          size: exp.size,
          downloadUrl: `/api/reports/exports/html/${exp.id}/download`
        }))
      });

    } catch (error) {
      console.error('❌ Error in listHTMLExports:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list HTML exports',
        details: error.message
      });
    }
  }

  async deleteHTMLExport(req, res) {
    try {
      const { exportId } = req.params;
      
      const deleted = this.htmlExportService.deleteExport(exportId);
      
      if (deleted) {
        res.json({
          success: true,
          message: 'HTML export deleted successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Export not found'
        });
      }

    } catch (error) {
      console.error('❌ Error in deleteHTMLExport:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete HTML export',
        details: error.message
      });
    }
  }

  async compareReports(req, res) {
    try {
      const { reportIds } = req.body;
      const userId = req.user?.id;

      if (!reportIds || reportIds.length < 2) {
        return res.status(400).json({
          success: false,
          error: 'At least 2 report IDs are required for comparison'
        });
      }

      const reports = reportIds.map(id => {
        const testRun = this.db.findTestRunById(id);
        if (!testRun) return null;
        
        // Check permissions
        if (req.user.role !== 'admin') {
          const hasAccess = this.db.userHasProjectPermission(req.user.userId, testRun.project_id, 'test.read');
          if (!hasAccess) {
            return null;
          }
        }
        
        return testRun;
      }).filter(Boolean);

      if (reports.length < 2) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions or reports not found'
        });
      }

      // Basic comparison logic
      const comparison = {
        reports: reports.map(r => ({
          id: r.id,
          test_suite: r.test_suite,
          summary: JSON.parse(r.summary || '{}'),
          start_time: r.started_at,
          end_time: r.end_time
        }))
      };

      res.json({
        success: true,
        comparison
      });
    } catch (error) {
      console.error('❌ Error in compareReports:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to compare reports',
        details: error.message
      });
    }
  }

  async searchReports(req, res) {
    try {
      const { query, project, status, framework } = req.body;
      const userId = req.user?.id;

      let filters = {};
      if (project) filters.project_id = project;
      if (status) filters.status = status;
      if (framework) filters.framework = framework;

      const reports = this.db.searchTestRuns(query, filters, userId);

      res.json({
        success: true,
        reports: reports || [],
        total: reports?.length || 0
      });
    } catch (error) {
      console.error('❌ Error in searchReports:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search reports',
        details: error.message
      });
    }
  }

  // Test case specific export methods
  async exportTestCaseToPDF(req, res) {
    try {
      const { reportId, testCaseId } = req.params;
      const userId = req.user?.id;

      // Find test run
      let testRun = this.db.findTestRunById(reportId);
      if (!testRun) {
        const runByKey = this.db.db.prepare('SELECT * FROM test_runs WHERE run_key = ?').get(reportId);
        if (runByKey) {
          testRun = this.db.findTestRunById(runByKey.id);
        }
      }

      if (!testRun) {
        return res.status(404).json({
          success: false,
          error: 'Report not found'
        });
      }

      // Find specific test case
      const testCases = this.db.getTestCasesByRun(reportId);
      const testCase = testCases.find(tc => tc.id === parseInt(testCaseId) || tc.name === testCaseId);

      if (!testCase) {
        return res.status(404).json({
          success: false,
          error: 'Test case not found'
        });
      }

      // Get test case details
      const steps = this.db.getTestStepsByCase(testCase.id);
      const artifacts = this.db.getTestArtifactsByCase(testCase.id);
      
      const enrichedTestCase = {
        ...testCase,
        steps,
        artifacts,
        metadata: typeof testCase.metadata === 'string' ? JSON.parse(testCase.metadata || '{}') : (testCase.metadata || {})
      };

      // Create a mini report for this test case
      const testCaseReport = {
        ...testRun,
        tests: [enrichedTestCase],
        summary: {
          total: 1,
          passed: testCase.status === 'passed' ? 1 : 0,
          failed: testCase.status === 'failed' ? 1 : 0,
          skipped: testCase.status === 'skipped' ? 1 : 0,
          passRate: testCase.status === 'passed' ? 100 : 0
        }
      };

      // Generate PDF
      const pdfBuffer = await this.pdfService.generateReportPDF(testCaseReport);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="testcase-${testCase.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`);
      res.send(pdfBuffer);

    } catch (error) {
      console.error('❌ Error in exportTestCaseToPDF:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export test case as PDF'
      });
    }
  }

  async exportTestCaseToHTML(req, res) {
    try {
      const { reportId, testCaseId } = req.params;
      const { includeArtifacts = true } = req.body;
      const userId = req.user?.id;

      // Find test run
      let testRun = this.db.findTestRunById(reportId);
      if (!testRun) {
        const runByKey = this.db.db.prepare('SELECT * FROM test_runs WHERE run_key = ?').get(reportId);
        if (runByKey) {
          testRun = this.db.findTestRunById(runByKey.id);
        }
      }

      if (!testRun) {
        return res.status(404).json({
          success: false,
          error: 'Report not found'
        });
      }

      // Find specific test case
      const testCases = this.db.getTestCasesByRun(reportId);
      const testCase = testCases.find(tc => tc.id === parseInt(testCaseId) || tc.name === testCaseId);

      if (!testCase) {
        return res.status(404).json({
          success: false,
          error: 'Test case not found'
        });
      }

      // Get test case details
      const steps = this.db.getTestStepsByCase(testCase.id);
      const artifacts = includeArtifacts ? this.db.getTestArtifactsByCase(testCase.id) : [];
      
      const enrichedTestCase = {
        ...testCase,
        steps,
        artifacts,
        metadata: typeof testCase.metadata === 'string' ? JSON.parse(testCase.metadata || '{}') : (testCase.metadata || {})
      };

      // Create a mini report for this test case
      const testCaseReport = {
        ...testRun,
        tests: [enrichedTestCase],
        summary: {
          total: 1,
          passed: testCase.status === 'passed' ? 1 : 0,
          failed: testCase.status === 'failed' ? 1 : 0,
          skipped: testCase.status === 'skipped' ? 1 : 0,
          passRate: testCase.status === 'passed' ? 100 : 0
        }
      };

      // Generate HTML export
      const exportResult = await this.htmlExportService.exportReportAsZip(
        testCaseReport,
        includeArtifacts,
        `testcase-${testCase.name.replace(/[^a-zA-Z0-9]/g, '_')}`
      );

      res.json({
        success: true,
        exportId: exportResult.exportId,
        exportPath: exportResult.exportPath,
        includeArtifacts,
        testCaseName: testCase.name
      });

    } catch (error) {
      console.error('❌ Error in exportTestCaseToHTML:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export test case as HTML'
      });
    }
  }

  async downloadTestCaseHTMLExport(req, res) {
    try {
      const { reportId, testCaseId, exportId } = req.params;

      // Find the export file
      const exportPath = path.join(process.cwd(), 'server', 'data', 'reports', `${exportId}.zip`);
      
      if (!fs.existsSync(exportPath)) {
        return res.status(404).json({
          success: false,
          error: 'Export file not found'
        });
      }

      // Send the file
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="testcase-${testCaseId.replace(/[^a-zA-Z0-9]/g, '_')}.zip"`);
      
      const fileStream = fs.createReadStream(exportPath);
      fileStream.pipe(res);

      // Clean up the file after sending (optional)
      fileStream.on('end', () => {
        setTimeout(() => {
          try {
            fs.unlinkSync(exportPath);
          } catch (error) {
            console.warn('Failed to clean up export file:', error);
          }
        }, 5000); // Clean up after 5 seconds
      });

    } catch (error) {
      console.error('❌ Error in downloadTestCaseHTMLExport:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to download test case HTML export'
      });
    }
  }
}

export default ReportController;
