import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface LoginResponse {
  user: {
    id: string;
    username: string;
    email: string;
    role: string;
  };
  token: string;
}

class AuthService {
  private api = axios.create({
    baseURL: `${API_URL}/api/auth`,
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
  }

  async login(username: string, password: string): Promise<LoginResponse> {
    try {
      const response = await this.api.post('/login', { username, password });
      if (response.data.success) {
        return response.data;
      }
      throw new Error(response.data.error || 'Login failed');
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  }

  async register(username: string, email: string, password: string): Promise<LoginResponse> {
    try {
      const response = await this.api.post('/register', { username, email, password });
      if (response.data.success) {
        return response.data;
      }
      throw new Error(response.data.error || 'Registration failed');
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Registration failed');
    }
  }

  async getProfile(): Promise<any> {
    try {
      const response = await this.api.get('/profile');
      if (response.data.success) {
        return response.data.user;
      }
      throw new Error(response.data.error || 'Failed to fetch profile');
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch profile');
    }
  }

  logout(): void {
    localStorage.removeItem('token');
  }
}

export const authService = new AuthService();