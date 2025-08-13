-- Insert default roles
INSERT INTO roles (key, scope, description) VALUES 
('SUPERADMIN', 'system', 'Full system administration access'),
('OWNER', 'project', 'Project owner with full access'),
('MAINTAINER', 'project', 'Project maintainer with write access'),
('ANALYST', 'project', 'Test analyst with read/write access to reports'),
('VIEWER', 'project', 'Read-only access to project reports');

-- Insert default permissions
INSERT INTO permissions (key, description) VALUES 
-- System permissions
('system.admin', 'Full system administration'),
('user.manage', 'Manage users and roles'),
-- Project permissions
('project.create', 'Create new projects'),
('project.read', 'View project details'),
('project.write', 'Edit project settings'),
('project.delete', 'Delete projects'),
('project.manage_members', 'Manage project members'),
-- Test permissions
('test.read', 'View test reports and results'),
('test.write', 'Upload and modify test reports'),
('test.delete', 'Delete test reports'),
-- Report permissions
('report.read', 'View test reports'),
('report.write', 'Create and modify reports'),
('report.delete', 'Delete reports'),
('report.export', 'Export reports');

-- Assign permissions to roles
-- SUPERADMIN gets all permissions
INSERT INTO role_permissions (role_id, permission_id) 
SELECT r.id, p.id FROM roles r, permissions p WHERE r.key = 'SUPERADMIN';

-- OWNER gets all project permissions
INSERT INTO role_permissions (role_id, permission_id) 
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.key = 'OWNER' AND p.key IN (
  'project.read', 'project.write', 'project.delete', 'project.manage_members',
  'test.read', 'test.write', 'test.delete',
  'report.read', 'report.write', 'report.delete', 'report.export'
);

-- MAINTAINER gets read/write permissions but not delete
INSERT INTO role_permissions (role_id, permission_id) 
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.key = 'MAINTAINER' AND p.key IN (
  'project.read', 'project.write',
  'test.read', 'test.write',
  'report.read', 'report.write', 'report.export'
);

-- ANALYST gets read/write access to tests and reports
INSERT INTO role_permissions (role_id, permission_id) 
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.key = 'ANALYST' AND p.key IN (
  'project.read',
  'test.read', 'test.write',
  'report.read', 'report.write', 'report.export'
);

-- VIEWER gets only read permissions
INSERT INTO role_permissions (role_id, permission_id) 
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.key = 'VIEWER' AND p.key IN (
  'project.read',
  'test.read',
  'report.read'
);

-- Insert default admin user (password: admin)
INSERT INTO users (email, password_hash, name, is_active) VALUES 
('admin@testreport.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewvKnOcIlUK.BnQS', 'System Administrator', 1);
