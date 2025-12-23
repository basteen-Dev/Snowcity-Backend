const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { pool } = require('./config/db');

async function alterDynamicPricingTable() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Altering dynamic_pricing_rules table to use date_ranges...');

    // Add the new column
    await client.query(`
      ALTER TABLE dynamic_pricing_rules ADD COLUMN IF NOT EXISTS date_ranges JSONB
    `);

    // Migrate existing data
    await client.query(`
      UPDATE dynamic_pricing_rules
      SET date_ranges = json_build_array(json_build_object('from', date_from, 'to', date_to))
      WHERE date_ranges IS NULL
    `);

    // Make date_ranges NOT NULL
    await client.query(`
      ALTER TABLE dynamic_pricing_rules ALTER COLUMN date_ranges SET NOT NULL
    `);

    // Drop old columns
    await client.query(`
      ALTER TABLE dynamic_pricing_rules DROP COLUMN IF EXISTS date_from
    `);

    await client.query(`
      ALTER TABLE dynamic_pricing_rules DROP COLUMN IF EXISTS date_to
    `);

    // Drop old constraint
    await client.query(`
      ALTER TABLE dynamic_pricing_rules DROP CONSTRAINT IF EXISTS chk_date_range
    `);

    // Drop old index
    await client.query(`
      DROP INDEX IF EXISTS idx_dynamic_pricing_dates
    `);

    // Create new index
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_dynamic_pricing_date_ranges
      ON dynamic_pricing_rules USING GIN (date_ranges)
    `);

    await client.query('COMMIT');
    console.log('Dynamic pricing rules table altered successfully!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error altering table:', error);
    throw error;
  } finally {
    client.release();
  }
}

alterDynamicPricingTable()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });