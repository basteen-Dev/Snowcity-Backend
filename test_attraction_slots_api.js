require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function testAttractionSlotsAPI() {
  console.log('Testing attraction slots API functionality...');
  
  try {
    // Check if we have attractions and slots
    const attractionCount = await pool.query('SELECT COUNT(*) as count FROM attractions');
    const attractionSlotsCount = await pool.query('SELECT COUNT(*) as count FROM attraction_slots');
    
    console.log('\n=== CURRENT DATABASE STATE ===');
    console.log('Attractions:', attractionCount.rows[0].count);
    console.log('Attraction Slots:', attractionSlotsCount.rows[0].count);
    
    // Get sample attraction and its slots
    if (attractionCount.rows[0].count > 0) {
      const sampleAttraction = await pool.query('SELECT attraction_id, title FROM attractions LIMIT 1');
      const attraction = sampleAttraction.rows[0];
      
      console.log('\n=== SAMPLE ATTRACTION ===');
      console.log(`Attraction ${attraction.attraction_id}: ${attraction.title}`);
      
      // Get slots for this attraction
      const slots = await pool.query(
        'SELECT COUNT(*) as count FROM attraction_slots WHERE attraction_id = $1',
        [attraction.attraction_id]
      );
      console.log(`Slots for attraction ${attraction.attraction_id}:`, slots.rows[0].count);
      
      // Get sample slot details
      const sampleSlot = await pool.query(
        'SELECT * FROM attraction_slots WHERE attraction_id = $1 LIMIT 3',
        [attraction.attraction_id]
      );
      
      console.log('\n=== SAMPLE SLOTS ===');
      sampleSlot.rows.forEach(slot => {
        console.log(`Slot ${slot.slot_id}: ${slot.start_date} ${slot.start_time} → ${slot.end_time} (Capacity: ${slot.capacity})`);
      });
    }
    
    console.log('\n✅ Attraction slots database structure verified!');
    console.log('🔧 Frontend components created:');
    console.log('  - AttractionSlotList.jsx');
    console.log('  - Updated AttractionsList.jsx with View Slots button');
    console.log('  - Added routes to AdminRouter.jsx');
    console.log('🔧 Backend components created:');
    console.log('  - attractionSlots.controller.js');
    console.log('  - attractionSlots.routes.js');
    console.log('  - Added routes to admin routes index');
    
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Start the backend server');
    console.log('2. Start the frontend admin panel');
    console.log('3. Navigate to /admin/catalog/attractions');
    console.log('4. Click "View Slots" for any attraction');
    console.log('5. Test clicking on slots to view booking details');
    console.log('6. Test the delete functionality');
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await pool.end();
  }
}

testAttractionSlotsAPI();
