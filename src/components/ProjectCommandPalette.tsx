import React, { useState, useEffect, useRef } from 'react';
import { Search, FolderOpen, Settings, Command, ArrowRight, Clock, Star } from 'lucide-react';
import { projectService, type Project } from '../services/projectService';

const PROJECT_STORAGE_KEY = 'selectedProjectId';

const saveSelectedProject = (projectId: string): void => {
  try {
    localStorage.setItem(PROJECT_STORAGE_KEY, projectId);
  } catch (error) {
    console.warn('Failed to save selected project to localStorage:', error);
  }
};

interface ProjectCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  currentProject?: Project;
  onProjectChange: (project: Project) => void;
  onManageProjects: () => void;
  isAdmin?: boolean;
}

const ProjectCommandPalette: React.FC<ProjectCommandPaletteProps> = ({
  isOpen,
  onClose,
  currentProject,
  onProjectChange,
  onManageProjects,
  isAdmin = false
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentProjects, setRecentProjects] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchProjects();
      loadRecentProjects();
      setSearchTerm('');
      setSelectedIndex(0);
      // Focus search input when opened
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      const totalItems = filteredProjects.length + (isAdmin ? 1 : 0);
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, totalItems - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex < filteredProjects.length) {
            handleProjectSelect(filteredProjects[selectedIndex]);
          } else if (isAdmin && selectedIndex === filteredProjects.length) {
            handleManageProjects();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, projects.length, searchTerm, isAdmin]);

  const fetchProjects = async () => {
    try {
      const projectsData = await projectService.getAllProjects();
      setProjects(projectsData);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  const loadRecentProjects = () => {
    const recent = localStorage.getItem('recentProjects');
    if (recent) {
      setRecentProjects(JSON.parse(recent));
    }
  };

  const saveRecentProject = (projectId: string) => {
    const recent = [...recentProjects.filter(id => id !== projectId), projectId].slice(-5);
    setRecentProjects(recent);
    localStorage.setItem('recentProjects', JSON.stringify(recent));
  };

  const handleProjectSelect = (project: Project) => {
    // Save selected project to localStorage (ensure consistent string format)
    saveSelectedProject(String(project.id));
    onProjectChange(project);
    saveRecentProject(String(project.id));
    onClose();
  };

  const handleManageProjects = () => {
    onManageProjects();
    onClose();
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const recentProjectsData = recentProjects
    .map(id => projects.find(p => String(p.id) === String(id)))
    .filter(Boolean) as Project[];

  const getProjectTypeColor = (type: string) => {
    const colors = {
      'playwright': 'bg-blue-100 text-blue-800 border-blue-200',
      'selenium': 'bg-green-100 text-green-800 border-green-200',
      'cypress': 'bg-purple-100 text-purple-800 border-purple-200',
      'other': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[type as keyof typeof colors] || colors.other;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Command Palette */}
      <div className="flex items-start justify-center pt-16 px-4 relative z-10">
        <div 
          ref={containerRef}
          className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden transform transition-all duration-200 scale-100 opacity-100"
        >
          {/* Search Header */}
          <div className="flex items-center border-b border-gray-100 px-4 py-3">
            <Search className="w-5 h-5 text-gray-400 mr-3" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search projects... (or type to filter)"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setSelectedIndex(0);
              }}
              className="flex-1 outline-none text-gray-900 placeholder-gray-500"
            />
            <div className="flex items-center space-x-2 text-xs text-gray-400">
              <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">↑↓</kbd>
              <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">⏎</kbd>
              <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">esc</kbd>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {/* Recent Projects */}
            {!searchTerm && recentProjectsData.length > 0 && (
              <div className="border-b border-gray-50">
                <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide bg-gray-50">
                  <Clock className="w-3 h-3 inline mr-1" />
                  Recent
                </div>
                {recentProjectsData.slice(0, 3).map((project, index) => (
                  <ProjectItem
                    key={`recent-${project.id}`}
                    project={project}
                    isSelected={selectedIndex === index}
                    isCurrentProject={currentProject?.id === project.id}
                    onClick={() => handleProjectSelect(project)}
                    getProjectTypeColor={getProjectTypeColor}
                  />
                ))}
              </div>
            )}

            {/* All Projects */}
            <div>
              {!searchTerm && (
                <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide bg-gray-50">
                  <FolderOpen className="w-3 h-3 inline mr-1" />
                  All Projects
                </div>
              )}
              
              {filteredProjects.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500">
                  <FolderOpen className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>No projects found</p>
                  <p className="text-sm">Try a different search term</p>
                </div>
              ) : (
                filteredProjects.map((project, index) => {
                  // Simple index calculation for projects
                  const itemIndex = searchTerm ? index : index + (recentProjectsData.length > 0 ? Math.min(recentProjectsData.length, 3) : 0);
                  
                  return (
                    <ProjectItem
                      key={project.id}
                      project={project}
                      isSelected={selectedIndex === itemIndex}
                      isCurrentProject={currentProject?.id === project.id}
                      onClick={() => handleProjectSelect(project)}
                      getProjectTypeColor={getProjectTypeColor}
                    />
                  );
                })
              )}
            </div>

            {/* Admin Actions */}
            {isAdmin && (
              <div className="border-t border-gray-100">
                <button
                  onClick={handleManageProjects}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center space-x-3 transition-colors ${
                    selectedIndex === filteredProjects.length
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  <span className="font-medium">Manage Projects</span>
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 px-4 py-2 bg-gray-50">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center space-x-4">
                <span>Press <kbd className="px-1 bg-white rounded">⌘K</kbd> to open anywhere</span>
              </div>
              <div className="flex items-center space-x-1">
                <Command className="w-3 h-3" />
                <span>Command Palette</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ProjectItemProps {
  project: Project;
  isSelected: boolean;
  isCurrentProject: boolean;
  onClick: () => void;
  getProjectTypeColor: (type: string) => string;
}

const ProjectItem: React.FC<ProjectItemProps> = ({
  project,
  isSelected,
  isCurrentProject,
  onClick,
  getProjectTypeColor
}) => {
  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-all duration-150 cursor-pointer ${
        isSelected ? 'bg-blue-50 border-r-2 border-blue-500' : ''
      } ${isCurrentProject ? 'bg-yellow-50' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className={`font-medium truncate ${
              isSelected ? 'text-blue-900' : 'text-gray-900'
            }`}>
              {project.name}
            </span>
            {isCurrentProject && (
              <Star className="w-4 h-4 text-yellow-500 fill-current flex-shrink-0" />
            )}
          </div>
          <p className={`text-sm truncate mt-0.5 ${
            isSelected ? 'text-blue-600' : 'text-gray-500'
          }`}>
            {project.description}
          </p>
        </div>
        <div className="flex items-center space-x-2 ml-3">
          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getProjectTypeColor(project.type)}`}>
            {project.type}
          </span>
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
            project.status === 'active' ? 'bg-green-400' : 'bg-gray-300'
          }`} />
          {isSelected && (
            <ArrowRight className="w-4 h-4 text-blue-500 flex-shrink-0" />
          )}
        </div>
      </div>
    </button>
  );
};

export default ProjectCommandPalette;
