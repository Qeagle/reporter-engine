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
      let projectId = project?.id || 1; // Use default project ID 1
      
      // Validate project exists
      const projectExists = this.dbService.findProjectById(projectId);
      if (!projectExists) {
        return res.status(400).json({
          success: false,
          error: `Project with ID ${projectId} not found`
        });
      }

      // Check if user has permission to create test runs in this project
      if (!this.dbService.userHasProjectPermission(userId, projectId, 'test.write')) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to create test runs in this project'
        });
      }

      // Create test run in database
      const testRun = this.dbService.createTestRun({
        project_id: projectId,
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
          project: { 
            id: projectId, 
            name: projectExists?.name || 'Unknown Project', 
            type: projectExists?.type || 'unknown' 
          }
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

  async reportTestResult(req, res) {
    try {
      const { 
        executionId,
        testName, 
        status, 
        duration, 
        error,
        stackTrace,
        screenshots,
        videos,
        traces,
        metadata 
      } = req.body;

      const userId = req.user?.id || 1;
      const testRun = this.dbService.findTestRunByKey(executionId);
      
      if (!testRun) {
        return res.status(404).json({
          success: false,
          error: 'Test execution not found'
        });
      }

      // Check permissions
      if (!this.dbService.userHasProjectPermission(userId, testRun.project_id, 'test.write')) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to report test results for this execution'
        });
      }

      // Create test case data
      const testData = {
        test_run_id: testRun.id,
        suite: 'default',
        name: testName,
        status,
        duration: duration || 0,
        start_time: moment().toISOString(),
        end_time: moment().toISOString(),
        error_message: error,
        stack_trace: stackTrace,
        annotations: [],
        metadata: {
          ...metadata,
          screenshots: screenshots || [],
          videos: videos || [],
          traces: traces || []
        }
      };

      // Create test case
      const testCase = this.dbService.createTestCase(testData);

      // Real-time update
      const webSocketService = req.app.locals.webSocketService;
      if (webSocketService) {
        webSocketService.emitToRoom(`report-${executionId}`, 'test-result-added', {
          executionId,
          test: testData
        });
      }

      res.json({
        success: true,
        data: {
          testId: testCase.id
        },
        message: 'Test result reported successfully'
      });
    } catch (error) {
      console.error('Error reporting test result:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to report test result'
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
      const testRun = this.dbService.findTestRunByKey(reportId);
      
      if (!testRun) {
        return res.status(404).json({
          success: false,
          error: 'Test execution not found'
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
          test_run_id: testRun.id,
          name: testResult.name,
          status: testResult.status,
          duration: testResult.duration || 0,
          start_time: testResult.startTime || moment().toISOString(),
          end_time: testResult.endTime || (testResult.status !== 'running' ? moment().toISOString() : null),
          error_message: testResult.errorMessage,
          stack_trace: testResult.errorStack,
          steps: JSON.stringify(testResult.steps || []),
          annotations: JSON.stringify(testResult.annotations || []),
          metadata: JSON.stringify(testResult.metadata || {})
        };
      } else {
        // Legacy structure
        testData = {
          test_run_id: testRun.id,
          name: testName,
          status,
          duration: duration || 0,
          start_time: moment().toISOString(),
          end_time: status !== 'running' ? moment().toISOString() : null,
          error_message: errorMessage,
          stack_trace: stackTrace,
          steps: JSON.stringify(steps || [])
        };
      }

      // Create or update test case
      let testCase = this.dbService.findTestCaseByName(testRun.id, testData.name);
      if (testCase) {
        this.dbService.updateTestCase(testCase.id, testData);
      } else {
        testCase = this.dbService.createTestCase(testData);
      }

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

      const testRun = this.dbService.findTestRunByKey(reportId);
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
        const testCases = this.dbService.getTestCasesByRun(testRun.id);
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
      this.dbService.updateTestRun(testRun.id, {
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

  async updateTestStatus(req, res) {
    try {
      const { 
        reportId, 
        testName, 
        status, 
        duration, 
        error,
        stackTrace 
      } = req.body;

      const userId = req.user?.id || 1;
      const testRun = this.dbService.findTestRunByKey(reportId);
      
      if (!testRun) {
        return res.status(404).json({
          success: false,
          error: 'Test execution not found'
        });
      }

      // Check permissions
      if (!this.dbService.userHasProjectPermission(userId, testRun.project_id, 'test.write')) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to update test status'
        });
      }

      // Find existing test case
      const testCase = this.dbService.findTestCaseByName(testRun.id, testName);
      
      if (!testCase) {
        return res.status(404).json({
          success: false,
          error: 'Test case not found'
        });
      }

      // Update only the status, duration, error, and end time
      const updateData = {
        status,
        duration: duration || testCase.duration,
        end_time: moment().toISOString(),
        error_message: error || testCase.error_message,
        stack_trace: stackTrace || testCase.stack_trace
      };

      this.dbService.updateTestCase(testCase.id, updateData);

      // Real-time update
      const webSocketService = req.app.locals.webSocketService;
      if (webSocketService) {
        webSocketService.emitToRoom(`report-${reportId}`, 'test-status-updated', {
          reportId,
          testName,
          status,
          duration
        });
      }

      res.json({
        success: true,
        message: 'Test status updated successfully'
      });
    } catch (error) {
      console.error('Error updating test status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update test status'
      });
    }
  }

  async uploadArtifact(req, res) {
    try {
      const { reportId, testName, type: artifactType } = req.body;
      const file = req.file;

      console.log(`📎 Artifact upload request:`, {
        reportId,
        testName,
        artifactType,
        filename: file?.originalname,
        size: file?.size,
        path: file?.path
      });

      if (!file) {
        console.log(`❌ No file uploaded`);
        return res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
      }

      // Find the test run by report ID
      const testRun = this.dbService.findTestRunByKey(reportId);
      if (!testRun) {
        console.log(`❌ Test run not found: ${reportId}`);
        return res.status(404).json({
          success: false,
          error: 'Test run not found'
        });
      }

      // Find the test case by name and test run ID
      const testCase = this.dbService.findTestCaseByName(testRun.id, testName);
      if (!testCase) {
        console.log(`❌ Test case not found: ${testName} in test run ${testRun.id}`);
        return res.status(404).json({
          success: false,
          error: 'Test case not found'
        });
      }

      // Create artifact record in database
      const artifactData = {
        test_case_id: testCase.id,
        artifact_id: uuidv4(),
        type: artifactType,
        filename: file.originalname,
        url: `/api/tests/artifacts/${file.filename}`,
        uploaded_at: new Date().toISOString()
      };

      const artifact = this.dbService.createTestArtifact(artifactData);
      
      console.log(`✅ Artifact uploaded and saved to database: ${file.originalname} -> ${artifactData.url}`);

      return res.status(200).json({
        success: true,
        artifactUrl: artifactData.url,
        artifactId: artifact.artifact_id,
        message: 'Artifact uploaded successfully'
      });

    } catch (error) {
      console.error('❌ Error uploading artifact:', error.stack || error.message || error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to upload artifact'
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
      const testRun = this.dbService.findTestRunByKey(reportId);
      
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

      const testCase = this.dbService.findTestCaseByName(testRun.id, testName);
      if (!testCase) {
        return res.status(404).json({
          success: false,
          error: 'Test case not found'
        });
      }

      // Get current step count to determine step order
      const existingSteps = this.dbService.getTestStepsByCase(testCase.id);
      const stepOrder = existingSteps.length + 1;

      const stepData = {
        test_case_id: testCase.id,
        step_order: stepOrder,
        name: stepName,
        status,
        duration: duration || 0,
        error: status === 'failed' ? (description || 'Step failed') : null,
        category: 'action'
      };

      const step = this.dbService.createTestStep(stepData);

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

      const testRun = this.dbService.findTestRunByKey(reportId);
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
          name: testData.name,
          status: testData.status,
          duration: testData.duration || 0,
          start_time: testData.startTime || moment().toISOString(),
          end_time: testData.endTime || moment().toISOString(),
          error_message: testData.errorMessage,
          stack_trace: testData.stackTrace,
          steps: JSON.stringify(testData.steps || []),
          metadata: JSON.stringify(testData.metadata || {})
        };

        const existingTestCase = this.dbService.getTestCaseByName(reportId, testData.name);
        if (existingTestCase) {
          this.dbService.updateTestCase(existingTestCase.id, testCaseData);
        } else {
          this.dbService.createTestCase(testCaseData);
        }
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
    const testRun = this.dbService.findTestRunByKey(reportId);
    const testCases = this.dbService.getTestCasesByRun(testRun?.id);
    
    return {
      ...testRun,
      tests: testCases?.map(tc => ({
        ...tc,
        steps: JSON.parse(tc.steps || '[]'),
        artifacts: JSON.parse(tc.artifacts || '[]'),
        metadata: JSON.parse(tc.metadata || '{}')
      })) || [],
      summary: JSON.parse(testRun?.summary || '{}')
    };
  }
}

export default TestController;