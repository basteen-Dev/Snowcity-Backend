const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { pool } = require('./config/db');

async function createDynamicPricingTable() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Creating dynamic_pricing_rules table...');

    // Create the table
    await client.query(`
      CREATE TABLE IF NOT EXISTS dynamic_pricing_rules (
        rule_id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('attraction', 'combo', 'all')),
        target_id BIGINT,
        date_ranges JSONB NOT NULL, -- Array of {from: 'YYYY-MM-DD', to: 'YYYY-MM-DD'}
        price_adjustment_type VARCHAR(50) NOT NULL CHECK (price_adjustment_type IN ('fixed', 'percentage')),
        price_adjustment_value NUMERIC(10,2) NOT NULL CHECK (price_adjustment_value >= 0),
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

        -- Constraints
        CONSTRAINT chk_target_id CHECK (
          (target_type = 'all' AND target_id IS NULL) OR
          (target_type IN ('attraction', 'combo') AND target_id IS NOT NULL)
        )
      )
    `);

    // Create indexes for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_dynamic_pricing_target
      ON dynamic_pricing_rules(target_type, target_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_dynamic_pricing_date_ranges
      ON dynamic_pricing_rules USING GIN (date_ranges)
    `);

    // Create updated_at trigger
    await client.query(`
      CREATE OR REPLACE FUNCTION update_dynamic_pricing_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS trigger_dynamic_pricing_updated_at
      ON dynamic_pricing_rules;
    `);

    await client.query(`
      CREATE TRIGGER trigger_dynamic_pricing_updated_at
      BEFORE UPDATE ON dynamic_pricing_rules
      FOR EACH ROW EXECUTE FUNCTION update_dynamic_pricing_updated_at();
    `);

    await client.query('COMMIT');
    console.log('Dynamic pricing rules table created successfully!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

createDynamicPricingTable()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });