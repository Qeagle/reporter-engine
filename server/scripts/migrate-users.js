import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import DatabaseService from '../services/DatabaseService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class UserMigration {
  constructor() {
    this.db = new DatabaseService();
    this.usersJsonPath = path.join(__dirname, '../data/users.json');
  }

  async migrateUsers() {
    try {
      console.log('🔄 Starting user migration from JSON to database...');

      // Check if users.json exists
      if (!fs.existsSync(this.usersJsonPath)) {
        console.log('❌ users.json file not found');
        return;
      }

      // Read existing users from JSON
      const jsonData = fs.readFileSync(this.usersJsonPath, 'utf8');
      const users = JSON.parse(jsonData);

      if (!Array.isArray(users) || users.length === 0) {
        console.log('❌ No users found in JSON file');
        return;
      }

      console.log(`📋 Found ${users.length} users to migrate`);

      let migratedCount = 0;
      let skippedCount = 0;

      for (const user of users) {
        try {
          // Check if user already exists in database
          const existingUser = this.db.findUserByEmail(user.email);
          
          if (existingUser) {
            console.log(`⏭️  Skipping ${user.email} - already exists in database`);
            skippedCount++;
            continue;
          }

          // Map JSON fields to database fields
          const userData = {
            email: user.email,
            password_hash: user.passwordHash, // Already hashed
            name: user.firstName && user.lastName ? 
              `${user.firstName} ${user.lastName}` : 
              user.username || user.email.split('@')[0],
            is_active: user.isActive !== undefined ? (user.isActive ? 1 : 0) : 1
          };

          // Create user in database
          const newUser = this.db.createUser(userData);
          console.log(`✅ Migrated user: ${user.email} (ID: ${newUser.id})`);
          migratedCount++;

        } catch (error) {
          console.error(`❌ Error migrating user ${user.email}:`, error.message);
        }
      }

      console.log(`\n📊 Migration Summary:`);
      console.log(`   ✅ Migrated: ${migratedCount} users`);
      console.log(`   ⏭️  Skipped: ${skippedCount} users (already existed)`);
      console.log(`   📋 Total processed: ${users.length} users`);

      // Backup the JSON file
      const backupPath = this.usersJsonPath + '.backup-' + Date.now();
      fs.copyFileSync(this.usersJsonPath, backupPath);
      console.log(`\n💾 Original users.json backed up to: ${path.basename(backupPath)}`);

      console.log('\n🎉 User migration completed successfully!');

    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  // Verify migration by listing all users in database
  verifyMigration() {
    try {
      const stmt = this.db.db.prepare('SELECT id, email, name, is_active, created_at FROM users ORDER BY id');
      const dbUsers = stmt.all();

      console.log('\n🔍 Users in database:');
      console.table(dbUsers);

      return dbUsers;
    } catch (error) {
      console.error('❌ Error verifying migration:', error);
      return [];
    }
  }
}

// Run migration if this script is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const migration = new UserMigration();
  
  migration.migrateUsers()
    .then(() => {
      migration.verifyMigration();
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export default UserMigration;
