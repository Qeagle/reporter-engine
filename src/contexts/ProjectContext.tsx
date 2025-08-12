import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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

  useEffect(() => {
    initializeProjects();
  }, []);

  const initializeProjects = async () => {
    try {
      await refreshProjects();
      
      // Load saved project from localStorage or select first active project
      const savedProjectId = localStorage.getItem('currentProjectId');
      if (savedProjectId) {
        const savedProject = projects.find(p => p.id === savedProjectId);
        if (savedProject) {
          setCurrentProject(savedProject);
          return;
        }
      }
      
      // Select first active project as default
      const activeProject = projects.find(p => p.status === 'active');
      if (activeProject) {
        setCurrentProject(activeProject);
        localStorage.setItem('currentProjectId', activeProject.id);
      }
    } catch (error) {
      console.error('Failed to initialize projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProjects = async (): Promise<void> => {
    try {
      const response = await fetch('/api/projects');
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      const data = await response.json();
      setProjects(data);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      throw error;
    }
  };

  const handleSetCurrentProject = (project: Project) => {
    setCurrentProject(project);
    localStorage.setItem('currentProjectId', project.id);
  };

  const createProject = async (projectData: Omit<Project, 'id' | 'createdAt'>): Promise<void> => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectData),
      });

      if (!response.ok) {
        throw new Error('Failed to create project');
      }

      await refreshProjects();
    } catch (error) {
      console.error('Failed to create project:', error);
      throw error;
    }
  };

  const updateProject = async (id: string, projectData: Partial<Project>): Promise<void> => {
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectData),
      });

      if (!response.ok) {
        throw new Error('Failed to update project');
      }

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
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete project');
      }

      await refreshProjects();

      // If the deleted project was the current one, select another
      if (currentProject?.id === id) {
        const activeProject = projects.find(p => p.id !== id && p.status === 'active');
        if (activeProject) {
          handleSetCurrentProject(activeProject);
        } else {
          setCurrentProject(null);
          localStorage.removeItem('currentProjectId');
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
