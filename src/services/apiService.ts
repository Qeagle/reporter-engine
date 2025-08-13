import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class ApiService {
  private api = axios.create({
    baseURL: `${API_URL}/api`,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  constructor() {
    // Add request interceptor to include auth token
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Add response interceptor to handle errors
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token might be expired, clear it but don't force redirect
          // Let the auth context handle the navigation
          localStorage.removeItem('token');
        }
        return Promise.reject(error);
      }
    );
  }

  async get(url: string) {
    const response = await this.api.get(url);
    return response.data;
  }

  async post(url: string, data?: any) {
    const response = await this.api.post(url, data);
    return response.data;
  }

  async put(url: string, data?: any) {
    const response = await this.api.put(url, data);
    return response.data;
  }

  async delete(url: string) {
    const response = await this.api.delete(url);
    return response.data;
  }
}

export const apiService = new ApiService();
