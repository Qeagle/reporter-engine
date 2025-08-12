import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class FileService {
  constructor() {
    this.reportsDir = path.join(__dirname, '../data/reports');
    this.ensureDirectoryExists();
  }

  async ensureDirectoryExists() {
    try {
      await fs.mkdir(this.reportsDir, { recursive: true });
    } catch (error) {
      console.error('Error creating reports directory:', error);
    }
  }

  async saveReport(reportId, reportData) {
    try {
      const filePath = path.join(this.reportsDir, `${reportId}.json`);
      const tempFilePath = `${filePath}.tmp`;
      
      // Write to temporary file first (atomic operation)
      await fs.writeFile(tempFilePath, JSON.stringify(reportData, null, 2));
      
      // Atomically move temp file to final location
      await fs.rename(tempFilePath, filePath);
      
      return true;
    } catch (error) {
      console.error('Error saving report:', error);
      throw error;
    }
  }

  async getReport(reportId) {
    try {
      const filePath = path.join(this.reportsDir, `${reportId}.json`);
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      console.error('Error reading report:', error);
      throw error;
    }
  }

  async getAllReports() {
    try {
      const files = await fs.readdir(this.reportsDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      const reports = await Promise.all(
        jsonFiles.map(async (file) => {
          try {
            const reportId = file.replace('.json', '');
            return await this.getReport(reportId);
          } catch (error) {
            console.error(`Error reading report ${file}:`, error);
            return null;
          }
        })
      );

      return reports.filter(report => report !== null);
    } catch (error) {
      console.error('Error getting all reports:', error);
      return [];
    }
  }

  async deleteReport(reportId) {
    try {
      const filePath = path.join(this.reportsDir, `${reportId}.json`);
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return true; // Already deleted
      }
      console.error('Error deleting report:', error);
      throw error;
    }
  }

  async searchReports(query, filters = {}) {
    try {
      const allReports = await this.getAllReports();
      
      let filteredReports = allReports;

      // Apply text search
      if (query) {
        filteredReports = filteredReports.filter(report => {
          const searchText = JSON.stringify(report).toLowerCase();
          return searchText.includes(query.toLowerCase());
        });
      }

      // Apply filters
      if (filters.status) {
        filteredReports = filteredReports.filter(r => r.status === filters.status);
      }

      if (filters.environment) {
        filteredReports = filteredReports.filter(r => r.environment === filters.environment);
      }

      if (filters.framework) {
        filteredReports = filteredReports.filter(r => r.framework === filters.framework);
      }

      if (filters.tags && filters.tags.length > 0) {
        filteredReports = filteredReports.filter(r => 
          r.tags && r.tags.some(tag => filters.tags.includes(tag))
        );
      }

      if (filters.dateFrom) {
        filteredReports = filteredReports.filter(r => 
          new Date(r.startTime) >= new Date(filters.dateFrom)
        );
      }

      if (filters.dateTo) {
        filteredReports = filteredReports.filter(r => 
          new Date(r.startTime) <= new Date(filters.dateTo)
        );
      }

      return filteredReports;
    } catch (error) {
      console.error('Error searching reports:', error);
      return [];
    }
  }

  async getReportsByDateRange(startDate, endDate) {
    try {
      const allReports = await this.getAllReports();
      
      return allReports.filter(report => {
        const reportDate = new Date(report.startTime);
        return reportDate >= new Date(startDate) && reportDate <= new Date(endDate);
      });
    } catch (error) {
      console.error('Error getting reports by date range:', error);
      return [];
    }
  }
}

export default FileService;