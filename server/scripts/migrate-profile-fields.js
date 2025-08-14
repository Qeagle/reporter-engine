import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import DatabaseService from '../services/DatabaseService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ProfileMigration {
  constructor() {
    this.db = new DatabaseService();
  }

  async addProfileFields() {
    try {
      console.log('🔄 Starting profile fields migration...');

      // Check if profile fields already exist
      const tableInfo = this.db.db.prepare("PRAGMA table_info(users)").all();
      const columnNames = tableInfo.map(col => col.name);

      const newFields = [
        { name: 'display_name', type: 'TEXT' },
        { name: 'avatar_url', type: 'TEXT' },
        { name: 'phone', type: 'TEXT' },
        { name: 'bio', type: 'TEXT' },
        { name: 'timezone', type: 'TEXT DEFAULT \'UTC\'' },
        { name: 'location', type: 'TEXT' },
        { name: 'website', type: 'TEXT' },
        { name: 'updated_at', type: 'TEXT NOT NULL DEFAULT (datetime(\'now\'))' }
      ];

      let addedFields = 0;

      for (const field of newFields) {
        if (!columnNames.includes(field.name)) {
          try {
            this.db.db.exec(`ALTER TABLE users ADD COLUMN ${field.name} ${field.type}`);
            console.log(`✅ Added column: ${field.name}`);
            addedFields++;
          } catch (error) {
            console.error(`❌ Error adding column ${field.name}:`, error.message);
          }
        } else {
          console.log(`⏭️  Column ${field.name} already exists`);
        }
      }

      // Create trigger for updated_at
      try {
        this.db.db.exec(`
          CREATE TRIGGER IF NOT EXISTS update_users_updated_at 
          AFTER UPDATE ON users 
          BEGIN 
            UPDATE users SET updated_at = datetime('now') WHERE id = NEW.id; 
          END
        `);
        console.log('✅ Created updated_at trigger');
      } catch (error) {
        console.error('❌ Error creating trigger:', error.message);
      }

      console.log(`\n📊 Migration Summary:`);
      console.log(`   ✅ Added fields: ${addedFields}`);
      console.log(`   📋 Total new fields: ${newFields.length}`);
      console.log('\n🎉 Profile fields migration completed successfully!');

    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  // Verify migration by showing updated table structure
  verifyMigration() {
    try {
      const tableInfo = this.db.db.prepare("PRAGMA table_info(users)").all();
      console.log('\n🔍 Updated users table structure:');
      console.table(tableInfo);
      return tableInfo;
    } catch (error) {
      console.error('❌ Error verifying migration:', error);
      return [];
    }
  }
}

// Run migration if this script is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const migration = new ProfileMigration();
  
  migration.addProfileFields()
    .then(() => {
      migration.verifyMigration();
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export default ProfileMigration;
