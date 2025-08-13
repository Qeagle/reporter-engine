import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import DatabaseService from '../services/DatabaseService.js';
import argon2 from 'argon2';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DataMigration {
  constructor() {
    this.db = new DatabaseService();
    this.dataDir = path.join(__dirname, '../data');
  }

  async migrateUsers() {
    const usersFile = path.join(this.dataDir, 'users.json');
    
    if (!fs.existsSync(usersFile)) {
      console.log('📋 No users.json found, skipping user migration');
      return;
    }

    const users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
    
    console.log(`🔄 Migrating ${users.length} users...`);
    
    for (const user of users) {
      try {
        // Check if user already exists
        const existingUser = this.db.findUserByEmail(user.email);
        
        if (!existingUser) {
          // Convert old user format to new format
          const userData = {
            email: user.email,
            password_hash: user.passwordHash, // Keep existing hash
            name: user.username, // Use username as name
            is_active: 1
          };
          
          const newUser = this.db.createUser(userData);
          console.log(`✅ Migrated user: ${user.email}`);
          
          // Add user to existing projects if any
          await this.assignUserToProjects(newUser.id);
        } else {
          console.log(`⏭️  User already exists: ${user.email}`);
        }
      } catch (error) {
        console.error(`❌ Failed to migrate user ${user.email}:`, error.message);
      }
    }
  }

  async assignUserToProjects(userId) {
    // Get all projects and assign admin user as OWNER
    const projects = this.db.getAllProjects();
    const ownerRole = this.db.findRoleByKey('OWNER');
    
    if (ownerRole) {
      for (const project of projects) {
        this.db.addProjectMember(project.id, userId, ownerRole.id);
      }
    }
  }

  async migrateProjects() {
    const projectsFile = path.join(this.dataDir, 'projects.json');
    
    if (!fs.existsSync(projectsFile)) {
      console.log('📋 No projects.json found, skipping project migration');
      return;
    }

    const projects = JSON.parse(fs.readFileSync(projectsFile, 'utf8'));
    
    console.log(`🔄 Migrating ${projects.length} projects...`);
    
    for (const project of projects) {
      try {
        // Check if project already exists
        const existingProject = this.db.findProjectByKey(project.id);
        
        if (!existingProject) {
          const projectData = {
            key: project.id,
            name: project.name,
            description: project.description,
            type: project.type,
            status: project.status,
            visibility: 'private',
            settings: project.settings
          };
          
          const newProject = this.db.createProject(projectData);
          console.log(`✅ Migrated project: ${project.name}`);
          
          // Assign admin user as owner
          const adminUser = this.db.findUserByEmail('admin@testreport.com');
          const ownerRole = this.db.findRoleByKey('OWNER');
          
          if (adminUser && ownerRole) {
            this.db.addProjectMember(newProject.id, adminUser.id, ownerRole.id);
          }
        } else {
          console.log(`⏭️  Project already exists: ${project.name}`);
        }
      } catch (error) {
        console.error(`❌ Failed to migrate project ${project.name}:`, error.message);
      }
    }
  }

  async migrateReports() {
    const reportsDir = path.join(this.dataDir, 'reports');
    
    if (!fs.existsSync(reportsDir)) {
      console.log('📋 No reports directory found, skipping report migration');
      return;
    }

    const reportFiles = fs.readdirSync(reportsDir).filter(file => file.endsWith('.json'));
    
    console.log(`🔄 Migrating ${reportFiles.length} reports...`);
    
    for (const reportFile of reportFiles) {
      try {
        const reportPath = path.join(reportsDir, reportFile);
        const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        
        // Find the project for this report
        const project = this.db.findProjectByKey(report.projectId);
        
        if (!project) {
          console.log(`⚠️  Project not found for report ${report.id}, skipping`);
          continue;
        }

        // Check if test run already exists
        const existingRun = this.db.db.prepare('SELECT id FROM test_runs WHERE run_key = ?').get(report.id);
        
        if (existingRun) {
          console.log(`⏭️  Report already migrated: ${report.id}`);
          continue;
        }

        // Create test run
        const testRunData = {
          project_id: project.id,
          run_key: report.id,
          triggered_by: null, // No user info in old reports
          test_suite: report.testSuite,
          environment: report.environment,
          framework: report.framework,
          tags: report.tags || [],
          metadata: report.metadata || {},
          status: report.status,
          branch: null,
          commit_sha: null,
          ci_url: null,
          started_at: report.startTime,
          finished_at: report.endTime,
          summary: report.summary || {}
        };

        const testRun = this.db.createTestRun(testRunData);
        console.log(`✅ Migrated test run: ${report.id}`);

        // Migrate test cases
        if (report.tests && Array.isArray(report.tests)) {
          for (let i = 0; i < report.tests.length; i++) {
            const test = report.tests[i];
            
            const testCaseData = {
              test_run_id: testRun.id,
              suite: null,
              name: test.name,
              status: test.status,
              duration: test.duration,
              start_time: test.startTime,
              end_time: test.endTime,
              error_message: test.errorMessage,
              stack_trace: test.stackTrace,
              annotations: test.annotations || [],
              metadata: test.metadata || {}
            };

            const testCase = this.db.createTestCase(testCaseData);

            // Migrate test steps
            if (test.steps && Array.isArray(test.steps)) {
              for (let j = 0; j < test.steps.length; j++) {
                const step = test.steps[j];
                
                const testStepData = {
                  test_case_id: testCase.id,
                  step_order: step.order || j + 1,
                  name: step.name,
                  status: step.status,
                  duration: step.duration,
                  error: step.error,
                  category: step.category
                };

                this.db.createTestStep(testStepData);
              }
            }

            // Migrate test artifacts
            if (test.artifacts && Array.isArray(test.artifacts)) {
              for (const artifact of test.artifacts) {
                const testArtifactData = {
                  test_case_id: testCase.id,
                  artifact_id: artifact.id,
                  type: artifact.type,
                  filename: artifact.filename,
                  url: artifact.url,
                  uploaded_at: artifact.uploadedAt
                };

                this.db.createTestArtifact(testArtifactData);
              }
            }
          }
        }

        console.log(`✅ Migrated ${report.tests?.length || 0} test cases for run ${report.id}`);
        
      } catch (error) {
        console.error(`❌ Failed to migrate report ${reportFile}:`, error.message);
      }
    }
  }

  async createBackup() {
    const backupDir = path.join(this.dataDir, 'backup');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
    }

    // Backup JSON files
    const filesToBackup = ['users.json', 'projects.json'];
    
    for (const file of filesToBackup) {
      const sourcePath = path.join(this.dataDir, file);
      
      if (fs.existsSync(sourcePath)) {
        const backupPath = path.join(backupDir, `${timestamp}-${file}`);
        fs.copyFileSync(sourcePath, backupPath);
        console.log(`📦 Backed up ${file} to ${backupPath}`);
      }
    }

    // Backup reports directory
    const reportsDir = path.join(this.dataDir, 'reports');
    if (fs.existsSync(reportsDir)) {
      const reportsBackupDir = path.join(backupDir, `${timestamp}-reports`);
      this.copyDirectory(reportsDir, reportsBackupDir);
      console.log(`📦 Backed up reports directory to ${reportsBackupDir}`);
    }
  }

  copyDirectory(src, dest) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        this.copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  async run() {
    console.log('🚀 Starting data migration...');
    
    try {
      // Create backup first
      await this.createBackup();
      
      // Run migrations
      await this.migrateUsers();
      await this.migrateProjects();
      await this.migrateReports();
      
      console.log('✅ Data migration completed successfully!');
      console.log('📊 Database statistics:');
      
      const stats = {
        users: this.db.db.prepare('SELECT COUNT(*) as count FROM users').get().count,
        projects: this.db.db.prepare('SELECT COUNT(*) as count FROM projects').get().count,
        test_runs: this.db.db.prepare('SELECT COUNT(*) as count FROM test_runs').get().count,
        test_cases: this.db.db.prepare('SELECT COUNT(*) as count FROM test_cases').get().count,
        test_steps: this.db.db.prepare('SELECT COUNT(*) as count FROM test_steps').get().count
      };
      
      console.log(`   Users: ${stats.users}`);
      console.log(`   Projects: ${stats.projects}`);
      console.log(`   Test Runs: ${stats.test_runs}`);
      console.log(`   Test Cases: ${stats.test_cases}`);
      console.log(`   Test Steps: ${stats.test_steps}`);
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    } finally {
      this.db.close();
    }
  }
}

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const migration = new DataMigration();
  migration.run().catch(console.error);
}

export default DataMigration;
