require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkFunction() {
  console.log('Checking set_updated_at function...');
  
  try {
    // Get function definition
    const functionResult = await pool.query(`
      SELECT pg_get_functiondef(oid) as definition
      FROM pg_proc 
      WHERE proname = 'set_updated_at'
    `);
    
    console.log('set_updated_at function definition:');
    console.log(functionResult.rows[0]?.definition);
    
    // Also check for any other functions that might reference total_combo_price
    const allFunctionsResult = await pool.query(`
      SELECT proname, pg_get_functiondef(oid) as definition
      FROM pg_proc 
      WHERE prosrc LIKE '%total_combo_price%'
    `);
    
    console.log('Functions referencing total_combo_price:');
    console.log(allFunctionsResult.rows);
    
  } catch (error) {
    console.error('Error checking function:', error);
  } finally {
    await pool.end();
  }
}

checkFunction();
