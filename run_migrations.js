require('dotenv').config();
const { pool } = require('./config/db');

async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Add bulk_images to blogs table
    console.log('Adding bulk_images column to blogs table...');
    await client.query(`
      ALTER TABLE blogs 
      ADD COLUMN IF NOT EXISTS bulk_images JSONB DEFAULT '[]'::jsonb
    `);

    // Add bulk_images to cms_pages table
    console.log('Adding bulk_images column to cms_pages table...');
    await client.query(`
      ALTER TABLE cms_pages 
      ADD COLUMN IF NOT EXISTS bulk_images JSONB DEFAULT '[]'::jsonb
    `);

    // Create indexes
    console.log('Creating indexes...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_blogs_bulk_images ON blogs USING GIN (bulk_images)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_cms_pages_bulk_images ON cms_pages USING GIN (bulk_images)');

    await client.query('COMMIT');
    console.log('Migrations completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

runMigrations()
  .then(() => {
    console.log('All migrations completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration error:', error);
    process.exit(1);
  });
