#!/usr/bin/env node

import argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import DatabaseService from './services/DatabaseService.js';

class ReporterCLI {
  constructor() {
    this.db = new DatabaseService();
  }

  async createUser(email, password, name, role = 'VIEWER') {
    try {
      // Check if user already exists
      const existingUser = this.db.findUserByEmail(email);
      if (existingUser) {
        console.log(`❌ User with email ${email} already exists`);
        return false;
      }

      // Hash password
      const passwordHash = await argon2.hash(password);

      // Create user
      const userData = {
        email,
        password_hash: passwordHash,
        name: name || email.split('@')[0],
        is_active: 1
      };

      const user = this.db.createUser(userData);
      console.log(`✅ User created successfully:`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.name}`);

      return user;
    } catch (error) {
      console.error(`❌ Failed to create user:`, error.message);
      return false;
    }
  }

  async addUserToProject(email, projectKey, roleKey = 'VIEWER') {
    try {
      const user = this.db.findUserByEmail(email);
      if (!user) {
        console.log(`❌ User with email ${email} not found`);
        return false;
      }

      const project = this.db.findProjectByKey(projectKey);
      if (!project) {
        console.log(`❌ Project with key ${projectKey} not found`);
        return false;
      }

      const role = this.db.findRoleByKey(roleKey);
      if (!role || role.scope !== 'project') {
        console.log(`❌ Invalid project role ${roleKey}`);
        return false;
      }

      this.db.addProjectMember(project.id, user.id, role.id);
      console.log(`✅ Added ${user.email} to project ${project.name} as ${roleKey}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to add user to project:`, error.message);
      return false;
    }
  }

  async createApiKey(email, name, scopes = ['test.read', 'test.write']) {
    try {
      const user = this.db.findUserByEmail(email);
      if (!user) {
        console.log(`❌ User with email ${email} not found`);
        return false;
      }

      // Generate API key
      const apiKey = crypto.randomBytes(32).toString('hex');
      const keyHash = await argon2.hash(apiKey);

      // Store API key
      const apiKeyData = {
        user_id: user.id,
        name,
        key_hash: keyHash,
        scopes: JSON.stringify(scopes),
        created_at: new Date().toISOString(),
        last_used_at: null
      };

      const stmt = this.db.db.prepare(`
        INSERT INTO api_keys (user_id, name, key_hash, scopes, created_at, last_used_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        apiKeyData.user_id,
        apiKeyData.name,
        apiKeyData.key_hash,
        apiKeyData.scopes,
        apiKeyData.created_at,
        apiKeyData.last_used_at
      );

      console.log(`✅ API Key created successfully:`);
      console.log(`   Key ID: ${result.lastInsertRowid}`);
      console.log(`   Name: ${name}`);
      console.log(`   User: ${user.email}`);
      console.log(`   Scopes: ${scopes.join(', ')}`);
      console.log(`   🔑 API Key: ${apiKey}`);
      console.log(`   ⚠️  Save this key securely - it won't be shown again!`);

      return { id: result.lastInsertRowid, key: apiKey };
    } catch (error) {
      console.error(`❌ Failed to create API key:`, error.message);
      return false;
    }
  }

  listUsers() {
    try {
      const users = this.db.db.prepare(`
        SELECT u.*, COUNT(pm.project_id) as project_count
        FROM users u
        LEFT JOIN project_members pm ON u.id = pm.user_id
        GROUP BY u.id
        ORDER BY u.created_at DESC
      `).all();

      console.log(`📋 Users (${users.length}):`);
      console.log(`${'ID'.padEnd(5)} ${'Email'.padEnd(30)} ${'Name'.padEnd(20)} ${'Active'.padEnd(8)} ${'Projects'.padEnd(10)} ${'Created'}`);
      console.log('-'.repeat(90));

      users.forEach(user => {
        console.log(
          `${user.id.toString().padEnd(5)} ` +
          `${user.email.padEnd(30)} ` +
          `${(user.name || '').padEnd(20)} ` +
          `${(user.is_active ? 'Yes' : 'No').padEnd(8)} ` +
          `${user.project_count.toString().padEnd(10)} ` +
          `${user.created_at}`
        );
      });
    } catch (error) {
      console.error(`❌ Failed to list users:`, error.message);
    }
  }

