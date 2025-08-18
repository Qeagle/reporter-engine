import React, { useState, useEffect } from 'react';
import { FolderOpen, Search } from 'lucide-react';
import { useProject } from '../contexts/ProjectContext';
import ProjectCommandPalette from './ProjectCommandPalette';
import ProjectManagementModal from './ProjectManagementModal';
import { useAuth } from '../contexts/AuthContext';

const ModernProjectSwitcher: React.FC = () => {
  const { user } = useAuth();
  const { currentProject, setCurrentProject, refreshProjects } = useProject();
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showProjectManagement, setShowProjectManagement] = useState(false);

  // Global keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleProjectChange = (project: any) => {
    setCurrentProject(project);
  };

  const handleManageProjects = () => {
    setShowProjectManagement(true);
  };

  const handleProjectCreated = () => {
    refreshProjects();
  };

  const getProjectTypeColor = (type: string) => {
    const colors = {
      'playwright': 'bg-blue-500',
      'selenium': 'bg-green-500',
      'cypress': 'bg-purple-500',
      'other': 'bg-gray-500'
    };
    return colors[type as keyof typeof colors] || colors.other;
  };

  return (
    <>
      {/* Compact Project Switcher Button */}
      <button
        onClick={() => setShowCommandPalette(true)}
        className="flex items-center space-x-3 px-3 py-2 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg border border-gray-200 dark:border-gray-600 transition-all duration-200 hover:shadow-sm group min-w-[200px] max-w-[280px]"
      >
        {/* Project Icon & Type Indicator */}
        <div className="flex items-center space-x-2">
          <div className="relative">
            <FolderOpen className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            {currentProject && (
              <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 ${getProjectTypeColor(currentProject.type)} rounded-full border border-white dark:border-gray-700`} />
            )}
          </div>
        </div>

        {/* Project Info */}
        <div className="flex-1 text-left min-w-0">
          <div className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">
            {currentProject?.name || 'Select Project'}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {currentProject ? `${currentProject.type} • ${currentProject.status}` : 'Choose a project to continue'}
          </div>
        </div>

        {/* Keyboard Shortcut Hint */}
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-600 dark:text-gray-400">
            ⌘K
          </kbd>
          <Search className="w-3 h-3 text-gray-400 sm:hidden" />
        </div>
      </button>

      {/* Command Palette */}
      <ProjectCommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        currentProject={currentProject || undefined}
        onProjectChange={handleProjectChange}
        onManageProjects={handleManageProjects}
        isAdmin={user?.role === 'admin'}
      />

      {/* Project Management Modal */}
      <ProjectManagementModal
        isOpen={showProjectManagement}
        onClose={() => setShowProjectManagement(false)}
        onProjectCreated={handleProjectCreated}
      />
    </>
  );
};

export default ModernProjectSwitcher;
