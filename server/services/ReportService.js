import FileService from './FileService.js';
import AnalyticsService from './AnalyticsService.js';
import PDFService from './PDFService.js';
import { v4 as uuidv4 } from 'uuid';

class ReportService {
  constructor() {
    this.fileService = new FileService();
    this.analyticsService = new AnalyticsService();
    this.pdfService = new PDFService();
  }

  async getAllReports(filters = {}) {
    try {
      const reports = await this.fileService.getAllReports();
      
      // Apply filters
      let filteredReports = reports;
      
      if (filters.status) {
        filteredReports = filteredReports.filter(r => r.status === filters.status);
      }
      
      if (filters.environment) {
        filteredReports = filteredReports.filter(r => r.environment === filters.environment);
      }
      
      if (filters.framework) {
        filteredReports = filteredReports.filter(r => r.framework === filters.framework);
      }

      return filteredReports;
    } catch (error) {
      console.error('Error in ReportService.getAllReports:', error);
      throw error;
    }
  }

  async getReportById(reportId) {
    try {
      return await this.fileService.getReport(reportId);
    } catch (error) {
      console.error('Error in ReportService.getReportById:', error);
      throw error;
    }
  }

  async createReport(reportData) {
    try {
      const reportId = uuidv4();
      const report = {
        id: reportId,
        ...reportData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await this.fileService.saveReport(reportId, report);
      return report;
    } catch (error) {
      console.error('Error in ReportService.createReport:', error);
      throw error;
    }
  }

  async updateReport(reportId, updateData) {
    try {
      const existingReport = await this.fileService.getReport(reportId);
      if (!existingReport) {
        throw new Error('Report not found');
      }

      const updatedReport = {
        ...existingReport,
        ...updateData,
        updatedAt: new Date().toISOString()
      };

      await this.fileService.saveReport(reportId, updatedReport);
      return updatedReport;
    } catch (error) {
      console.error('Error in ReportService.updateReport:', error);
      throw error;
    }
  }

  async deleteReport(reportId) {
    try {
      return await this.fileService.deleteReport(reportId);
    } catch (error) {
      console.error('Error in ReportService.deleteReport:', error);
      throw error;
    }
  }

  async getReportMetrics(reportId) {
    try {
      const report = await this.fileService.getReport(reportId);
      if (!report) {
        throw new Error('Report not found');
      }

      return this.analyticsService.calculateMetrics(report);
    } catch (error) {
      console.error('Error in ReportService.getReportMetrics:', error);
      throw error;
    }
  }

  async generateReportTimeline(reportId) {
    try {
      const report = await this.fileService.getReport(reportId);
      if (!report) {
        throw new Error('Report not found');
      }

      return this.analyticsService.generateTimeline(report);
    } catch (error) {
      console.error('Error in ReportService.generateReportTimeline:', error);
      throw error;
    }
  }

  async exportReportToPDF(reportId) {
    try {
      const report = await this.fileService.getReport(reportId);
      if (!report) {
        throw new Error('Report not found');
      }

      return await this.pdfService.generateReportPDF(report);
    } catch (error) {
      console.error('Error in ReportService.exportReportToPDF:', error);
      throw error;
    }
  }

  async addAnnotation(reportId, annotation) {
    try {
      const report = await this.fileService.getReport(reportId);
      if (!report) {
        throw new Error('Report not found');
      }

      const newAnnotation = {
        id: uuidv4(),
        ...annotation,
        createdAt: new Date().toISOString()
      };

      if (!report.annotations) {
        report.annotations = [];
      }
      
      report.annotations.push(newAnnotation);
      await this.fileService.saveReport(reportId, report);

      return newAnnotation;
    } catch (error) {
      console.error('Error in ReportService.addAnnotation:', error);
      throw error;
    }
  }

  async searchReports(query, filters = {}) {
    try {
      return await this.fileService.searchReports(query, filters);
    } catch (error) {
      console.error('Error in ReportService.searchReports:', error);
      throw error;
    }
  }

  async compareReports(reportIds) {
    try {
      if (!reportIds || reportIds.length < 2) {
        throw new Error('At least 2 report IDs are required for comparison');
      }

      const reports = await Promise.all(
        reportIds.map(id => this.fileService.getReport(id))
      );

      return this.analyticsService.compareReports(reports);
    } catch (error) {
      console.error('Error in ReportService.compareReports:', error);
      throw error;
    }
  }
}

export default ReportService;
