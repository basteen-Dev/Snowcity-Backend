const { pool } = require('./config/db');

async function runMigration() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('Running combo schema migration...');
    
    // Add missing columns to combos table (idempotent)
    const columns = [
      { name: 'name', sql: 'VARCHAR(200) NOT NULL DEFAULT \'\'', check: true },
      { name: 'attraction_ids', sql: 'BIGINT[] DEFAULT \'{}\'', check: true },
      { name: 'attraction_prices', sql: 'JSONB DEFAULT \'{}\'::jsonb', check: true },
      { name: 'total_price', sql: 'NUMERIC(10,2) DEFAULT 0 CHECK (total_price >= 0)', check: true },
      { name: 'image_url', sql: 'VARCHAR(255)', check: true },
      { name: 'create_slots', sql: 'BOOLEAN DEFAULT TRUE', check: true }
    ];
    
    for (const col of columns) {
      const result = await client.query(
        `SELECT 1 FROM information_schema.columns 
         WHERE table_name = 'combos' AND column_name = $1`,
        [col.name]
      );
      
      if (result.rows.length === 0) {
        console.log(`Adding column: ${col.name}`);
        await client.query(
          `ALTER TABLE combos ADD COLUMN ${col.name} ${col.sql}`
        );
      } else {
        console.log(`Column ${col.name} already exists`);
      }
    }
    
    // Make old columns nullable
    const nullableColumns = ['attraction_1_id', 'attraction_2_id', 'combo_price'];
    for (const col of nullableColumns) {
      const result = await client.query(
        `SELECT 1 FROM information_schema.columns 
         WHERE table_name = 'combos' AND column_name = $1 AND is_nullable = 'NO'`,
        [col]
      );
      
      if (result.rows.length > 0) {
        console.log(`Making column ${col.name} nullable`);
        await client.query(`ALTER TABLE combos ALTER COLUMN ${col} DROP NOT NULL`);
      }
    }
    
    // Drop old constraints
    const constraints = ['chk_combo_pair', 'uq_combo_pair'];
    for (const con of constraints) {
      const result = await client.query(
        `SELECT 1 FROM pg_constraint WHERE conname = $1`,
        [con]
      );
      
      if (result.rows.length > 0) {
        console.log(`Dropping constraint: ${con}`);
        await client.query(`ALTER TABLE combos DROP CONSTRAINT ${con}`);
      }
    }
    
    // Add new constraint
    const result = await client.query(
      `SELECT 1 FROM pg_constraint WHERE conname = 'chk_min_attractions'`
    );
    
    if (result.rows.length === 0) {
      console.log('Adding constraint: chk_min_attractions');
      await client.query(
        `ALTER TABLE combos ADD CONSTRAINT chk_min_attractions 
         CHECK (array_length(attraction_ids, 1) IS NULL OR array_length(attraction_ids, 1) >= 2)`
      );
    }
    
    // Create or replace combo_details view
    console.log('Creating combo_details view');
    await client.query(`DROP VIEW IF EXISTS combo_details`);
    
    await client.query(`
      CREATE OR REPLACE VIEW combo_details AS
      SELECT 
        c.combo_id,
        c.name,
        c.attraction_ids,
        c.attraction_prices,
        c.total_price,
        c.image_url,
        c.discount_percent,
        c.active,
        c.create_slots,
        c.created_at,
        c.updated_at,
        -- Legacy fields for backward compatibility
        c.attraction_1_id,
        c.attraction_2_id,
        c.combo_price,
        -- Get attraction details from combo_attractions
        COALESCE(
          json_agg(
            json_build_object(
              'attraction_id', ca.attraction_id,
              'title', a.title,
              'price', ca.attraction_price,
              'image_url', a.image_url,
              'slug', a.slug,
              'position_in_combo', ca.position_in_combo
            )
          ) FILTER (WHERE ca.attraction_id IS NOT NULL), 
          '[]'::json
        ) as attractions
      FROM combos c
      LEFT JOIN combo_attractions ca ON c.combo_id = ca.combo_id
      LEFT JOIN attractions a ON ca.attraction_id = a.attraction_id
      GROUP BY c.combo_id, c.name, c.attraction_ids, c.attraction_prices, c.total_price, 
               c.image_url, c.discount_percent, c.active, c.create_slots, c.created_at, c.updated_at,
               c.attraction_1_id, c.attraction_2_id, c.combo_price
    `);
    
    await client.query('COMMIT');
    console.log('Migration completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

runMigration()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
