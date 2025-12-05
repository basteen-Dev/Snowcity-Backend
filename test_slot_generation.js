require('dotenv').config();
const { Pool } = require('pg');
const ComboSlotAutoService = require('./services/comboSlotAutoService');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function testSlotGeneration() {
  console.log('Testing slot generation for existing combos...');
  
  try {
    // Get existing combos
    const combosResult = await pool.query('SELECT combo_id, attraction_ids FROM combos ORDER BY combo_id DESC LIMIT 3');
    console.log('Found combos:', combosResult.rows);
    
    if (combosResult.rows.length === 0) {
      console.log('No combos found. Creating a test combo first...');
      
      // Create a test combo
      const insertResult = await pool.query(`
        INSERT INTO combos (name, attraction_ids, attraction_prices, total_price, active, create_slots)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING combo_id, attraction_ids
      `, [
        'Test Combo',
        [1, 2], // Assuming attractions 1 and 2 exist
        { '1': 100, '2': 150 },
        250,
        true,
        true
      ]);
      
      const newCombo = insertResult.rows[0];
      console.log('Created test combo:', newCombo);
      
      // Generate slots for the new combo
      console.log('Generating slots for new combo...');
      const slotsResult = await ComboSlotAutoService.generateSlotsForCombo(
        newCombo.combo_id, 
        [], 
        newCombo.attraction_ids?.length || 2
      );
      console.log('Slot generation result:', slotsResult);
      
    } else {
      // Test slot generation for existing combos
      for (const combo of combosResult.rows) {
        console.log(`\nTesting combo ${combo.combo_id} with ${combo.attraction_ids?.length || 0} attractions`);
        
        // Check existing slots
        const existingSlots = await pool.query(
          'SELECT COUNT(*) as count FROM combo_slots WHERE combo_id = $1',
          [combo.combo_id]
        );
        console.log(`Existing slots for combo ${combo.combo_id}:`, existingSlots.rows[0].count);
        
        // Generate slots
        console.log('Generating slots...');
        const slotsResult = await ComboSlotAutoService.generateSlotsForCombo(
          combo.combo_id, 
          [], 
          combo.attraction_ids?.length || 2
        );
        console.log('Slot generation result:', slotsResult);
        
        // Check slots after generation
        const newSlots = await pool.query(
          'SELECT COUNT(*) as count FROM combo_slots WHERE combo_id = $1',
          [combo.combo_id]
        );
        console.log(`Slots after generation for combo ${combo.combo_id}:`, newSlots.rows[0].count);
      }
    }
    
    // Check total slots in system
    const totalSlots = await pool.query('SELECT COUNT(*) as count FROM combo_slots');
    console.log(`\nTotal slots in system:`, totalSlots.rows[0].count);
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await pool.end();
  }
}

testSlotGeneration();
