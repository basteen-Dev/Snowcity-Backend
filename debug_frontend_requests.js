require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function debugFrontendRequests() {
  console.log('=== DEBUGGING FRONTEND CREATION ISSUE ===');
  
  try {
    // Check current state of combos and attractions
    const comboCount = await pool.query('SELECT COUNT(*) as count FROM combos');
    const attractionCount = await pool.query('SELECT COUNT(*) as count FROM attractions');
    const comboSlotsCount = await pool.query('SELECT COUNT(*) as count FROM combo_slots');
    const attractionSlotsCount = await pool.query('SELECT COUNT(*) as count FROM attraction_slots');
    
    console.log('\n=== CURRENT DATABASE STATE ===');
    console.log('Combos:', comboCount.rows[0].count);
    console.log('Attractions:', attractionCount.rows[0].count);
    console.log('Combo Slots:', comboSlotsCount.rows[0].count);
    console.log('Attraction Slots:', attractionSlotsCount.rows[0].count);
    
    // Check recent combos without slots
    const recentCombosWithoutSlots = await pool.query(`
      SELECT c.combo_id, c.name, c.created_at,
             (SELECT COUNT(*) FROM combo_slots cs WHERE cs.combo_id = c.combo_id) as slot_count
      FROM combos c
      WHERE c.created_at > NOW() - INTERVAL '1 hour'
      ORDER BY c.created_at DESC
    `);
    
    console.log('\n=== RECENT COMBOS (last hour) ===');
    console.log('Combos created in last hour:', recentCombosWithoutSlots.rows.length);
    recentCombosWithoutSlots.rows.forEach(combo => {
      console.log(`Combo ${combo.combo_id}: ${combo.name} - Slots: ${combo.slot_count}`);
    });
    
    // Check recent attractions without slots
    const recentAttractionsWithoutSlots = await pool.query(`
      SELECT a.attraction_id, a.title, a.created_at,
             (SELECT COUNT(*) FROM attraction_slots asl WHERE asl.attraction_id = a.attraction_id) as slot_count
      FROM attractions a
      WHERE a.created_at > NOW() - INTERVAL '1 hour'
      ORDER BY a.created_at DESC
    `);
    
    console.log('\n=== RECENT ATTRACTIONS (last hour) ===');
    console.log('Attractions created in last hour:', recentAttractionsWithoutSlots.rows.length);
    recentAttractionsWithoutSlots.rows.forEach(attraction => {
      console.log(`Attraction ${attraction.attraction_id}: ${attraction.title} - Slots: ${attraction.slot_count}`);
    });
    
    // Test manual slot generation for the most recent combo/attraction
    if (recentCombosWithoutSlots.rows.length > 0) {
      const latestCombo = recentCombosWithoutSlots.rows[0];
      if (latestCombo.slot_count === 0) {
        console.log(`\n=== TESTING MANUAL SLOT GENERATION FOR COMBO ${latestCombo.combo_id} ===`);
        
        const ComboSlotAutoService = require('./services/comboSlotAutoService');
        const result = await ComboSlotAutoService.generateSlotsForCombo(latestCombo.combo_id, [], 2);
        console.log('Manual slot generation result:', result);
        
        // Verify slots were created
        const afterSlots = await pool.query(
          'SELECT COUNT(*) as count FROM combo_slots WHERE combo_id = $1',
          [latestCombo.combo_id]
        );
        console.log(`Slots after manual generation: ${afterSlots.rows[0].count}`);
      }
    }
    
    if (recentAttractionsWithoutSlots.rows.length > 0) {
      const latestAttraction = recentAttractionsWithoutSlots.rows[0];
      if (latestAttraction.slot_count === 0) {
        console.log(`\n=== TESTING MANUAL SLOT GENERATION FOR ATTRACTION ${latestAttraction.attraction_id} ===`);
        
        const AttractionSlotAutoService = require('./services/attractionSlotAutoService');
        const result = await AttractionSlotAutoService.generateSlotsForAttraction(latestAttraction.attraction_id, [], 1);
        console.log('Manual slot generation result:', result);
        
        // Verify slots were created
        const afterSlots = await pool.query(
          'SELECT COUNT(*) as count FROM attraction_slots WHERE attraction_id = $1',
          [latestAttraction.attraction_id]
        );
        console.log(`Slots after manual generation: ${afterSlots.rows[0].count}`);
      }
    }
    
    console.log('\n=== TROUBLESHOOTING TIPS ===');
    console.log('1. Check backend console logs for debugging messages when creating combos/attractions');
    console.log('2. Look for "=== COMBO CREATION START ===" or "=== ATTRACTION CREATION START ===" messages');
    console.log('3. Check for any error messages during slot generation');
    console.log('4. Verify the frontend is sending requests to the correct endpoints');
    console.log('5. Check if there are any validation errors preventing creation');
    
  } catch (error) {
    console.error('Error during debugging:', error);
  } finally {
    await pool.end();
  }
}

debugFrontendRequests();
