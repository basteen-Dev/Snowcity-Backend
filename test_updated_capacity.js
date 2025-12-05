require('dotenv').config();
const { Pool } = require('pg');
const ComboSlotAutoService = require('./services/comboSlotAutoService');
const AttractionSlotAutoService = require('./services/attractionSlotAutoService');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function testUpdatedCapacity() {
  console.log('Testing updated capacity (300)...');
  
  try {
    // Test combo slot generation
    console.log('\n=== Testing Combo Slots ===');
    const comboSlots = ComboSlotAutoService.generateDefaultSlots(2);
    console.log('Sample combo slot capacity:', comboSlots[0]?.capacity);
    console.log('Total combo slots to generate:', comboSlots.length);
    
    // Test attraction slot generation  
    console.log('\n=== Testing Attraction Slots ===');
    const attractionSlots = AttractionSlotAutoService.generateDefaultSlots(1);
    console.log('Sample attraction slot capacity:', attractionSlots[0]?.capacity);
    console.log('Total attraction slots to generate:', attractionSlots.length);
    
    // Check current slots in database
    const comboSlotsCount = await pool.query('SELECT COUNT(*) as count FROM combo_slots');
    const attractionSlotsCount = await pool.query('SELECT COUNT(*) as count FROM attraction_slots');
    
    console.log('\n=== Current Database Status ===');
    console.log('Existing combo slots:', comboSlotsCount.rows[0].count);
    console.log('Existing attraction slots:', attractionSlotsCount.rows[0].count);
    
    // Check capacity of existing slots
    const comboCapacityCheck = await pool.query('SELECT DISTINCT capacity FROM combo_slots LIMIT 5');
    const attractionCapacityCheck = await pool.query('SELECT DISTINCT capacity FROM attraction_slots LIMIT 5');
    
    console.log('\n=== Existing Slot Capacities ===');
    console.log('Combo slot capacities:', comboCapacityCheck.rows.map(r => r.capacity));
    console.log('Attraction slot capacities:', attractionCapacityCheck.rows.map(r => r.capacity));
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await pool.end();
  }
}

testUpdatedCapacity();
