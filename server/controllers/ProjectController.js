import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ProjectController {
  constructor() {
    this.projectsFile = path.join(__dirname, '../data/projects.json');
    this.ensureProjectsFile();
  }

  ensureProjectsFile() {
    if (!fs.existsSync(this.projectsFile)) {
      const defaultProjects = [
        {
          id: 'playwright-salesforce-default',
          name: 'Salesforce Playwright Tests',
          description: 'Automated testing suite for Salesforce CRM platform using Playwright framework',
          type: 'playwright',
          status: 'active',
          createdAt: new Date().toISOString(),
          settings: {
            retentionDays: 30,
            autoCleanup: true,
            notifications: true
          }
        }
      ];
      fs.writeFileSync(this.projectsFile, JSON.stringify(defaultProjects, null, 2));
    }
  }

  getAllProjects(req, res) {
    try {
      const projects = JSON.parse(fs.readFileSync(this.projectsFile, 'utf8'));
      const { status, type } = req.query;
      
      let filteredProjects = projects;
      
      if (status) {
        filteredProjects = filteredProjects.filter(p => p.status === status);
      }
      
      if (type) {
        filteredProjects = filteredProjects.filter(p => p.type === type);
      }

      res.json(filteredProjects);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch projects',
        details: error.message
      });
    }
  }

  getProjectById(req, res) {
    try {
      const { projectId } = req.params;
      const projects = JSON.parse(fs.readFileSync(this.projectsFile, 'utf8'));
      const project = projects.find(p => p.id === projectId);

      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      res.json(project);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch project',
        details: error.message
      });
    }
  }

  createProject(req, res) {
    try {
      const { name, description, type, status, settings } = req.body;
      
      if (!name || !description || !type) {
        return res.status(400).json({
          success: false,
          error: 'Name, description, and type are required'
        });
      }

      const projects = JSON.parse(fs.readFileSync(this.projectsFile, 'utf8'));
      
      const newProject = {
        id: uuidv4(),
        name,
        description,
        type,
        status: status || 'active',
        createdAt: new Date().toISOString(),
        settings: settings || {
          retentionDays: 30,
          autoCleanup: true,
          notifications: true
        }
      };

      projects.push(newProject);
      fs.writeFileSync(this.projectsFile, JSON.stringify(projects, null, 2));

      res.status(201).json(newProject);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to create project',
        details: error.message
      });
    }
  }

  updateProject(req, res) {
    try {
      const { projectId } = req.params;
      const updates = req.body;

      const projects = JSON.parse(fs.readFileSync(this.projectsFile, 'utf8'));
      const projectIndex = projects.findIndex(p => p.id === projectId);

      if (projectIndex === -1) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      projects[projectIndex] = { ...projects[projectIndex], ...updates };
      fs.writeFileSync(this.projectsFile, JSON.stringify(projects, null, 2));

      res.json(projects[projectIndex]);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to update project',
        details: error.message
      });
    }
  }

  deleteProject(req, res) {
    try {
      const { projectId } = req.params;
      const projects = JSON.parse(fs.readFileSync(this.projectsFile, 'utf8'));
      const filteredProjects = projects.filter(p => p.id !== projectId);

      if (filteredProjects.length === projects.length) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      fs.writeFileSync(this.projectsFile, JSON.stringify(filteredProjects, null, 2));

      res.json({
        success: true,
        message: 'Project deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to delete project',
        details: error.message
      });
    }
  }

  getProjectStats(req, res) {
    try {
      const projects = JSON.parse(fs.readFileSync(this.projectsFile, 'utf8'));
      const stats = {};

      // For each project, you could calculate stats like total reports, test counts, etc.
      // For now, return basic counts
      projects.forEach(project => {
        stats[project.id] = {
          totalReports: 0, // Could be calculated from actual reports
          totalTests: 0,
          lastActivity: project.createdAt
        };
      });

      res.json(stats);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get project stats',
        details: error.message
      });
    }
  }
}

export default new ProjectController();
