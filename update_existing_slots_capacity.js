require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function updateExistingSlotsCapacity() {
  console.log('Updating existing slots capacity to 300...');
  
  try {
    // Update combo slots capacity
    const comboResult = await pool.query(
      'UPDATE combo_slots SET capacity = 300 WHERE capacity != 300'
    );
    console.log(`Updated ${comboResult.rowCount} combo slots to capacity 300`);
    
    // Update attraction slots capacity
    const attractionResult = await pool.query(
      'UPDATE attraction_slots SET capacity = 300 WHERE capacity != 300'
    );
    console.log(`Updated ${attractionResult.rowCount} attraction slots to capacity 300`);
    
    // Verify the updates
    const comboCapacityCheck = await pool.query('SELECT DISTINCT capacity FROM combo_slots');
    const attractionCapacityCheck = await pool.query('SELECT DISTINCT capacity FROM attraction_slots');
    
    console.log('\n=== Updated Capacities ===');
    console.log('Combo slot capacities:', comboCapacityCheck.rows.map(r => r.capacity));
    console.log('Attraction slot capacities:', attractionCapacityCheck.rows.map(r => r.capacity));
    
    console.log('\n✅ All slots updated to capacity 300!');
    
  } catch (error) {
    console.error('Error updating slots:', error);
  } finally {
    await pool.end();
  }
}

updateExistingSlotsCapacity();
