import React, { useState } from 'react';
import { FolderOpen, Search, Command, X } from 'lucide-react';
import { useProject } from '../contexts/ProjectContext';
import ProjectCommandPalette from './ProjectCommandPalette';
import ProjectManagementModal from './ProjectManagementModal';
import { useAuth } from '../contexts/AuthContext';

interface MobileProjectSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileProjectSwitcher: React.FC<MobileProjectSwitcherProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { currentProject, setCurrentProject, refreshProjects } = useProject();
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showProjectManagement, setShowProjectManagement] = useState(false);

  const handleProjectChange = (project: any) => {
    setCurrentProject(project);
    onClose();
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

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile Project Switcher Overlay */}
      <div className="md:hidden fixed inset-0 z-40 bg-black bg-opacity-25" onClick={onClose} />
      
      {/* Mobile Project Switcher Panel */}
      <div className="md:hidden fixed inset-x-0 top-0 z-50 bg-white shadow-lg">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <FolderOpen className="w-5 h-5 text-gray-600" />
            <span className="font-medium text-gray-900">Select Project</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4">
          {/* Current Project Display */}
          {currentProject && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{currentProject.name}</div>
                  <div className="text-sm text-gray-500">{currentProject.description}</div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                    {currentProject.type}
                  </span>
                  <div className={`w-2 h-2 ${getProjectTypeColor(currentProject.type)} rounded-full`} />
                </div>
              </div>
            </div>
          )}
          
          {/* Quick Switch Button */}
          <button
            onClick={() => {
              setShowCommandPalette(true);
              onClose();
            }}
            className="w-full flex items-center space-x-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border-2 border-dashed border-gray-200 transition-colors"
          >
            <Search className="w-5 h-5 text-gray-400" />
            <div className="flex-1 text-left">
              <div className="font-medium text-gray-900">Switch Project</div>
              <div className="text-sm text-gray-500">Search and select a different project</div>
            </div>
            <Command className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

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

export default MobileProjectSwitcher;
