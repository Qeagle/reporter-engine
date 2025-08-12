import moment from 'moment';
import { v4 as uuidv4 } from 'uuid';
import FileService from '../services/FileService.js';
import AzureBlobService from '../services/AzureBlobService.js';

class TestController {
  constructor() {
    this.fileService = new FileService();
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
      const executionData = {
        id: reportId,
        testSuite,
        environment,
        framework,
        tags: tags || [],
        metadata: metadata || {},
        // Add project information directly from request
        projectId: project?.id || 'default',
        projectName: project?.name || 'Default Project',
        projectType: project?.type || 'unknown',
        status: 'running',
        startTime: moment().toISOString(),
        tests: [],
        summary: {
          total: 0,
          passed: 0,
          failed: 0,
          skipped: 0,
          duration: 0
        }
      };

      // Save initial report
      await this.fileService.saveReport(reportId, executionData);
      
      // Notify clients via WebSocket
      const webSocketService = req.app.locals.webSocketService;
      webSocketService.broadcast('test-execution-started', {
        reportId,
        testSuite,
        environment,
        project: project || { id: 'default', name: 'Default Project', type: 'unknown' }
      });

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

      const report = await this.fileService.getReport(reportId);
      if (!report) {
        return res.status(404).json({
          success: false,
          error: 'Report not found'
        });
      }

      // Handle both new testResult structure and legacy individual fields
      let testData;
      if (testResult) {
        // New structure from Playwright reporter
        testData = {
          name: testResult.name,
          status: testResult.status,
          duration: testResult.duration || 0,
          startTime: testResult.startTime || moment().toISOString(),
          endTime: testResult.endTime || (testResult.status !== 'running' ? moment().toISOString() : null),
          errorMessage: testResult.errorMessage,
          stackTrace: testResult.errorStack,
          steps: testResult.steps || [],
          artifacts: [],
          annotations: testResult.annotations || [],
          metadata: testResult.metadata || {}
        };
      } else {
        // Legacy structure
        testData = {
          name: testName,
          status,
          duration: duration || 0,
          startTime: moment().toISOString(),
          endTime: status !== 'running' ? moment().toISOString() : null,
          errorMessage,
          stackTrace,
          steps: steps || [],
          artifacts: []
        };
      }

      // Update or add test result
      const testIndex = report.tests.findIndex(t => t.name === testData.name);

      if (testIndex >= 0) {
        // Preserve existing steps when updating test
        const existingSteps = report.tests[testIndex].steps || [];
        const existingArtifacts = report.tests[testIndex].artifacts || [];
        
        // Only use incoming steps if they are explicitly provided and not empty
        const preservedSteps = (testData.steps && testData.steps.length > 0) ? testData.steps : existingSteps;
        const preservedArtifacts = (testData.artifacts && testData.artifacts.length > 0) ? testData.artifacts : existingArtifacts;
        
        report.tests[testIndex] = { 
          ...report.tests[testIndex], 
          ...testData,
          steps: preservedSteps,
          artifacts: preservedArtifacts
        };
      } else {
        report.tests.push(testData);
      }

      // Extract project information from test metadata and update report metadata
      if (testData.metadata) {
        if (testData.metadata.projectId && !report.projectId) {
          report.projectId = testData.metadata.projectId;
        }
        if (testData.metadata.projectName && !report.projectName) {
          report.projectName = testData.metadata.projectName;
        }
        if (testData.metadata.projectType && !report.projectType) {
          report.projectType = testData.metadata.projectType;
        }
      }

      // Update summary
      this.updateSummary(report);

      await this.fileService.saveReport(reportId, report);

      // Real-time update
      const webSocketService = req.app.locals.webSocketService;
      webSocketService.emitToRoom(`report-${reportId}`, 'test-updated', {
        reportId,
        test: testData,
        summary: report.summary
      });

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

      const report = await this.fileService.getReport(reportId);
      if (!report) {
        return res.status(404).json({
          success: false,
          error: 'Report not found'
        });
      }

      report.status = 'completed';
      report.endTime = endTime || moment().toISOString();
      
      // Use provided summary if available, otherwise calculate it
      if (summary) {
        report.summary = {
          ...report.summary,
          ...summary,
          passRate: summary.total > 0 ? Math.round((summary.passed / summary.total) * 100) : 0
        };
      } else {
        this.updateSummary(report);
      }

      // Calculate total duration from start to end time
      if (report.startTime) {
        report.summary.duration = moment(report.endTime).diff(moment(report.startTime));
      }

      await this.fileService.saveReport(reportId, report);

      // Archive report to Azure Blob Storage
      await this.azureBlobService.archiveReport(reportId, report);

      // Notify completion
      const webSocketService = req.app.locals.webSocketService;
      webSocketService.emitToRoom(`report-${reportId}`, 'test-execution-completed', {
        reportId,
        summary: report.summary,
        duration: report.summary.duration
      });

      res.json({
        success: true,
        message: 'Test execution completed successfully',
        summary: report.summary
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

      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
      }

      const report = await this.fileService.getReport(reportId);
      if (!report) {
        return res.status(404).json({
          success: false,
          error: 'Report not found'
        });
      }

      // Upload to Azure Blob Storage
      const blobUrl = await this.azureBlobService.uploadArtifact(
        reportId,
        file.filename,
        file.path,
        artifactType || 'attachment',
        testName
      );

      // Update report with artifact reference
      const test = report.tests.find(t => t.name === testName);
      if (test) {
        if (!test.artifacts) {
          test.artifacts = [];
        }
        test.artifacts.push({
          id: uuidv4(),
          type: artifactType || 'attachment',
          filename: file.originalname,
          url: blobUrl,
          uploadedAt: moment().toISOString()
        });

        await this.fileService.saveReport(reportId, report);
      } else {
        console.log(`⚠️ Test not found for artifact: ${testName}. Available tests:`, report.tests.map(t => t.name));
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

      const report = await this.fileService.getReport(reportId);
      if (!report) {
        return res.status(404).json({
          success: false,
          error: 'Report not found'
        });
      }

      const test = report.tests.find(t => t.name === testName);
      if (!test) {
        return res.status(404).json({
          success: false,
          error: 'Test not found'
        });
      }

      const step = {
        id: uuidv4(),
        name: stepName,
        status,
        duration: duration || 0,
        timestamp: moment().toISOString(),
        screenshot,
        description
      };

      test.steps.push(step);
      await this.fileService.saveReport(reportId, report);

      // Real-time update
      const webSocketService = req.app.locals.webSocketService;
      webSocketService.emitToRoom(`report-${reportId}`, 'test-step-added', {
        reportId,
        testName,
        step
      });

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

      const report = await this.fileService.getReport(reportId);
      if (!report) {
        return res.status(404).json({
          success: false,
          error: 'Report not found'
        });
      }

      // Process batch of test results
      tests.forEach(testData => {
        const existingIndex = report.tests.findIndex(t => t.name === testData.name);
        if (existingIndex >= 0) {
          report.tests[existingIndex] = { ...report.tests[existingIndex], ...testData };
        } else {
          report.tests.push(testData);
        }
      });

      this.updateSummary(report);
      await this.fileService.saveReport(reportId, report);

      // Batch notification
      const webSocketService = req.app.locals.webSocketService;
      webSocketService.emitToRoom(`report-${reportId}`, 'batch-tests-updated', {
        reportId,
        summary: report.summary,
        testsCount: tests.length
      });

      res.json({
        success: true,
        message: `${tests.length} tests updated successfully`,
        summary: report.summary
      });
    } catch (error) {
      console.error('Error processing batch test results:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process batch test results'
      });
    }
  }

  updateSummary(report) {
    const summary = {
      total: report.tests.length,
      passed: report.tests.filter(t => t.status === 'passed').length,
      failed: report.tests.filter(t => t.status === 'failed').length,
      skipped: report.tests.filter(t => t.status === 'skipped').length,
      duration: report.tests.reduce((sum, test) => sum + (test.duration || 0), 0)
    };
    
    summary.passRate = summary.total > 0 ? 
      Math.round((summary.passed / summary.total) * 100) : 0;
    
    report.summary = summary;
  }
}

export default TestController;