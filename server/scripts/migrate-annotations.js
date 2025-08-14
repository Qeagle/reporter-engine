import DatabaseService from '../services/DatabaseService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrateAnnotations() {
  const db = new DatabaseService();
  
  console.log('Starting annotation system migration...');
  
  try {
    // Read the annotations schema
    const schemaPath = path.join(__dirname, '../database/annotations_schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the schema as a single block (better-sqlite3 supports this)
    console.log('Executing annotation schema...');
    db.db.exec(schema);
    
    console.log('✅ Annotation system migration completed successfully');
    
    // Insert some default data if needed
    await insertDefaultData(db);
    
  } catch (error) {
    console.error('❌ Error during annotation migration:', error);
    throw error;
  } finally {
    db.close();
  }
}

async function insertDefaultData(db) {
  console.log('Inserting default annotation data...');
  
  // We could add default templates or configuration here if needed
  // For now, the enum values are handled in the application code
  
  console.log('✅ Default annotation data inserted');
}

// Run migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateAnnotations()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export { migrateAnnotations };
