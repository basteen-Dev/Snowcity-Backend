require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkTriggers() {
  console.log('Checking for triggers and constraints on combos table...');
  
  try {
    // Check for triggers
    const triggerResult = await pool.query(`
      SELECT trigger_name, event_manipulation, action_statement
      FROM information_schema.triggers 
      WHERE event_object_table = 'combos'
    `);
    
    console.log('Triggers on combos table:', triggerResult.rows);
    
    // Check for check constraints
    const constraintResult = await pool.query(`
      SELECT conname, consrc
      FROM pg_constraint 
      WHERE conrelid = 'combos'::regclass AND contype = 'c'
    `);
    
    console.log('Check constraints on combos table:', constraintResult.rows);
    
    // Check all constraints
    const allConstraintsResult = await pool.query(`
      SELECT conname, contype, consrc
      FROM pg_constraint 
      WHERE conrelid = 'combos'::regclass
    `);
    
    console.log('All constraints on combos table:', allConstraintsResult.rows);
    
    // Check for any rules
    const ruleResult = await pool.query(`
      SELECT rulename, definition
      FROM pg_rules 
      WHERE tablename = 'combos'
    `);
    
    console.log('Rules on combos table:', ruleResult.rows);
    
  } catch (error) {
    console.error('Error checking triggers:', error);
  } finally {
    await pool.end();
  }
}

checkTriggers();