  listProjects() {
    try {
      const projects = this.db.db.prepare(`
        SELECT p.*, COUNT(pm.user_id) as member_count, COUNT(tr.id) as test_run_count
        FROM projects p
        LEFT JOIN project_members pm ON p.id = pm.project_id
        LEFT JOIN test_runs tr ON p.id = tr.project_id
        GROUP BY p.id
        ORDER BY p.created_at DESC
      `).all();

      console.log(`📋 Projects (${projects.length}):`);
      console.log(`${'ID'.padEnd(5)} ${'Key'.padEnd(25)} ${'Name'.padEnd(30)} ${'Type'.padEnd(12)} ${'Members'.padEnd(8)} ${'Runs'.padEnd(8)} ${'Status'}`);
      console.log('-'.repeat(100));

      projects.forEach(project => {
        console.log(
          `${project.id.toString().padEnd(5)} ` +
          `${project.key.padEnd(25)} ` +
          `${project.name.padEnd(30)} ` +
          `${(project.type || '').padEnd(12)} ` +
          `${project.member_count.toString().padEnd(8)} ` +
          `${project.test_run_count.toString().padEnd(8)} ` +
          `${project.status}`
        );
      });
    } catch (error) {
      console.error(`❌ Failed to list projects:`, error.message);
    }
  }

  listRoles() {
    try {
      const roles = this.db.getAllRoles();

      console.log(`📋 Available Roles (${roles.length}):`);
      console.log(`${'ID'.padEnd(5)} ${'Key'.padEnd(15)} ${'Scope'.padEnd(10)} ${'Description'}`);
      console.log('-'.repeat(60));

      roles.forEach(role => {
        console.log(
          `${role.id.toString().padEnd(5)} ` +
          `${role.key.padEnd(15)} ` +
          `${role.scope.padEnd(10)} ` +
          `${role.description || ''}`
        );
      });
    } catch (error) {
      console.error(`❌ Failed to list roles:`, error.message);
    }
  }

  showStats() {
    try {
      const stats = {
        users: this.db.db.prepare('SELECT COUNT(*) as count FROM users').get().count,
        projects: this.db.db.prepare('SELECT COUNT(*) as count FROM projects').get().count,
        testRuns: this.db.db.prepare('SELECT COUNT(*) as count FROM test_runs').get().count,
        testCases: this.db.db.prepare('SELECT COUNT(*) as count FROM test_cases').get().count,
        apiKeys: this.db.db.prepare('SELECT COUNT(*) as count FROM api_keys').get().count
      };

      console.log(`📊 Reporter Engine Statistics:`);
      console.log(`   Users: ${stats.users}`);
      console.log(`   Projects: ${stats.projects}`);
      console.log(`   Test Runs: ${stats.testRuns}`);
      console.log(`   Test Cases: ${stats.testCases}`);
      console.log(`   API Keys: ${stats.apiKeys}`);
    } catch (error) {
      console.error(`❌ Failed to get statistics:`, error.message);
    }
  }

  showHelp() {
    console.log(`
🚀 Reporter Engine CLI v2.0

Usage: node cli.js <command> [options]

Commands:
  create-user <email> <password> [name] [role]  Create a new user
  add-to-project <email> <projectKey> [role]    Add user to project
  create-api-key <email> <name> [scopes...]     Create API key for user
  list-users                                    List all users
  list-projects                                 List all projects
  list-roles                                    List available roles
  stats                                         Show database statistics
  help                                          Show this help

Examples:
  node cli.js create-user john@example.com password123 "John Doe"
  node cli.js add-to-project john@example.com WEB MAINTAINER
  node cli.js create-api-key john@example.com "CI Pipeline" test.read test.write
  node cli.js list-users
  node cli.js stats

Role Types:
  System: SUPERADMIN
  Project: OWNER, MAINTAINER, ANALYST, VIEWER
`);
  }

  async run() {
    const args = process.argv.slice(2);
    const command = args[0];

    try {
      switch (command) {
        case 'create-user':
          if (args.length < 3) {
            console.log('❌ Usage: create-user <email> <password> [name] [role]');
            return;
          }
          await this.createUser(args[1], args[2], args[3], args[4]);
          break;

        case 'add-to-project':
          if (args.length < 3) {
            console.log('❌ Usage: add-to-project <email> <projectKey> [role]');
            return;
          }
          await this.addUserToProject(args[1], args[2], args[3] || 'VIEWER');
          break;

        case 'create-api-key':
          if (args.length < 3) {
            console.log('❌ Usage: create-api-key <email> <name> [scopes...]');
            return;
          }
          const scopes = args.slice(3).length > 0 ? args.slice(3) : ['test.read', 'test.write'];
          await this.createApiKey(args[1], args[2], scopes);
          break;

        case 'list-users':
          this.listUsers();
          break;

        case 'list-projects':
          this.listProjects();
          break;

        case 'list-roles':
          this.listRoles();
          break;

        case 'stats':
          this.showStats();
          break;

        case 'help':
        default:
          this.showHelp();
          break;
      }
    } catch (error) {
      console.error('❌ Command failed:', error.message);
    } finally {
      this.db.close();
    }
  }
}

// Run CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new ReporterCLI();
  cli.run();
}

export default ReporterCLI;
