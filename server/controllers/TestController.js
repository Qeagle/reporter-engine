import moment from 'moment';
import { v4 as uuidv4 } from 'uuid';
import DatabaseService from '../services/DatabaseService.js';
import AzureBlobService from '../services/AzureBlobService.js';

class TestController {
  constructor() {
    this.dbService = new DatabaseService();
    this.azureBlobService = new AzureBlobService();
  }

  async startTestExecution(req, res) {
    try {
      const { 
        projectId,
        testSuite, 
        environment, 
        framework, 
        tags, 
        project,
        metadata 
      } = req.body;

      const reportId = uuidv4();
      const userId = req.user?.id || 1; // Use authenticated user or fallback

      // Ensure project exists
      let finalProjectId = projectId || project?.id || 1; // Use projectId from request body
      
      // Validate project exists
      const projectExists = this.dbService.findProjectById(finalProjectId);
      if (!projectExists) {
        return res.status(400).json({
          success: false,
          error: `Project with ID ${finalProjectId} not found`
        });
      }

      // Check if user has permission to create test runs in this project
      if (!this.dbService.userHasProjectPermission(userId, finalProjectId, 'test.write')) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to create test runs in this project'
        });
      }

      // Create test run in database
      const testRun = this.dbService.createTestRun({
        project_id: finalProjectId,
        run_key: reportId,
        triggered_by: userId,
        test_suite: testSuite,
        environment,
        framework,
        tags: tags || [],
        metadata: metadata || {},
        status: 'running',
        started_at: moment().toISOString()
      });

      // Notify clients via WebSocket
      const webSocketService = req.app.locals.webSocketService;
      if (webSocketService) {
        webSocketService.broadcast('test-execution-started', {
          reportId,
          testSuite,
          environment,
          project: { id: finalProjectId, name: projectExists?.name || 'Unknown Project', type: projectExists?.type || 'unknown' }
        });
      }

      res.status(201).json({
        success: true,
        reportId,
        message: 'Test execution started successfully'
      });
    } catch (error) {
      console.error('Error starting test execution:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start test execution'
      });
    }
  }

  async updateTestExecution(req, res) {
    try {
      const { 
        reportId, 
        testResult,
        // Legacy fields for backward compatibility
        testName, 
        status, 
        duration, 
        errorMessage, 
        stackTrace,
        steps 
      } = req.body;

      const userId = req.user?.id || 1;
      const testRun = this.dbService.findTestRunById(reportId);
      
      if (!testRun) {
        return res.status(404).json({
          success: false,
          error: 'Test run not found'
        });
      }

      // Check permissions
      if (!this.dbService.userHasProjectPermission(userId, testRun.project_id, 'test.write')) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to update this test run'
        });
      }

      // Handle both new testResult structure and legacy individual fields
      let testData;
      if (testResult) {
        // New structure from Playwright reporter
        testData = {
          test_run_id: reportId,
          suite: testResult.suite || 'default',
          name: testResult.name,
          status: testResult.status,
          duration: testResult.duration || 0,
          start_time: testResult.startTime || moment().toISOString(),
          end_time: testResult.endTime || (testResult.status !== 'running' ? moment().toISOString() : null),
          error_message: testResult.errorMessage,
          stack_trace: testResult.errorStack,
          annotations: testResult.annotations || [],
          metadata: testResult.metadata || {}
        };
      } else {
        // Legacy structure
        testData = {
          test_run_id: reportId,
          suite: 'default',
          name: testName,
          status,
          duration: duration || 0,
          start_time: moment().toISOString(),
          end_time: status !== 'running' ? moment().toISOString() : null,
          error_message: errorMessage,
          stack_trace: stackTrace,
          annotations: [],
          metadata: {}
        };
      }

      // Create test case
      const testCase = this.dbService.createTestCase(testData);

      // Real-time update
      const webSocketService = req.app.locals.webSocketService;
      if (webSocketService) {
        webSocketService.emitToRoom(`report-${reportId}`, 'test-updated', {
          reportId,
          test: testData
        });
      }

      res.json({
        success: true,
        message: 'Test execution updated successfully'
      });
    } catch (error) {
      console.error('Error updating test execution:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update test execution'
      });
    }
  }

  async completeTestExecution(req, res) {
    try {
      const { reportId, endTime, summary } = req.body;
      const userId = req.user?.id || 1;

      const testRun = this.dbService.findTestRunById(reportId);
      if (!testRun) {
        return res.status(404).json({
          success: false,
          error: 'Test run not found'
        });
      }

      // Check permissions
      if (!this.dbService.userHasProjectPermission(userId, testRun.project_id, 'test.write')) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to complete this test run'
        });
      }

      // Calculate summary from test cases if not provided
      let calculatedSummary = summary;
      if (!calculatedSummary) {
        const testCases = this.dbService.getTestCasesByRun(reportId);
        calculatedSummary = {
          total: testCases.length,
          passed: testCases.filter(t => t.status === 'passed').length,
          failed: testCases.filter(t => t.status === 'failed').length,
          skipped: testCases.filter(t => t.status === 'skipped').length,
          duration: testCases.reduce((sum, test) => sum + (test.duration || 0), 0)
        };
        calculatedSummary.passRate = calculatedSummary.total > 0 ? 
          Math.round((calculatedSummary.passed / calculatedSummary.total) * 100) : 0;
      }

      // Update test run
      this.dbService.updateTestRun(reportId, {
        status: 'completed',
        finished_at: endTime || moment().toISOString(),
        summary: calculatedSummary
      });

      // Archive report to Azure Blob Storage if available
      try {
        const reportData = this.getReportData(reportId);
        await this.azureBlobService.archiveReport(reportId, reportData);
      } catch (archiveError) {
        console.warn('Failed to archive report to Azure Blob Storage:', archiveError.message);
      }

      // Notify completion
      const webSocketService = req.app.locals.webSocketService;
      if (webSocketService) {
        webSocketService.emitToRoom(`report-${reportId}`, 'test-execution-completed', {
          reportId,
          summary: calculatedSummary,
          duration: calculatedSummary.duration
        });
      }

      res.json({
        success: true,
        message: 'Test execution completed successfully',
        summary: calculatedSummary
      });
    } catch (error) {
      console.error('Error completing test execution:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to complete test execution'
      });
    }
  }

  async uploadArtifact(req, res) {
    try {
      const { reportId, testName, type: artifactType } = req.body;
      const file = req.file;
      const userId = req.user?.id || 1;

      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
      }

      const testRun = this.dbService.findTestRunById(reportId);
      if (!testRun) {
        return res.status(404).json({
          success: false,
          error: 'Test run not found'
        });
      }

      // Check permissions
      if (!this.dbService.userHasProjectPermission(userId, testRun.project_id, 'test.write')) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to upload artifacts to this test run'
        });
      }

      // Upload to Azure Blob Storage
      let blobUrl = null;
      try {
        blobUrl = await this.azureBlobService.uploadArtifact(
          reportId,
          file.filename,
          file.path,
          artifactType || 'attachment',
          testName
        );
      } catch (uploadError) {
        console.warn('Failed to upload to Azure Blob Storage:', uploadError.message);
        // Fallback to local file path
        blobUrl = `/api/test/artifacts/${file.filename}`;
      }

      // Create artifact record
      const testCases = this.dbService.getTestCasesByRun(reportId);
      const testCase = testCases.find(tc => tc.name === testName);
      
      if (testCase) {
        this.dbService.createTestArtifact({
          test_case_id: testCase.id,
          artifact_id: uuidv4(),
          type: artifactType || 'attachment',
          filename: file.originalname,
          url: blobUrl,
          uploaded_at: moment().toISOString()
        });
      } else {
        console.log(`⚠️ Test case not found for artifact: ${testName}`);
      }

      res.json({
        success: true,
        artifactUrl: blobUrl,
        message: 'Artifact uploaded successfully'
      });
    } catch (error) {
      console.error('Error uploading artifact:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload artifact'
      });
    }
  }

  async addTestStep(req, res) {
    try {
      const { 
        reportId, 
        testName, 
        stepName, 
        status, 
        duration, 
        screenshot,
        description 
      } = req.body;

      const userId = req.user?.id || 1;
      const testRun = this.dbService.findTestRunById(reportId);
      
      if (!testRun) {
        return res.status(404).json({
          success: false,
          error: 'Test run not found'
        });
      }

      // Check permissions
      if (!this.dbService.userHasProjectPermission(userId, testRun.project_id, 'test.write')) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to add steps to this test run'
        });
      }

      // Find the test case
      const testCases = this.dbService.getTestCasesByRun(reportId);
      const testCase = testCases.find(tc => tc.name === testName);
      
      if (!testCase) {
        return res.status(404).json({
          success: false,
          error: 'Test case not found'
        });
      }

      // Create test step
      const step = this.dbService.createTestStep({
        test_case_id: testCase.id,
        step_order: this.dbService.getTestStepsByCase(testCase.id).length + 1,
        name: stepName,
        status,
        duration: duration || 0,
        error: status === 'failed' ? description : null,
        category: 'action'
      });

      // Real-time update
      const webSocketService = req.app.locals.webSocketService;
      if (webSocketService) {
        webSocketService.emitToRoom(`report-${reportId}`, 'test-step-added', {
          reportId,
          testName,
          step
        });
      }

      res.json({
        success: true,
        step,
        message: 'Test step added successfully'
      });
    } catch (error) {
      console.error('Error adding test step:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add test step'
      });
    }
  }

  async batchTestResults(req, res) {
    try {
      const { reportId, tests } = req.body;
      const userId = req.user?.id || 1;

      const testRun = this.dbService.findTestRunById(reportId);
      if (!testRun) {
        return res.status(404).json({
          success: false,
          error: 'Test run not found'
        });
      }

      // Check permissions
      if (!this.dbService.userHasProjectPermission(userId, testRun.project_id, 'test.write')) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to update this test run'
        });
      }

      // Process batch of test results
      tests.forEach(testData => {
        const testCaseData = {
          test_run_id: reportId,
          suite: testData.suite || 'default',
          name: testData.name,
          status: testData.status,
          duration: testData.duration || 0,
          start_time: testData.startTime || moment().toISOString(),
          end_time: testData.endTime || moment().toISOString(),
          error_message: testData.errorMessage,
          stack_trace: testData.stackTrace,
          annotations: testData.annotations || [],
          metadata: testData.metadata || {}
        };

        this.dbService.createTestCase(testCaseData);
      });

      // Batch notification
      const webSocketService = req.app.locals.webSocketService;
      if (webSocketService) {
        webSocketService.emitToRoom(`report-${reportId}`, 'batch-tests-updated', {
          reportId,
          testsCount: tests.length
        });
      }

      res.json({
        success: true,
        message: `${tests.length} tests updated successfully`
      });
    } catch (error) {
      console.error('Error processing batch test results:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process batch test results'
      });
    }
  }

  // Helper method to get report data for archiving
  getReportData(reportId) {
    const testRun = this.dbService.findTestRunById(reportId);
    const testCases = this.dbService.getTestCasesByRun(reportId);
    
    return {
      ...testRun,
      tests: testCases.map(tc => ({
        ...tc,
        artifacts: this.dbService.getTestArtifactsByCase(tc.id),
        steps: this.dbService.getTestStepsByCase(tc.id)
      }))
    };
  }
}

export default TestController;
