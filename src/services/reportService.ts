import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class ReportService {
  private api = axios.create({
    baseURL: `${API_URL}/api/reports`,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  constructor() {
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  async getReports(params?: {
    page?: number;
    limit?: number;
    status?: string;
    environment?: string;
    framework?: string;
    projectId?: string;
    sortBy?: string;
    sortOrder?: string;
  }) {
    try {
      const response = await this.api.get('/', { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch reports');
    }
  }

  async getReportById(reportId: string) {
    try {
      const response = await this.api.get(`/${reportId}`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch report');
    }
  }

  async getReportMetrics(reportId: string) {
    try {
      const response = await this.api.get(`/${reportId}/metrics`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch metrics');
    }
  }

  async getReportTimeline(reportId: string) {
    try {
      const response = await this.api.get(`/${reportId}/timeline`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch timeline');
    }
  }

  async exportToPDF(reportId: string) {
    try {
      const response = await this.api.get(`/${reportId}/export/pdf`, {
        responseType: 'blob'
      });
      
      // Extract filename from Content-Disposition header
      const headers = response.headers || {};
      let contentDisposition = null;
      
      for (const key of Object.keys(headers)) {
        if (key.toLowerCase() === 'content-disposition') {
          contentDisposition = headers[key];
          break;
        }
      }
      
      let filename = `test-report-${reportId}.pdf`; // fallback
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to export PDF');
    }
  }

  async exportToJSON(reportId: string) {
    try {
      const response = await this.api.get(`/${reportId}/export/json`, {
        responseType: 'blob'
      });
      
      // Extract filename from Content-Disposition header
      const headers = response.headers || {};
      let contentDisposition = null;
      
      for (const key of Object.keys(headers)) {
        if (key.toLowerCase() === 'content-disposition') {
          contentDisposition = headers[key];
          break;
        }
      }
      
      let filename = `report-${reportId}.json`; // fallback
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to export JSON');
    }
  }

  async addAnnotation(reportId: string, annotation: {
    testName: string;
    message: string;
    type?: string;
  }) {
    try {
      const response = await this.api.post(`/${reportId}/annotations`, annotation);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to add annotation');
    }
  }

  async searchReports(query: string, filters?: any) {
    try {
      const response = await this.api.post('/search', { query, filters });
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to search reports');
    }
  }

  async compareReports(reportIds: string[]) {
    try {
      const response = await this.api.post('/compare', { reportIds });
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to compare reports');
    }
  }

  async exportToHTML(reportId: string, includeArtifacts: boolean = true) {
    try {
      const response = await this.api.post(`/${reportId}/export/html?includeArtifacts=${includeArtifacts}`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to export HTML report');
    }
  }

  async getExportSizeEstimates(reportId: string) {
    try {
      const response = await this.api.get(`/${reportId}/export/size-estimates`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get export size estimates');
    }
  }

  async downloadHTMLExport(reportId: string, exportId: string) {
    try {
      const response = await this.api.get(`/${reportId}/export/html/${exportId}/download`, {
        responseType: 'blob'
      });
      
      // Extract filename from Content-Disposition header
      const contentDisposition = response.headers['content-disposition'];
      let filename = `report-${reportId}-${exportId}.zip`; // fallback
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      // Create download link for ZIP file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return true;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to download HTML report export');
    }
  }

  async listHTMLExports() {
    try {
      const response = await this.api.get('/exports/html');
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to list HTML exports');
    }
  }

  async deleteHTMLExport(exportId: string) {
    try {
      const response = await this.api.delete(`/exports/html/${exportId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to delete HTML export');
    }
  }

  // Test case specific exports
  async exportTestCaseToPDF(reportId: string, testCaseId: string) {
    try {
      const response = await this.api.get(`/${reportId}/testcase/${testCaseId}/export/pdf`, {
        responseType: 'blob'
      });
      
      // Try to extract filename from Content-Disposition header
      const contentDisposition = response.headers['content-disposition'];
      let filename = `testcase-${String(testCaseId).replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to export test case as PDF');
    }
  }

  async exportTestCaseToJSON(reportId: string, testCaseId: string) {
    try {
      const response = await this.api.get(`/${reportId}/testcase/${testCaseId}/export/json`);
      
      // Try to extract filename from Content-Disposition header
      const contentDisposition = response.headers['content-disposition'];
      let filename = `testcase-${String(testCaseId).replace(/[^a-zA-Z0-9]/g, '_')}.json`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }

      const dataStr = JSON.stringify(response.data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to export test case as JSON');
    }
  }

  async exportTestCaseToHTML(reportId: string, testCaseId: string, includeArtifacts: boolean = true) {
    try {
      const response = await this.api.post(`/${reportId}/testcase/${testCaseId}/export/html`, {
        includeArtifacts
      });
      
      // Auto-download the export
      await this.downloadTestCaseHTMLExport(reportId, testCaseId, response.data.exportId);
      
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to export test case as HTML');
    }
  }

  async downloadTestCaseHTMLExport(reportId: string, testCaseId: string, exportId: string) {
    try {
      const response = await this.api.get(`/${reportId}/testcase/${testCaseId}/export/html/${exportId}/download`, {
        responseType: 'blob'
      });
      
      // Try to extract filename from Content-Disposition header
      const contentDisposition = response.headers['content-disposition'];
      let filename = `testcase-${String(testCaseId).replace(/[^a-zA-Z0-9]/g, '_')}.zip`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to download test case HTML export');
    }
  }
}

export const reportService = new ReportService();