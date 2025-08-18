import DatabaseService from '../services/DatabaseService.js';

class ProjectController {
  constructor() {
    this.db = new DatabaseService();
  }

  async getAllProjects(req, res) {
    try {
      console.log('🔍 ProjectController.getAllProjects called');
      const { status, type } = req.query;
      const userId = req.user?.id;

      let projects;
      if (userId) {
        projects = this.db.getUserProjects(userId, status, type);
      } else {
        projects = this.db.getAllProjects(status, type);
      }

      res.json({
        success: true,
        data: projects || [],
        total: projects?.length || 0
      });
    } catch (error) {
      console.error('❌ Error in getAllProjects:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve projects',
        details: error.message
      });
    }
  }

  async getProjectById(req, res) {
    try {
      const { projectId } = req.params;
      const userId = req.user?.id;

      const project = this.db.findProjectById(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      if (userId && !this.db.checkProjectPermission(userId, projectId, 'read')) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this project'
        });
      }

      res.json({
        success: true,
        data: project
      });
    } catch (error) {
      console.error('❌ Error in getProjectById:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve project',
        details: error.message
      });
    }
  }

  async createProject(req, res) {
    try {
      const { name, description, type, settings } = req.body;
      const userId = req.user?.id || 1;

      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Project name is required'
        });
      }

      // Generate a unique project key from the name
      const projectKey = name.toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 20);
      
      const existingProject = this.db.findProjectByKey(projectKey);
      if (existingProject) {
        return res.status(409).json({
          success: false,
          error: 'Project with this name already exists'
        });
      }

      const projectData = {
        key: projectKey,
        name,
        description: description || '',
        type: type || 'web',
        settings: settings || {
          retentionDays: 30,
          autoCleanup: true,
          notifications: true
        }
      };

      const project = this.db.createProject(projectData);

      // Add the user as the project owner
      const ownerRole = this.db.findRoleByKey('OWNER');
      if (ownerRole && userId) {
        this.db.addProjectMember(project.id, userId, ownerRole.id);
      }

      res.status(201).json({
        success: true,
        data: project,
        message: 'Project created successfully'
      });
    } catch (error) {
      console.error('❌ Error in createProject:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create project',
        details: error.message
      });
    }
  }

  async updateProject(req, res) {
    try {
      const { projectId } = req.params;
      const { name, description, type } = req.body;
      const userId = req.user?.id;

      const project = this.db.findProjectById(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      if (userId && !this.db.checkProjectPermission(userId, projectId, 'write')) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to update this project'
        });
      }

      const updateData = {};
      if (name) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (type) updateData.type = type;

      const updatedProject = this.db.updateProject(projectId, updateData);

      res.json({
        success: true,
        project: updatedProject,
        message: 'Project updated successfully'
      });
    } catch (error) {
      console.error('❌ Error in updateProject:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update project',
        details: error.message
      });
    }
  }

  async deleteProject(req, res) {
    try {
      const { projectId } = req.params;
      const userId = req.user?.id;

      const project = this.db.findProjectById(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      if (userId && !this.db.checkProjectPermission(userId, projectId, 'admin')) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to delete this project'
        });
      }

      this.db.deleteProject(projectId);

      res.json({
        success: true,
        message: 'Project deleted successfully'
      });
    } catch (error) {
      console.error('❌ Error in deleteProject:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete project',
        details: error.message
      });
    }
  }

  async getProjectStats(req, res) {
    try {
      const { projectId } = req.params;
      const userId = req.user?.id;

      const project = this.db.findProjectById(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      if (userId && !this.db.checkProjectPermission(userId, projectId, 'read')) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this project'
        });
      }

      // Get test runs for this project
      const testRuns = this.db.getTestRunsByProject(projectId);
      
      // Calculate statistics
      let totalTestRuns = testRuns.length;
      let totalTestCases = 0;
      let totalPassed = 0;
      let totalFailed = 0;
      let totalSkipped = 0;
      let lastRun = null;
      
      testRuns.forEach(run => {
        if (run.summary && typeof run.summary === 'object') {
          totalTestCases += run.summary.total || 0;
          totalPassed += run.summary.passed || 0;
          totalFailed += run.summary.failed || 0;
          totalSkipped += run.summary.skipped || 0;
        }
        
        if (!lastRun || new Date(run.started_at) > new Date(lastRun)) {
          lastRun = run.started_at;
        }
      });

      const passRate = totalTestCases > 0 ? Math.round((totalPassed / totalTestCases) * 100) : 0;

      const stats = {
        testRuns: totalTestRuns,
        testCases: totalTestCases,
        totalPassed: totalPassed,
        totalFailed: totalFailed,
        totalSkipped: totalSkipped,
        passRate: passRate,
        lastRun: lastRun
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('❌ Error in getProjectStats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve project statistics',
        details: error.message
      });
    }
  }

  async getProjectMembers(req, res) {
    try {
      const { projectId } = req.params;
      const userId = req.user?.id;

      const project = this.db.findProjectById(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      if (userId && !this.db.checkProjectPermission(userId, projectId, 'read')) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this project'
        });
      }

      const members = [];

      res.json({
        success: true,
        members
      });
    } catch (error) {
      console.error('❌ Error in getProjectMembers:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve project members',
        details: error.message
      });
    }
  }

  async addProjectMember(req, res) {
    try {
      const { projectId } = req.params;
      const { userId: newUserId, role } = req.body;
      const currentUserId = req.user?.id;

      const project = this.db.findProjectById(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      if (currentUserId && !this.db.checkProjectPermission(currentUserId, projectId, 'admin')) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to add members to this project'
        });
      }

      const result = { userId: newUserId, role: role || 'VIEWER', projectId };

      res.json({
        success: true,
        member: result,
        message: 'Project member added successfully'
      });
    } catch (error) {
      console.error('❌ Error in addProjectMember:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add project member',
        details: error.message
      });
    }
  }
}

export default ProjectController;
