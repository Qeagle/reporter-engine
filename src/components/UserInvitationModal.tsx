import React, { useState, useEffect } from 'react';
import { X, Mail, User, Shield, FolderOpen } from 'lucide-react';
import { invitationService, CreateInvitationData, Role } from '../services/invitationService';
import { projectService, Project } from '../services/projectService';
import toast from 'react-hot-toast';

interface UserInvitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvitationSent: () => void;
  projectId?: number; // If set, this is a project-specific invitation
}

const UserInvitationModal: React.FC<UserInvitationModalProps> = ({
  isOpen,
  onClose,
  onInvitationSent,
  projectId
}) => {
  const [formData, setFormData] = useState({
    email: '',
    roleId: '',
    projectId: projectId || '',
    projectRoleId: ''
  });
  const [roles, setRoles] = useState<Role[]>([]);
  const [projectRoles, setProjectRoles] = useState<Role[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [isProjectInvite, setIsProjectInvite] = useState(!!projectId);

  useEffect(() => {
    if (isOpen) {
      loadRoles();
      if (!projectId) {
        loadProjects();
      }
    }
  }, [isOpen, projectId]);

  const loadRoles = async () => {
    try {
      const [systemRoles, projectRolesData] = await Promise.all([
        invitationService.getRoles('system'),
        invitationService.getRoles('project')
      ]);
      setRoles(systemRoles);
      setProjectRoles(projectRolesData);
    } catch (error) {
      console.error('Error loading roles:', error);
      toast.error('Failed to load roles');
    }
  };

  const loadProjects = async () => {
    try {
      const projectsData = await projectService.getAllProjects();
      setProjects(projectsData);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error('Failed to load projects');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const invitationData: CreateInvitationData = {
        email: formData.email
      };

      if (isProjectInvite) {
        if (!formData.projectRoleId) {
          toast.error('Please select a project role');
          return;
        }
        invitationData.projectId = Number(formData.projectId || projectId);
        invitationData.projectRoleId = Number(formData.projectRoleId);
      } else {
        if (!formData.roleId) {
          toast.error('Please select a role');
          return;
        }
        invitationData.roleId = Number(formData.roleId);
      }

      await invitationService.createInvitation(invitationData);
      
      toast.success('Invitation sent successfully!');
      onInvitationSent();
      handleClose();
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      toast.error(error.response?.data?.error || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      email: '',
      roleId: '',
      projectId: projectId || '',
      projectRoleId: ''
    });
    setIsProjectInvite(!!projectId);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Invite User
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Mail className="w-4 h-4 inline mr-2" />
              Email Address
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="user@example.com"
            />
          </div>

          {/* Invitation Type Toggle */}
          {!projectId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Invitation Type
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={!isProjectInvite}
                    onChange={() => setIsProjectInvite(false)}
                    className="mr-2"
                  />
                  <User className="w-4 h-4 mr-1" />
                  System User
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={isProjectInvite}
                    onChange={() => setIsProjectInvite(true)}
                    className="mr-2"
                  />
                  <FolderOpen className="w-4 h-4 mr-1" />
                  Project Member
                </label>
              </div>
            </div>
          )}

          {/* System Role (for system invitations) */}
          {!isProjectInvite && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Shield className="w-4 h-4 inline mr-2" />
                System Role
              </label>
              <select
                required
                value={formData.roleId}
                onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select a role</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.key} - {role.description}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Project and Project Role (for project invitations) */}
          {isProjectInvite && (
            <>
              {!projectId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <FolderOpen className="w-4 h-4 inline mr-2" />
                    Project
                  </label>
                  <select
                    required
                    value={formData.projectId}
                    onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select a project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Shield className="w-4 h-4 inline mr-2" />
                  Project Role
                </label>
                <select
                  required
                  value={formData.projectRoleId}
                  onChange={(e) => setFormData({ ...formData, projectRoleId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select a project role</option>
                  {projectRoles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.key} - {role.description}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Sending...' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserInvitationModal;
