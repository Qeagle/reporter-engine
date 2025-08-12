import moment from 'moment';
import { v4 as uuidv4 } from 'uuid';
import FileService from '../services/FileService.js';
import PDFService from '../services/PDFService.js';
import AnalyticsService from '../services/AnalyticsService.js';

class ReportController {
  constructor() {
    this.fileService = new FileService();
    this.pdfService = new PDFService();
    this.analyticsService = new AnalyticsService();
  }

  async getReports(req, res) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        status, 
        environment, 
        framework,
        projectId,
        sortBy = 'startTime',
        sortOrder = 'desc'
      } = req.query;

      const reports = await this.fileService.getAllReports();
      
      // Apply filters
      let filteredReports = reports;
      
      if (status) {
        filteredReports = filteredReports.filter(r => r.status === status);
      }
      
      if (environment) {
        filteredReports = filteredReports.filter(r => r.environment === environment);
      }
      
      if (framework) {
        filteredReports = filteredReports.filter(r => r.framework === framework);
      }

      if (projectId) {
        filteredReports = filteredReports.filter(r => r.projectId === projectId);
      }

      // Apply sorting
      filteredReports.sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];
        
        if (sortOrder === 'desc') {
          return bVal > aVal ? 1 : -1;
        } else {
          return aVal > bVal ? 1 : -1;
        }
      });

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedReports = filteredReports.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: paginatedReports,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(filteredReports.length / limit),
          totalItems: filteredReports.length,
          itemsPerPage: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Error fetching reports:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch reports'
      });
    }
  }

  async getReportById(req, res) {
    try {
      const { reportId } = req.params;
      
      const report = await this.fileService.getReport(reportId);
      if (!report) {
        return res.status(404).json({
          success: false,
          error: 'Report not found'
        });
      }

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      console.error('Error fetching report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch report'
      });
    }
  }

  async getReportMetrics(req, res) {
    try {
      const { reportId } = req.params;
      
      const report = await this.fileService.getReport(reportId);
      if (!report) {
        return res.status(404).json({
          success: false,
          error: 'Report not found'
        });
      }

      const metrics = this.analyticsService.calculateMetrics(report);
      
      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error('Error calculating report metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to calculate metrics'
      });
    }
  }

  async getReportTimeline(req, res) {
    try {
      const { reportId } = req.params;
      
      const report = await this.fileService.getReport(reportId);
      if (!report) {
        return res.status(404).json({
          success: false,
          error: 'Report not found'
        });
      }

      const timeline = this.analyticsService.generateTimeline(report);
      
      res.json({
        success: true,
        data: timeline
      });
    } catch (error) {
      console.error('Error generating timeline:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate timeline'
      });
    }
  }

  async exportToPDF(req, res) {
    try {
      const { reportId } = req.params;
      
      const report = await this.fileService.getReport(reportId);
      if (!report) {
        return res.status(404).json({
          success: false,
          error: 'Report not found'
        });
      }

      const pdfBuffer = await this.pdfService.generateReportPDF(report);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 
        `attachment; filename="test-report-${reportId}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export report to PDF'
      });
    }
  }

  async exportToJSON(req, res) {
    try {
      const { reportId } = req.params;
      
      const report = await this.fileService.getReport(reportId);
      if (!report) {
        return res.status(404).json({
          success: false,
          error: 'Report not found'
        });
      }

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 
        `attachment; filename="test-report-${reportId}.json"`);
      res.json(report);
    } catch (error) {
      console.error('Error exporting to JSON:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export report to JSON'
      });
    }
  }

  async addAnnotation(req, res) {
    try {
      const { reportId } = req.params;
      const { testName, message, type = 'note' } = req.body;
      const userId = req.user?.id || 'anonymous';

      const report = await this.fileService.getReport(reportId);
      if (!report) {
        return res.status(404).json({
          success: false,
          error: 'Report not found'
        });
      }

      const annotation = {
        id: uuidv4(),
        testName,
        message,
        type,
        userId,
        createdAt: moment().toISOString()
      };

      if (!report.annotations) {
        report.annotations = [];
      }
      
      report.annotations.push(annotation);
      await this.fileService.saveReport(reportId, report);

      res.json({
        success: true,
        data: annotation,
        message: 'Annotation added successfully'
      });
    } catch (error) {
      console.error('Error adding annotation:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add annotation'
      });
    }
  }

  async searchReports(req, res) {
    try {
      const { query, filters = {} } = req.body;
      
      const reports = await this.fileService.searchReports(query, filters);
      
      res.json({
        success: true,
        data: reports
      });
    } catch (error) {
      console.error('Error searching reports:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search reports'
      });
    }
  }

  async compareReports(req, res) {
    try {
      const { reportIds } = req.body;
      
      if (!reportIds || reportIds.length < 2) {
        return res.status(400).json({
          success: false,
          error: 'At least 2 report IDs are required for comparison'
        });
      }

      const reports = await Promise.all(
        reportIds.map(id => this.fileService.getReport(id))
      );

      const comparison = this.analyticsService.compareReports(reports);
      
      res.json({
        success: true,
        data: comparison
      });
    } catch (error) {
      console.error('Error comparing reports:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to compare reports'
      });
    }
  }
}

export default ReportController;