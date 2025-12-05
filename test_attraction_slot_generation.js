require('dotenv').config();
const { Pool } = require('pg');
const AttractionSlotAutoService = require('./services/attractionSlotAutoService');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function testAttractionSlotGeneration() {
  console.log('Testing attraction slot generation...');
  
  try {
    // Get existing attractions
    const attractionsResult = await pool.query('SELECT attraction_id, title FROM attractions ORDER BY attraction_id DESC LIMIT 3');
    console.log('Found attractions:', attractionsResult.rows);
    
    if (attractionsResult.rows.length === 0) {
      console.log('No attractions found. Creating a test attraction first...');
      
      // Create a test attraction
      const insertResult = await pool.query(`
        INSERT INTO attractions (title, base_price, active)
        VALUES ($1, $2, $3)
        RETURNING attraction_id, title
      `, [
        'Test Attraction',
        100,
        true
      ]);
      
      const newAttraction = insertResult.rows[0];
      console.log('Created test attraction:', newAttraction);
      
      // Generate slots for the new attraction
      console.log('Generating slots for new attraction...');
      const slotsResult = await AttractionSlotAutoService.generateSlotsForAttraction(
        newAttraction.attraction_id, 
        [], 
        1 // 1-hour slots
      );
      console.log('Slot generation result:', slotsResult);
      
    } else {
      // Test slot generation for existing attractions
      for (const attraction of attractionsResult.rows) {
        console.log(`\nTesting attraction ${attraction.attraction_id}: ${attraction.title}`);
        
        // Check existing slots
        const existingSlots = await pool.query(
          'SELECT COUNT(*) as count FROM attraction_slots WHERE attraction_id = $1',
          [attraction.attraction_id]
        );
        console.log(`Existing slots for attraction ${attraction.attraction_id}:`, existingSlots.rows[0].count);
        
        // Generate slots
        console.log('Generating slots...');
        const slotsResult = await AttractionSlotAutoService.generateSlotsForAttraction(
          attraction.attraction_id, 
          [], 
          1 // 1-hour slots
        );
        console.log('Slot generation result:', slotsResult);
        
        // Check slots after generation
        const newSlots = await pool.query(
          'SELECT COUNT(*) as count FROM attraction_slots WHERE attraction_id = $1',
          [attraction.attraction_id]
        );
        console.log(`Slots after generation for attraction ${attraction.attraction_id}:`, newSlots.rows[0].count);
      }
    }
    
    // Check total slots in system
    const totalSlots = await pool.query('SELECT COUNT(*) as count FROM attraction_slots');
    console.log(`\nTotal attraction slots in system:`, totalSlots.rows[0].count);
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await pool.end();
  }
}

testAttractionSlotGeneration();
