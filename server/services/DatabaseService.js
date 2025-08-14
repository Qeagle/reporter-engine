import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DatabaseService {
  constructor() {
    this.dbPath = path.join(__dirname, '../data/database.sqlite');
    this.schemaPath = path.join(__dirname, '../database/schema.sql');
    this.seedsPath = path.join(__dirname, '../database/seeds.sql');
    
    // Ensure database directory exists
    const dbDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    this.db = new Database(this.dbPath);
    this.init();
  }

  init() {
    // Enable WAL mode and foreign keys
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    
    // Check if database is already initialized
    const tableExists = this.db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='users'
    `).get();
    
    if (!tableExists) {
      console.log('🗄️  Initializing database...');
      this.createTables();
      this.seedDatabase();
      console.log('✅ Database initialized successfully');
    }
  }

  createTables() {
    // Execute schema directly as one block
    const schema = fs.readFileSync(this.schemaPath, 'utf8');
    this.db.exec(schema);
  }

  seedDatabase() {
    if (fs.existsSync(this.seedsPath)) {
      const seeds = fs.readFileSync(this.seedsPath, 'utf8');
      this.db.exec(seeds);
    }
  }

  // User operations
  createUser(userData) {
    const stmt = this.db.prepare(`
      INSERT INTO users (email, password_hash, name, is_active)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(userData.email, userData.password_hash, userData.name, userData.is_active ?? 1);
    return { id: result.lastInsertRowid, ...userData };
  }

  findUserByEmail(email) {
    const stmt = this.db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email);
  }

  findUserById(id) {
    const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id);
  }

  updateUser(id, userData) {
    const fields = Object.keys(userData).map(key => `${key} = ?`).join(', ');
    const values = Object.values(userData);
    const stmt = this.db.prepare(`UPDATE users SET ${fields} WHERE id = ?`);
    stmt.run(...values, id);
    return this.findUserById(id);
  }

  getAllUsers() {
    const stmt = this.db.prepare('SELECT * FROM users ORDER BY created_at DESC');
    return stmt.all();
  }

  // Role operations
  createRole(roleData) {
    const stmt = this.db.prepare(`
      INSERT INTO roles (key, scope, description)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(roleData.key, roleData.scope, roleData.description);
    return { id: result.lastInsertRowid, ...roleData };
  }

  findRoleByKey(key) {
    const stmt = this.db.prepare('SELECT * FROM roles WHERE key = ?');
    return stmt.get(key);
  }

  getAllRoles() {
    const stmt = this.db.prepare('SELECT * FROM roles');
    return stmt.all();
  }

  // Permission operations
  createPermission(permissionData) {
    const stmt = this.db.prepare(`
      INSERT INTO permissions (key, description)
      VALUES (?, ?)
    `);
    const result = stmt.run(permissionData.key, permissionData.description);
    return { id: result.lastInsertRowid, ...permissionData };
  }

  assignPermissionToRole(roleId, permissionId) {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
      VALUES (?, ?)
    `);
    stmt.run(roleId, permissionId);
  }

  getRolePermissions(roleId) {
    const stmt = this.db.prepare(`
      SELECT p.* FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = ?
    `);
    return stmt.all(roleId);
  }

  // Project operations
  createProject(projectData) {
    const stmt = this.db.prepare(`
      INSERT INTO projects (key, name, description, type, status, visibility, settings)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      projectData.key, 
      projectData.name, 
      projectData.description,
      projectData.type,
      projectData.status || 'active',
      projectData.visibility || 'private',
      JSON.stringify(projectData.settings || {})
    );
    return { id: result.lastInsertRowid, ...projectData };
  }

  findProjectByKey(key) {
    const stmt = this.db.prepare('SELECT * FROM projects WHERE key = ?');
    const project = stmt.get(key);
    if (project && project.settings) {
      project.settings = JSON.parse(project.settings);
    }
    return project;
  }

  findProjectById(id) {
    const stmt = this.db.prepare('SELECT * FROM projects WHERE id = ?');
    const project = stmt.get(id);
    if (project && project.settings) {
      project.settings = JSON.parse(project.settings);
    }
    return project;
  }

  getAllProjects() {
    const stmt = this.db.prepare('SELECT * FROM projects ORDER BY created_at DESC');
    const projects = stmt.all();
    return projects.map(project => {
      if (project.settings) {
        project.settings = JSON.parse(project.settings);
      }
      return project;
    });
  }

  updateProject(id, projectData) {
    const fields = [];
    const values = [];
    
    Object.keys(projectData).forEach(key => {
      if (key === 'settings') {
        fields.push(`${key} = ?`);
        values.push(JSON.stringify(projectData[key]));
      } else {
        fields.push(`${key} = ?`);
        values.push(projectData[key]);
      }
    });
    
    const stmt = this.db.prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values, id);
    return this.findProjectById(id);
  }

  deleteProject(id) {
    const stmt = this.db.prepare('DELETE FROM projects WHERE id = ?');
    return stmt.run(id);
  }

  // Project membership operations
  addProjectMember(projectId, userId, roleId) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO project_members (project_id, user_id, role_id)
      VALUES (?, ?, ?)
    `);
    stmt.run(projectId, userId, roleId);
  }

  getProjectMembers(projectId) {
    const stmt = this.db.prepare(`
      SELECT u.*, r.key as role_key, r.description as role_description
      FROM users u
      JOIN project_members pm ON u.id = pm.user_id
      JOIN roles r ON pm.role_id = r.id
      WHERE pm.project_id = ?
    `);
    return stmt.all(projectId);
  }

  getUserProjects(userId) {
    const stmt = this.db.prepare(`
      SELECT p.*, r.key as role_key, r.description as role_description
      FROM projects p
      JOIN project_members pm ON p.id = pm.project_id
      JOIN roles r ON pm.role_id = r.id
      WHERE pm.user_id = ?
    `);
    const projects = stmt.all(userId);
    return projects.map(project => {
      if (project.settings) {
        project.settings = JSON.parse(project.settings);
      }
      return project;
    });
  }

  // Test run operations
  createTestRun(testRunData) {
    const stmt = this.db.prepare(`
      INSERT INTO test_runs (
        project_id, run_key, triggered_by, test_suite, environment, framework,
        tags, metadata, status, branch, commit_sha, ci_url, started_at, 
        finished_at, summary
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      testRunData.project_id,
      testRunData.run_key,
      testRunData.triggered_by,
      testRunData.test_suite,
      testRunData.environment,
      testRunData.framework,
      JSON.stringify(testRunData.tags || []),
      JSON.stringify(testRunData.metadata || {}),
      testRunData.status,
      testRunData.branch,
      testRunData.commit_sha,
      testRunData.ci_url,
      testRunData.started_at,
      testRunData.finished_at,
      JSON.stringify(testRunData.summary || {})
    );
    
    return { id: result.lastInsertRowid, ...testRunData };
  }

  findTestRunById(id) {
    const stmt = this.db.prepare('SELECT * FROM test_runs WHERE id = ?');
    const testRun = stmt.get(id);
    if (testRun) {
      testRun.tags = JSON.parse(testRun.tags || '[]');
      testRun.metadata = JSON.parse(testRun.metadata || '{}');
      testRun.summary = JSON.parse(testRun.summary || '{}');
    }
    return testRun;
  }

  getTestRunsByProject(projectId, limit = 50, offset = 0) {
    const stmt = this.db.prepare(`
      SELECT * FROM test_runs 
      WHERE project_id = ? 
      ORDER BY started_at DESC 
      LIMIT ? OFFSET ?
    `);
    const testRuns = stmt.all(projectId, limit, offset);
    return testRuns.map(testRun => {
      testRun.tags = JSON.parse(testRun.tags || '[]');
      testRun.metadata = JSON.parse(testRun.metadata || '{}');
      testRun.summary = JSON.parse(testRun.summary || '{}');
      return testRun;
    });
  }

  updateTestRun(id, testRunData) {
    const fields = [];
    const values = [];
    
    Object.keys(testRunData).forEach(key => {
      if (['tags', 'metadata', 'summary'].includes(key)) {
        fields.push(`${key} = ?`);
        values.push(JSON.stringify(testRunData[key]));
      } else {
        fields.push(`${key} = ?`);
        values.push(testRunData[key]);
      }
    });
    
    const stmt = this.db.prepare(`UPDATE test_runs SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values, id);
    return this.findTestRunById(id);
  }

  // Test case operations
  createTestCase(testCaseData) {
    const stmt = this.db.prepare(`
      INSERT INTO test_cases (
        test_run_id, suite, name, status, duration, start_time, end_time,
        error_message, stack_trace, annotations, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      testCaseData.test_run_id,
      testCaseData.suite,
      testCaseData.name,
      testCaseData.status,
      testCaseData.duration,
      testCaseData.start_time,
      testCaseData.end_time,
      testCaseData.error_message,
      testCaseData.stack_trace,
      JSON.stringify(testCaseData.annotations || []),
      JSON.stringify(testCaseData.metadata || {})
    );
    
    return { id: result.lastInsertRowid, ...testCaseData };
  }

  getTestCasesByRun(testRunId) {
    const stmt = this.db.prepare('SELECT * FROM test_cases WHERE test_run_id = ?');
    const testCases = stmt.all(testRunId);
    return testCases.map(testCase => {
      testCase.annotations = JSON.parse(testCase.annotations || '[]');
      testCase.metadata = JSON.parse(testCase.metadata || '{}');
      return testCase;
    });
  }

  // Test step operations
  createTestStep(testStepData) {
    const stmt = this.db.prepare(`
      INSERT INTO test_steps (test_case_id, step_order, name, status, duration, error, category)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      testStepData.test_case_id,
      testStepData.step_order,
      testStepData.name,
      testStepData.status,
      testStepData.duration,
      testStepData.error,
      testStepData.category
    );
    
    return { id: result.lastInsertRowid, ...testStepData };
  }

  getTestStepsByCase(testCaseId) {
    const stmt = this.db.prepare('SELECT * FROM test_steps WHERE test_case_id = ? ORDER BY step_order');
    return stmt.all(testCaseId);
  }

  // Test artifact operations
  createTestArtifact(artifactData) {
    const stmt = this.db.prepare(`
      INSERT INTO test_artifacts (test_case_id, artifact_id, type, filename, url, uploaded_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      artifactData.test_case_id,
      artifactData.artifact_id,
      artifactData.type,
      artifactData.filename,
      artifactData.url,
      artifactData.uploaded_at
    );
    
    return { id: result.lastInsertRowid, ...artifactData };
  }

  getTestArtifactsByCase(testCaseId) {
    const stmt = this.db.prepare('SELECT * FROM test_artifacts WHERE test_case_id = ?');
    return stmt.all(testCaseId);
  }

  // Permission checking utilities
  userHasPermission(userId, permissionKey) {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      JOIN project_members pm ON rp.role_id = pm.role_id
      WHERE pm.user_id = ? AND p.key = ?
    `);
    const result = stmt.get(userId, permissionKey);
    return result.count > 0;
  }

  userHasProjectPermission(userId, projectId, permissionKey) {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      JOIN project_members pm ON rp.role_id = pm.role_id
      WHERE pm.user_id = ? AND pm.project_id = ? AND p.key = ?
    `);
    const result = stmt.get(userId, projectId, permissionKey);
    return result.count > 0;
  }

  close() {
    this.db.close();
  }
}

export default DatabaseService;
