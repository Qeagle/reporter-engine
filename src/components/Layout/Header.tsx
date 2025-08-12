import React, { useState } from 'react';
import { Menu, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useProject } from '../../contexts/ProjectContext';
import ProjectSelector from '../ProjectSelector';
import ProjectManagementModal from '../ProjectManagementModal';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const { currentProject, setCurrentProject, refreshProjects } = useProject();
  const [showProjectManagement, setShowProjectManagement] = useState(false);

  const handleProjectChange = (project: any) => {
    setCurrentProject(project);
  };

  const handleManageProjects = () => {
    setShowProjectManagement(true);
  };

  const handleProjectCreated = () => {
    refreshProjects();
  };

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          {/* Project Selector */}
          <div className="hidden md:block">
            <ProjectSelector
              currentProject={currentProject || undefined}
              onProjectChange={handleProjectChange}
              onManageProjects={handleManageProjects}
              isAdmin={user?.role === 'admin'}
            />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative group">
            <button className="flex items-center space-x-2 p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500">
              <User className="w-5 h-5" />
              <span className="text-sm font-medium">{user?.username}</span>
            </button>
            
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <div className="py-1">
                <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  {user?.email}
                </div>
                <button
                  onClick={logout}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Project Management Modal */}
      <ProjectManagementModal
        isOpen={showProjectManagement}
        onClose={() => setShowProjectManagement(false)}
        onProjectCreated={handleProjectCreated}
      />
    </header>
  );
};

export default Header;