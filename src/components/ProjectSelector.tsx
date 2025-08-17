import React, { useState, useEffect } from 'react';
import { ChevronDown, FolderOpen, Settings } from 'lucide-react';
import { projectService, type Project } from '../services/projectService';

interface ProjectSelectorProps {
  currentProject?: Project;
  onProjectChange: (project: Project) => void;
  onManageProjects: () => void;
  isAdmin?: boolean;
}

const PROJECT_STORAGE_KEY = 'selectedProjectId';

const saveSelectedProject = (projectId: string): void => {
  try {
    localStorage.setItem(PROJECT_STORAGE_KEY, projectId);
  } catch (error) {
    console.warn('Failed to save selected project to localStorage:', error);
  }
};

const getSelectedProject = (): string | null => {
  try {
    return localStorage.getItem(PROJECT_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to get selected project from localStorage:', error);
    return null;
  }
};

const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  currentProject,
  onProjectChange,
  onManageProjects,
  isAdmin = false
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const projectsData = await projectService.getAllProjects();
      setProjects(projectsData);
      
      // Check if there's a saved project in localStorage
      const savedProjectId = getSelectedProject();
      let projectToSelect = null;
      
      if (savedProjectId) {
        // Try to find the saved project (handle both string and number IDs)
        projectToSelect = projectsData.find((p: Project) => 
          String(p.id) === String(savedProjectId)
        );
      }
      
      // If no saved project or saved project not found, select the first active one
      if (!projectToSelect && !currentProject && projectsData.length > 0) {
        projectToSelect = projectsData.find((p: Project) => p.status === 'active') || projectsData[0];
      }
      
      // Only change project if we found one and no current project is set
      if (projectToSelect && !currentProject) {
        onProjectChange(projectToSelect);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectSelect = (project: Project) => {
    // Save selected project to localStorage (ensure consistent string format)
    saveSelectedProject(String(project.id));
    onProjectChange(project);
    setIsOpen(false);
  };

  const getProjectTypeColor = (type: string) => {
    const colors = {
      'playwright': 'bg-blue-100 text-blue-800',
      'selenium': 'bg-green-100 text-green-800',
      'cypress': 'bg-purple-100 text-purple-800',
      'other': 'bg-gray-100 text-gray-800'
    };
    return colors[type as keyof typeof colors] || colors.other;
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2 p-2 bg-white rounded-lg border animate-pulse">
        <div className="w-6 h-6 bg-gray-200 rounded"></div>
        <div className="w-32 h-4 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors min-w-[250px]"
      >
        <FolderOpen className="w-5 h-5 text-gray-600" />
        <div className="flex-1 text-left">
          <div className="font-medium text-gray-900">
            {currentProject?.name || 'Select Project'}
          </div>
          {currentProject && (
            <div className="text-sm text-gray-500">
              {currentProject.description}
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {currentProject && (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getProjectTypeColor(currentProject.type)}`}>
              {currentProject.type}
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="max-h-80 overflow-y-auto">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => handleProjectSelect(project)}
                className={`w-full p-3 text-left hover:bg-gray-50 first:rounded-t-lg transition-colors ${
                  currentProject?.id === project.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{project.name}</div>
                    <div className="text-sm text-gray-500">{project.description}</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getProjectTypeColor(project.type)}`}>
                      {project.type}
                    </span>
                    <div className={`w-2 h-2 rounded-full ${
                      project.status === 'active' ? 'bg-green-400' : 'bg-gray-300'
                    }`}></div>
                  </div>
                </div>
              </button>
            ))}
          </div>
          
          {isAdmin && (
            <div className="border-t border-gray-100">
              <button
                onClick={() => {
                  setIsOpen(false);
                  onManageProjects();
                }}
                className="w-full p-3 text-left hover:bg-gray-50 flex items-center space-x-2 text-gray-600 rounded-b-lg"
              >
                <Settings className="w-4 h-4" />
                <span className="text-sm font-medium">Manage Projects</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectSelector;
