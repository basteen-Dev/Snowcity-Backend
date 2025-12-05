require('dotenv').config();
const { pool } = require('./config/db');

async function updateExistingBookings() {
  console.log('🔄 Updating existing bookings with slot timing...');
  
  const client = await pool.connect();
  
  try {
    // Check current state
    const currentStats = await client.query(`
      SELECT 
        COUNT(*) as total_bookings,
        COUNT(CASE WHEN slot_start_time IS NOT NULL THEN 1 END) as with_start_time,
        COUNT(CASE WHEN slot_end_time IS NOT NULL THEN 1 END) as with_end_time,
        COUNT(CASE WHEN slot_start_time IS NULL OR slot_end_time IS NULL THEN 1 END) as missing_timing
      FROM bookings
    `);
    
    console.log('📊 Current stats:', currentStats.rows[0]);
    
    if (currentStats.rows[0].missing_timing > 0) {
      console.log(`🔄 Updating ${currentStats.rows[0].missing_timing} bookings missing slot timing...`);
      
      // Simple update - use booking_time as slot time for existing records
      const updateResult = await client.query(`
        UPDATE bookings 
        SET 
          slot_start_time = COALESCE(slot_start_time, booking_time),
          slot_end_time = COALESCE(slot_end_time, (booking_time + INTERVAL '1 hour')::TIME),
          slot_label = COALESCE(slot_label, to_char(booking_time, 'HH12:MI AM') || ' - ' || to_char((booking_time + INTERVAL '1 hour')::TIME, 'HH12:MI AM'))
        WHERE slot_start_time IS NULL OR slot_end_time IS NULL
      `);
      
      console.log(`✅ Updated ${updateResult.rowCount} records`);
    }
    
    // Show updated stats
    const finalStats = await client.query(`
      SELECT 
        COUNT(*) as total_bookings,
        COUNT(CASE WHEN slot_start_time IS NOT NULL THEN 1 END) as with_start_time,
        COUNT(CASE WHEN slot_end_time IS NOT NULL THEN 1 END) as with_end_time,
        COUNT(CASE WHEN slot_start_time IS NOT NULL AND slot_end_time IS NOT NULL THEN 1 END) as with_complete_timing
      FROM bookings
    `);
    
    console.log('📊 Final stats:', finalStats.rows[0]);
    
    // Show sample records
    const sampleRecords = await client.query(`
      SELECT 
        booking_id,
        booking_ref,
        slot_start_time,
        slot_end_time,
        slot_label,
        booking_time,
        item_type
      FROM bookings 
      ORDER BY booking_id DESC 
      LIMIT 5
    `);
    
    console.log('\n📋 Sample records:');
    sampleRecords.rows.forEach(row => {
      console.log(`- Booking ${row.booking_id}: ${row.slot_start_time} - ${row.slot_end_time} (${row.slot_label})`);
    });
    
    console.log('\n✅ Update completed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

updateExistingBookings()
  .then(() => {
    console.log('\n🚀 Existing bookings updated!');
    console.log('📱 Ready to make slot timing mandatory...');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n💥 Update failed:', err);
    process.exit(1);
  });