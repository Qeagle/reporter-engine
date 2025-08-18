import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '../services/apiService';
import { useAuth } from './AuthContext';

interface Project {
  id: string;
  name: string;
  description: string;
  type: string;
  status: 'active' | 'inactive';
  createdAt: string;
  settings: {
    retentionDays: number;
    autoCleanup: boolean;
    notifications: boolean;
  };
}

interface ProjectContextType {
  currentProject: Project | null;
  projects: Project[];
  isLoading: boolean;
  setCurrentProject: (project: Project) => void;
  refreshProjects: () => Promise<void>;
  createProject: (projectData: Omit<Project, 'id' | 'createdAt'>) => Promise<void>;
  updateProject: (id: string, projectData: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const useProject = (): ProjectContextType => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};

interface ProjectProviderProps {
  children: ReactNode;
}

export const ProjectProvider: React.FC<ProjectProviderProps> = ({ children }) => {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isAuthenticated, loading: authLoading } = useAuth();

  useEffect(() => {
    // Only initialize projects when user is authenticated and auth is not loading
    if (isAuthenticated && !authLoading) {
      initializeProjects();
    } else if (!authLoading && !isAuthenticated) {
      // Clear projects when user is not authenticated
      setProjects([]);
      setCurrentProject(null);
      setIsLoading(false);
    }
  }, [isAuthenticated, authLoading]);

  const initializeProjects = async () => {
    try {
      setIsLoading(true);
      await refreshProjects();
    } catch (error) {
      console.error('Failed to initialize projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Set current project after projects are loaded
    if (projects.length > 0 && !currentProject) {
      // Load saved project from localStorage or select first active project
      const savedProjectId = localStorage.getItem('selectedProjectId');
      if (savedProjectId) {
        const savedProject = projects.find(p => String(p.id) === String(savedProjectId));
        if (savedProject) {
          setCurrentProject(savedProject);
          return;
        }
      }
      
      // Select first active project as default
      const activeProject = projects.find(p => p.status === 'active');
      if (activeProject) {
        setCurrentProject(activeProject);
        localStorage.setItem('selectedProjectId', String(activeProject.id));
      }
    }
  }, [projects, currentProject]);

  const refreshProjects = async (): Promise<void> => {
    try {
      const data = await apiService.get('/projects');
      if (data.success) {
        setProjects(data.data || []);
      } else {
        throw new Error(data.error || 'Failed to fetch projects');
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      throw error;
    }
  };

  const handleSetCurrentProject = (project: Project) => {
    setCurrentProject(project);
    localStorage.setItem('selectedProjectId', String(project.id));
  };

  const createProject = async (projectData: Omit<Project, 'id' | 'createdAt'>): Promise<void> => {
    try {
      await apiService.post('/projects', projectData);
      await refreshProjects();
    } catch (error) {
      console.error('Failed to create project:', error);
      throw error;
    }
  };

  const updateProject = async (id: string, projectData: Partial<Project>): Promise<void> => {
    try {
      await apiService.put(`/projects/${id}`, projectData);
      await refreshProjects();

      // Update current project if it was the one being updated
      if (currentProject?.id === id) {
        const updatedProject = projects.find(p => p.id === id);
        if (updatedProject) {
          setCurrentProject(updatedProject);
        }
      }
    } catch (error) {
      console.error('Failed to update project:', error);
      throw error;
    }
  };

  const deleteProject = async (id: string): Promise<void> => {
    try {
      await apiService.delete(`/projects/${id}`);
      await refreshProjects();

      // If the deleted project was the current one, select another
      if (currentProject?.id === id) {
        const activeProject = projects.find(p => p.id !== id && p.status === 'active');
        if (activeProject) {
          handleSetCurrentProject(activeProject);
        } else {
          setCurrentProject(null);
          localStorage.removeItem('selectedProjectId');
        }
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      throw error;
    }
  };

  const value: ProjectContextType = {
    currentProject,
    projects,
    isLoading,
    setCurrentProject: handleSetCurrentProject,
    refreshProjects,
    createProject,
    updateProject,
    deleteProject,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};
