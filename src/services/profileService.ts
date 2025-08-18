import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface Profile {
  id: number;
  email: string;
  name: string;
  display_name?: string;
  avatar_url?: string;
  phone?: string;
  bio?: string;
  timezone: string;
  location?: string;
  website?: string;
  is_active: number;
  created_at: string;
  updated_at?: string;
  avatarUrl?: string;
  thumbnailUrl?: string;
}

export interface ProfileUpdateData {
  name?: string;
  display_name?: string;
  phone?: string;
  bio?: string;
  timezone?: string;
  location?: string;
  website?: string;
}

export interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ProfileResponse {
  success: boolean;
  data: {
    profile: Profile;
  };
  message?: string;
}

export interface AvatarUploadResponse {
  success: boolean;
  data: {
    profile: Profile;
    upload: {
      filename: string;
      size: number;
      url: string;
      thumbnailUrl: string;
    };
  };
  message?: string;
}

class ProfileService {
  private api = axios.create({
    baseURL: `${API_URL}/api/profile`,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  constructor() {
    // Add request interceptor to include auth token
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      console.log('ProfileService - Token from localStorage:', token ? 'Token exists' : 'No token found');
      console.log('ProfileService - Making request to:', `${config.baseURL || ''}${config.url || ''}`);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('ProfileService - API Error:', error.response?.status, error.response?.data);
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Get current user's profile
  async getProfile(): Promise<ProfileResponse> {
    const response = await this.api.get('');
    return response.data;
  }

  // Update profile information
  async updateProfile(profileData: ProfileUpdateData): Promise<ProfileResponse> {
    const response = await this.api.put('', profileData);
    return response.data;
  }

  // Upload profile avatar
  async uploadAvatar(file: File): Promise<AvatarUploadResponse> {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await this.api.post('avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Delete profile avatar
  async deleteAvatar(): Promise<ProfileResponse> {
    const response = await this.api.delete('avatar');
    return response.data;
  }

  // Change password
  async changePassword(passwordData: PasswordChangeData): Promise<{ success: boolean; message: string }> {
    const response = await this.api.put('password', passwordData);
    return response.data;
  }

  // Validate file before upload
  validateAvatarFile(file: File): string[] {
    const errors: string[] = [];
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (!file) {
      errors.push('Please select a file');
      return errors;
    }

    if (file.size > maxSize) {
      errors.push('File size must be less than 5MB');
    }

    if (!allowedTypes.includes(file.type)) {
      errors.push('Only JPEG, PNG, and WebP images are allowed');
    }

    return errors;
  }

  // Format phone number for display
  formatPhoneNumber(phone: string): string {
    if (!phone) return '';
    
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');
    
    // Format based on length
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else if (digits.length === 11 && digits[0] === '1') {
      return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
    
    return phone; // Return original if can't format
  }

  // Validate profile data
  validateProfileData(data: ProfileUpdateData): string[] {
    const errors: string[] = [];

    if (data.display_name && data.display_name.length > 100) {
      errors.push('Display name must be less than 100 characters');
    }

    if (data.phone && !/^[\d\s\-\+\(\)]+$/.test(data.phone)) {
      errors.push('Invalid phone number format');
    }

    if (data.bio && data.bio.length > 500) {
      errors.push('Bio must be less than 500 characters');
    }

    if (data.website && data.website.length > 200) {
      errors.push('Website URL must be less than 200 characters');
    }

    if (data.website && data.website && !this.isValidUrl(data.website)) {
      errors.push('Please enter a valid website URL');
    }

    if (data.location && data.location.length > 100) {
      errors.push('Location must be less than 100 characters');
    }

    return errors;
  }

  // Validate password data
  validatePasswordData(data: PasswordChangeData): string[] {
    const errors: string[] = [];

    if (!data.currentPassword) {
      errors.push('Current password is required');
    }

    if (!data.newPassword) {
      errors.push('New password is required');
    }

    if (!data.confirmPassword) {
      errors.push('Password confirmation is required');
    }

    if (data.newPassword && data.newPassword.length < 6) {
      errors.push('New password must be at least 6 characters long');
    }

    if (data.newPassword !== data.confirmPassword) {
      errors.push('New passwords do not match');
    }

    if (data.currentPassword === data.newPassword) {
      errors.push('New password must be different from current password');
    }

    return errors;
  }

  // Check if URL is valid
  private isValidUrl(string: string): boolean {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  // Get timezone list
  getTimezones(): string[] {
    return [
      'UTC',
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'America/Toronto',
      'America/Vancouver',
      'Europe/London',
      'Europe/Paris',
      'Europe/Berlin',
      'Europe/Rome',
      'Europe/Madrid',
      'Asia/Tokyo',
      'Asia/Shanghai',
      'Asia/Kolkata',
      'Asia/Dubai',
      'Australia/Sydney',
      'Australia/Melbourne',
      'Pacific/Auckland'
    ];
  }
}

export const profileService = new ProfileService();
export default profileService;
