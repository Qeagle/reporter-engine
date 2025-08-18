import React, { useState, useEffect } from 'react';
import { X, Plus, Edit2, FolderOpen, BarChart3, Settings, Calendar } from 'lucide-react';
import { projectService, type Project } from '../services/projectService';

interface ProjectManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: () => void;
}

const ProjectManagementModal: React.FC<ProjectManagementModalProps> = ({
  isOpen,
  onClose,
  onProjectCreated
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectStats, setProjectStats] = useState<Record<string, any>>({});

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'playwright',
    status: 'active' as 'active' | 'inactive',
    settings: {
      retentionDays: 30,
      autoCleanup: true,
      notifications: true
    }
  });

  useEffect(() => {
    if (isOpen) {
      fetchProjects();
      fetchProjectStats();
    }
  }, [isOpen]);

  const fetchProjects = async () => {
    try {
      const projectsData = await projectService.getAllProjects();
      setProjects(projectsData);
      
      // Fetch stats for each project
      const statsPromises = projectsData.map(async (project) => {
        try {
          const stats = await projectService.getProjectStats(project.id);
          return { projectId: project.id, stats };
        } catch (error) {
          console.error(`Failed to fetch stats for project ${project.id}:`, error);
          return { projectId: project.id, stats: { testRuns: 0 } };
        }
      });
      
      const statsResults = await Promise.all(statsPromises);
      const statsMap = statsResults.reduce((acc, { projectId, stats }) => {
        acc[projectId] = stats;
        return acc;
      }, {} as Record<string, any>);
      
      setProjectStats(statsMap);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  const fetchProjectStats = async () => {
    // This will be populated when we fetch projects
    // Individual project stats are fetched in fetchProjects()
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await projectService.createProject(formData);
      await fetchProjects();
      setShowCreateForm(false);
      resetForm();
      onProjectCreated();
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;

    try {
      await projectService.updateProject(editingProject.id, formData);
      await fetchProjects();
      setEditingProject(null);
      resetForm();
      onProjectCreated();
    } catch (error) {
      console.error('Failed to update project:', error);
    }
  };

  // Delete project function disabled to avoid potential data integrity issues
  // const handleDeleteProject = async (projectId: string) => {
  //   if (!window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
  //     return;
  //   }

  //   try {
  //     await projectService.deleteProject(projectId);
  //     await fetchProjects();
  //     onProjectCreated();
  //   } catch (error) {
  //     console.error('Failed to delete project:', error);
  //   }
  // };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'playwright',
      status: 'active',
      settings: {
        retentionDays: 30,
        autoCleanup: true,
        notifications: true
      }
    });
  };

  const startEdit = (project: Project) => {
    setFormData({
      name: project.name,
      description: project.description,
      type: project.type,
      status: project.status,
      settings: project.settings
    });
    setEditingProject(project);
    setShowCreateForm(true);
  };

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Project Management</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {!showCreateForm ? (
            <div>
              {/* Header with stats and create button */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex space-x-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{projects.length}</div>
                    <div className="text-sm text-gray-500">Total Projects</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {projects.filter(p => p.status === 'active').length}
                    </div>
                    <div className="text-sm text-gray-500">Active Projects</div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    resetForm();
                    setShowCreateForm(true);
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Project</span>
                </button>
              </div>

              {/* Projects grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project) => {
                  const stats = projectStats[project.id] || {};
                  return (
                    <div key={project.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <FolderOpen className="w-5 h-5 text-gray-600" />
                          <h3 className="font-semibold text-gray-900">{project.name}</h3>
                        </div>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => startEdit(project)}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                          >
                            <Edit2 className="w-4 h-4 text-gray-500" />
                          </button>
                          {/* Delete button disabled to avoid potential data integrity issues */}
                          {/* <button
                            onClick={() => handleDeleteProject(project.id)}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button> */}
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 mb-3">{project.description}</p>

                      <div className="flex items-center justify-between mb-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getProjectTypeColor(project.type)}`}>
                          {project.type}
                        </span>
                        <div className={`flex items-center space-x-1 text-xs ${
                          project.status === 'active' ? 'text-green-600' : 'text-gray-500'
                        }`}>
                          <div className={`w-2 h-2 rounded-full ${
                            project.status === 'active' ? 'bg-green-400' : 'bg-gray-300'
                          }`}></div>
                          <span className="capitalize">{project.status}</span>
                        </div>
                      </div>

                      {/* Quick stats */}
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                        <div className="flex items-center space-x-1">
                          <BarChart3 className="w-3 h-3" />
                          <span>{stats.testRuns || 0} reports</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{
                            project.createdAt || project.created_at 
                              ? new Date(project.createdAt || project.created_at!).toLocaleDateString()
                              : 'Unknown date'
                          }</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Create/Edit Form */
            <form onSubmit={editingProject ? handleUpdateProject : handleCreateProject} className="max-w-2xl mx-auto">
              <h3 className="text-xl font-semibold mb-6">
                {editingProject ? 'Edit Project' : 'Create New Project'}
              </h3>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Project Type
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="playwright">Playwright</option>
                      <option value="selenium">Selenium</option>
                      <option value="cypress">Cypress</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                {/* Settings */}
                <div className="border-t pt-6">
                  <h4 className="text-lg font-medium mb-4 flex items-center space-x-2">
                    <Settings className="w-5 h-5" />
                    <span>Project Settings</span>
                  </h4>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Data Retention (days)
                      </label>
                      <input
                        type="number"
                        value={formData.settings.retentionDays}
                        onChange={(e) => setFormData({
                          ...formData,
                          settings: { ...formData.settings, retentionDays: parseInt(e.target.value) }
                        })}
                        min="1"
                        max="365"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="autoCleanup"
                        checked={formData.settings.autoCleanup}
                        onChange={(e) => setFormData({
                          ...formData,
                          settings: { ...formData.settings, autoCleanup: e.target.checked }
                        })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="autoCleanup" className="text-sm font-medium text-gray-700">
                        Enable automatic cleanup
                      </label>
                    </div>

                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="notifications"
                        checked={formData.settings.notifications}
                        onChange={(e) => setFormData({
                          ...formData,
                          settings: { ...formData.settings, notifications: e.target.checked }
                        })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="notifications" className="text-sm font-medium text-gray-700">
                        Enable notifications
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-8 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingProject(null);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingProject ? 'Update Project' : 'Create Project'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectManagementModal;
