import React from 'react';
import { NavLink } from 'react-router-dom';
import { BarChart3, FileText, Settings, ChevronLeft, ChevronRight, Bug, TrendingUp, AlertTriangle } from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';
import { usePrimaryColor } from '../../hooks/usePrimaryColor';
import Analytics360Icon from '../Brand/Analytics360Icon';

interface SidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  onToggle: () => void;
  onCollapse: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, isCollapsed, onToggle, onCollapse }) => {
  const { settings } = useSettings();
  const { getIconClasses, getActiveClasses } = usePrimaryColor();
  
  const navigation = [
    { name: 'Dashboard', href: '/', icon: BarChart3 },
    { name: 'Reports', href: '/reports', icon: FileText },
    { name: 'Failure Analysis', href: '/defects', icon: Bug },
    { name: 'Exceptions', href: '/exceptions', icon: AlertTriangle },
    { name: 'Trend Analysis', href: '/trends', icon: TrendingUp },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" aria-hidden="true">
          <div
            className="fixed inset-0 bg-gray-600 bg-opacity-75"
            onClick={onToggle}
          />
        </div>
      )}

      {/* Sidebar */}
      <div
        className={`${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${
          isCollapsed ? 'w-16' : 'w-64'
        } fixed inset-y-0 left-0 z-50 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}
      >
        {/* Header with collapse button */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
          <div className={`flex items-center space-x-2 ${isCollapsed ? 'justify-center w-full' : ''}`}>
            <Analytics360Icon className={`w-8 h-8 ${getIconClasses()}`} />
            {!isCollapsed && (
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {settings.brandName}
              </h1>
            )}
          </div>
          {!isCollapsed && (
            <button
              onClick={onCollapse}
              className="hidden lg:flex p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
              title="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
          )}
          {isCollapsed && (
            <button
              onClick={onCollapse}
              className="hidden lg:flex p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 absolute right-2"
              title="Expand sidebar"
            >
              <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
          )}
        </div>

        <nav className="mt-8">
          <div className={`${isCollapsed ? 'px-2' : 'px-4'}`}>
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  `group flex items-center ${isCollapsed ? 'justify-center px-2 py-3' : 'px-3 py-2'} text-sm font-medium rounded-md mb-1 transition-colors duration-200 ${
                    isActive
                      ? `${getActiveClasses()} dark:bg-[var(--primary-900)] dark:text-[var(--primary-color)]`
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
                  }`
                }
                title={isCollapsed ? item.name : undefined}
              >
                <item.icon className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'}`} />
                {!isCollapsed && item.name}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </>
  );
};

export default Sidebar;