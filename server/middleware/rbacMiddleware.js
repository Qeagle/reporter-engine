import DatabaseService from '../services/DatabaseService.js';

class RBACMiddleware {
  constructor() {
    this.db = new DatabaseService();
  }

  // Check if user has a specific permission
  requirePermission(permission) {
    return (req, res, next) => {
      try {
        const userId = req.user?.userId;
        
        if (!userId) {
          return res.status(401).json({
            success: false,
            error: 'Authentication required'
          });
        }

        const hasPermission = this.db.userHasPermission(userId, permission);
        
        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            error: `Insufficient permissions. Required: ${permission}`
          });
        }

        next();
      } catch (error) {
        console.error('Permission check error:', error);
        res.status(500).json({
          success: false,
          error: 'Permission check failed'
        });
      }
    };
  }

  // Check if user has permission for a specific project
  requireProjectPermission(permission) {
    return (req, res, next) => {
      try {
        const userId = req.user?.userId;
        
        if (!userId) {
          return res.status(401).json({
            success: false,
            error: 'Authentication required'
          });
        }

        // Extract project ID from request params or body
        const projectId = req.params.projectId || req.body.projectId;
        
        if (!projectId) {
          return res.status(400).json({
            success: false,
            error: 'Project ID is required'
          });
        }

        // Find project by ID or key
        const project = this.db.findProjectById(projectId) || this.db.findProjectByKey(projectId);
        
        if (!project) {
          return res.status(404).json({
            success: false,
            error: 'Project not found'
          });
        }

        const hasPermission = this.db.userHasProjectPermission(userId, project.id, permission);
        
        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            error: `Insufficient permissions for project. Required: ${permission}`
          });
        }

        // Store project info in request for later use
        req.project = project;
        next();
      } catch (error) {
        console.error('Project permission check error:', error);
        res.status(500).json({
          success: false,
          error: 'Permission check failed'
        });
      }
    };
  }

  // Check if user has any of the specified roles in any project
  requireRole(roles) {
    return (req, res, next) => {
      try {
        const userId = req.user?.userId;
        
        if (!userId) {
          return res.status(401).json({
            success: false,
            error: 'Authentication required'
          });
        }

        const userProjects = this.db.getUserProjects(userId);
        const userRoles = userProjects.map(p => p.role_key);
        
        const hasRole = roles.some(role => userRoles.includes(role));
        
        if (!hasRole) {
          return res.status(403).json({
            success: false,
            error: `Insufficient role. Required one of: ${roles.join(', ')}`
          });
        }

        next();
      } catch (error) {
        console.error('Role check error:', error);
        res.status(500).json({
          success: false,
          error: 'Role check failed'
        });
      }
    };
  }

  // Filter data based on user's project access
  filterByProjectAccess() {
    return (req, res, next) => {
      try {
        const userId = req.user?.userId;
        
        if (!userId) {
          // If no user, allow but don't add filter
          return next();
        }

        const userProjects = this.db.getUserProjects(userId);
        const accessibleProjectIds = userProjects.map(p => p.id);
        
        // Store accessible project IDs in request
        req.accessibleProjectIds = accessibleProjectIds;
        next();
      } catch (error) {
        console.error('Project access filter error:', error);
        res.status(500).json({
          success: false,
          error: 'Access filter failed'
        });
      }
    };
  }

  // Check if user is a superadmin (has system-level permissions)
  requireSuperAdmin() {
    return (req, res, next) => {
      try {
        const userId = req.user?.userId;
        
        if (!userId) {
          return res.status(401).json({
            success: false,
            error: 'Authentication required'
          });
        }

        const hasSystemAdmin = this.db.userHasPermission(userId, 'system.admin');
        
        if (!hasSystemAdmin) {
          return res.status(403).json({
            success: false,
            error: 'Superadmin access required'
          });
        }

        next();
      } catch (error) {
        console.error('Superadmin check error:', error);
        res.status(500).json({
          success: false,
          error: 'Access check failed'
        });
      }
    };
  }

  // Check if user can manage other users
  requireUserManagement() {
    return this.requirePermission('user.manage');
  }

  // Get user permissions and add to request
  addUserPermissions() {
    return (req, res, next) => {
      try {
        const userId = req.user?.userId;
        
        if (!userId) {
          return next();
        }

        // Get all user permissions across all projects
        const permissions = this.db.db.prepare(`
          SELECT DISTINCT p.key
          FROM permissions p
          JOIN role_permissions rp ON p.id = rp.permission_id
          JOIN project_members pm ON rp.role_id = pm.role_id
          WHERE pm.user_id = ?
        `).all(userId);

        req.userPermissions = permissions.map(p => p.key);
        next();
      } catch (error) {
        console.error('Error adding user permissions:', error);
        next(); // Continue without permissions
      }
    };
  }

  // Utility method to check if request has specific permission
  hasPermission(req, permission) {
    return req.userPermissions && req.userPermissions.includes(permission);
  }

  // Utility method to check if user can access project
  canAccessProject(req, projectId) {
    return req.accessibleProjectIds && req.accessibleProjectIds.includes(projectId);
  }
}

// Create singleton instance
const rbacMiddleware = new RBACMiddleware();

// Export middleware functions
export const requirePermission = rbacMiddleware.requirePermission.bind(rbacMiddleware);
export const requireProjectPermission = rbacMiddleware.requireProjectPermission.bind(rbacMiddleware);
export const requireRole = rbacMiddleware.requireRole.bind(rbacMiddleware);
export const filterByProjectAccess = rbacMiddleware.filterByProjectAccess.bind(rbacMiddleware);
export const requireSuperAdmin = rbacMiddleware.requireSuperAdmin.bind(rbacMiddleware);
export const requireUserManagement = rbacMiddleware.requireUserManagement.bind(rbacMiddleware);
export const addUserPermissions = rbacMiddleware.addUserPermissions.bind(rbacMiddleware);

export default rbacMiddleware;
