require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runSimpleMigration() {
  console.log('Starting simple combo migration...');
  
  try {
    // Just add the missing columns one by one
    const queries = [
      `ALTER TABLE combos ADD COLUMN IF NOT EXISTS name VARCHAR(200) NOT NULL DEFAULT ''`,
      `ALTER TABLE combos ADD COLUMN IF NOT EXISTS attraction_ids BIGINT[] DEFAULT '{}'`,
      `ALTER TABLE combos ADD COLUMN IF NOT EXISTS attraction_prices JSONB DEFAULT '{}'::jsonb`,
      `ALTER TABLE combos ADD COLUMN IF NOT EXISTS total_price NUMERIC(10,2) DEFAULT 0`,
      `ALTER TABLE combos ADD COLUMN IF NOT EXISTS image_url VARCHAR(255)`,
      `ALTER TABLE combos ADD COLUMN IF NOT EXISTS create_slots BOOLEAN DEFAULT TRUE`,
      `ALTER TABLE combos ALTER COLUMN attraction_1_id DROP NOT NULL`,
      `ALTER TABLE combos ALTER COLUMN attraction_2_id DROP NOT NULL`,
      `ALTER TABLE combos ALTER COLUMN combo_price DROP NOT NULL`,
      `ALTER TABLE combos DROP CONSTRAINT IF EXISTS chk_combo_pair`,
      `ALTER TABLE combos DROP CONSTRAINT IF EXISTS uq_combo_pair`,
      `DROP VIEW IF EXISTS combo_details`
    ];
    
    for (const query of queries) {
      try {
        await pool.query(query);
        console.log('✓', query.substring(0, 50) + '...');
      } catch (err) {
        console.log('✗', query.substring(0, 50) + '...', err.message);
      }
    }
    
    // Create the view
    const viewQuery = `
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
        c.attraction_1_id,
        c.attraction_2_id,
        c.combo_price,
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
    `;
    
    await pool.query(viewQuery);
    console.log('✓ Created combo_details view');
    
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await pool.end();
  }
}

runSimpleMigration();
