import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ReportMigration {
  constructor() {
    this.reportsDir = path.join(__dirname, '../data/reports');
    this.defaultProjectId = 'playwright-salesforce-default';
    this.defaultProjectName = 'Salesforce Playwright Tests';
    this.defaultProjectType = 'playwright';
  }

  async migrateAllReports() {
    console.log('🚀 Starting migration of existing reports to new project structure...');
    
    try {
      const reportFiles = fs.readdirSync(this.reportsDir).filter(file => file.endsWith('.json'));
      console.log(`📊 Found ${reportFiles.length} reports to migrate`);

      let migratedCount = 0;
      let alreadyMigratedCount = 0;

      for (const fileName of reportFiles) {
        const filePath = path.join(this.reportsDir, fileName);
        const report = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        // Check if already migrated
        if (report.projectId) {
          alreadyMigratedCount++;
          console.log(`⏭️  Report ${report.id} already has project mapping`);
          continue;
        }

        // Add project information based on existing report content
        const projectInfo = this.determineProjectFromReport(report);
        
        report.projectId = projectInfo.projectId;
        report.projectName = projectInfo.projectName;
        report.projectType = projectInfo.projectType;

        // Save the updated report
        fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
        migratedCount++;
        
        console.log(`✅ Migrated report: ${report.testSuite} (${report.id}) → ${projectInfo.projectName}`);
      }

      console.log(`\n🎉 Migration completed!`);
      console.log(`   ✅ Migrated: ${migratedCount} reports`);
      console.log(`   ⏭️  Already migrated: ${alreadyMigratedCount} reports`);
      console.log(`   📊 Total reports: ${reportFiles.length}`);

      // Generate migration summary
      this.generateMigrationSummary(reportFiles.length, migratedCount, alreadyMigratedCount);

    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  determineProjectFromReport(report) {
    // Check test suite name and tags to determine project mapping
    const testSuite = report.testSuite?.toLowerCase() || '';
    const tags = report.tags || [];
    const framework = report.framework?.toLowerCase() || '';

    // All existing reports appear to be Salesforce-related based on the sample data
    if (testSuite.includes('salesforce') || 
        tags.includes('salesforce') || 
        testSuite.includes('login') ||
        testSuite.includes('lead') ||
        framework.includes('playwright')) {
      
      return {
        projectId: this.defaultProjectId,
        projectName: this.defaultProjectName,
        projectType: this.defaultProjectType
      };
    }

    // Default fallback (all current reports should match the above conditions)
    return {
      projectId: this.defaultProjectId,
      projectName: this.defaultProjectName,
      projectType: this.defaultProjectType
    };
  }

  generateMigrationSummary(total, migrated, alreadyMigrated) {
    const summary = {
      timestamp: new Date().toISOString(),
      migration: {
        totalReports: total,
        migratedReports: migrated,
        alreadyMigratedReports: alreadyMigrated,
        projectMapping: {
          [this.defaultProjectId]: {
            projectName: this.defaultProjectName,
            projectType: this.defaultProjectType,
            reportCount: migrated
          }
        }
      }
    };

    const summaryPath = path.join(__dirname, '../data/migration-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`📄 Migration summary saved to: ${summaryPath}`);
  }

  async verifyMigration() {
    console.log('\n🔍 Verifying migration...');
    
    const reportFiles = fs.readdirSync(this.reportsDir).filter(file => file.endsWith('.json'));
    let migratedCount = 0;
    let unmatchedCount = 0;

    for (const fileName of reportFiles) {
      const filePath = path.join(this.reportsDir, fileName);
      const report = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      if (report.projectId && report.projectName) {
        migratedCount++;
      } else {
        unmatchedCount++;
        console.log(`⚠️  Report ${report.id} missing project information`);
      }
    }

    console.log(`\n📊 Migration Verification Results:`);
    console.log(`   ✅ Reports with project info: ${migratedCount}`);
    console.log(`   ❌ Reports missing project info: ${unmatchedCount}`);
    console.log(`   📊 Total reports: ${reportFiles.length}`);

    return unmatchedCount === 0;
  }
}

// Run migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const migration = new ReportMigration();
  
  migration.migrateAllReports()
    .then(() => migration.verifyMigration())
    .then((success) => {
      if (success) {
        console.log('\n🎉 All reports successfully migrated to project structure!');
        process.exit(0);
      } else {
        console.log('\n❌ Migration completed with some issues. Please check the logs.');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n💥 Migration failed:', error);
      process.exit(1);
    });
}

export default ReportMigration;
