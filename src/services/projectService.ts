import { apiService } from './apiService';

interface Project {
  id: string;
  key?: string;
  name: string;
  description: string;
  type: string;
  status: 'active' | 'inactive';
  visibility?: string;
  createdAt?: string;
  created_at?: string; // API field name
  settings: {
    retentionDays: number;
    autoCleanup: boolean;
    notifications: boolean;
  };
}

interface ProjectsResponse {
  success: boolean;
  data: Project[];
  total?: number;
}

interface ProjectResponse {
  success: boolean;
  data: Project;
}

class ProjectService {
  async getAllProjects(): Promise<Project[]> {
    try {
      const response: ProjectsResponse = await apiService.get('/projects');
      return response.success ? response.data : [];
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      throw error;
    }
  }

  async getProjectById(id: string): Promise<Project | null> {
    try {
      const response: ProjectResponse = await apiService.get(`/projects/${id}`);
      return response.success ? response.data : null;
    } catch (error) {
      console.error(`Failed to fetch project ${id}:`, error);
      throw error;
    }
  }

  async createProject(projectData: Partial<Project>): Promise<Project> {
    try {
      const response: ProjectResponse = await apiService.post('/projects', projectData);
      return response.data;
    } catch (error) {
      console.error('Failed to create project:', error);
      throw error;
    }
  }

  async updateProject(id: string, projectData: Partial<Project>): Promise<Project> {
    try {
      const response: ProjectResponse = await apiService.put(`/projects/${id}`, projectData);
      return response.data;
    } catch (error) {
      console.error(`Failed to update project ${id}:`, error);
      throw error;
    }
  }

  async deleteProject(id: string): Promise<void> {
    try {
      await apiService.delete(`/projects/${id}`);
    } catch (error) {
      console.error(`Failed to delete project ${id}:`, error);
      throw error;
    }
  }

  async getProjectStats(id: string) {
    try {
      const response = await apiService.get(`/projects/${id}/stats`);
      return response.success ? response.data : null;
    } catch (error) {
      console.error(`Failed to fetch project stats for ${id}:`, error);
      throw error;
    }
  }

  async getProjectMembers(id: string) {
    try {
      const response = await apiService.get(`/projects/${id}/members`);
      return response.success ? response.data : [];
    } catch (error) {
      console.error(`Failed to fetch project members for ${id}:`, error);
      throw error;
    }
  }

  async addProjectMember(projectId: string, userId: string, roleKey: string) {
    try {
      const response = await apiService.post(`/projects/${projectId}/members`, {
        userId,
        roleKey
      });
      return response;
    } catch (error) {
      console.error(`Failed to add member to project ${projectId}:`, error);
      throw error;
    }
  }
}

export const projectService = new ProjectService();
export type { Project };
