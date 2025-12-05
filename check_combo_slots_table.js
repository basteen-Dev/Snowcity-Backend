require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkComboSlotsTable() {
  console.log('Checking combo_slots table structure...');
  
  try {
    // Get table columns
    const columnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'combo_slots'
      ORDER BY ordinal_position
    `);
    
    console.log('Combo slots table columns:');
    console.log(columnsResult.rows);
    
    // Get constraints
    const constraintsResult = await pool.query(`
      SELECT conname, contype, pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conrelid = 'combo_slots'::regclass
    `);
    
    console.log('Combo slots table constraints:');
    console.log(constraintsResult.rows);
    
    // Get indexes
    const indexesResult = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes 
      WHERE tablename = 'combo_slots'
    `);
    
    console.log('Combo slots table indexes:');
    console.log(indexesResult.rows);
    
  } catch (error) {
    console.error('Error checking table:', error);
  } finally {
    await pool.end();
  }
}

checkComboSlotsTable();
