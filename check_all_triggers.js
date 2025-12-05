require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkAllTriggers() {
  console.log('Checking all triggers that call update_combo_details...');
  
  try {
    // Get all triggers that call update_combo_details
    const triggerResult = await pool.query(`
      SELECT event_object_table, trigger_name, event_manipulation, action_timing, action_condition, action_statement
      FROM information_schema.triggers 
      WHERE action_statement LIKE '%update_combo_details%'
    `);
    
    console.log('Triggers calling update_combo_details:');
    console.log(triggerResult.rows);
    
    // Also check combo_attractions table triggers
    const comboAttractionsTriggers = await pool.query(`
      SELECT trigger_name, event_manipulation, action_statement
      FROM information_schema.triggers 
      WHERE event_object_table = 'combo_attractions'
    `);
    
    console.log('Triggers on combo_attractions table:');
    console.log(comboAttractionsTriggers.rows);
    
  } catch (error) {
    console.error('Error checking triggers:', error);
  } finally {
    await pool.end();
  }
}

checkAllTriggers();
