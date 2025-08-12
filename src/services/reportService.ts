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
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `test-report-${reportId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to export PDF');
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
}

export const reportService = new ReportService();