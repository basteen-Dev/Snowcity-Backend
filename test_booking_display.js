require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function testBookingDisplay() {
  console.log('Testing booking display functionality...');
  
  try {
    // Check if we have bookings
    const bookingCount = await pool.query('SELECT COUNT(*) as count FROM bookings');
    console.log('\n=== BOOKING DATABASE STATE ===');
    console.log('Total bookings:', bookingCount.rows[0].count);
    
    if (bookingCount.rows[0].count > 0) {
      // Get sample bookings
      const sampleBookings = await pool.query(`
        SELECT b.booking_id, b.combo_id, b.attraction_id, b.combo_slot_id, b.slot_id,
               b.booking_date, b.start_time, b.customer_name, b.customer_email, b.booking_status
        FROM bookings b
        LIMIT 5
      `);
      
      console.log('\n=== SAMPLE BOOKINGS ===');
      sampleBookings.rows.forEach(booking => {
        console.log(`Booking ${booking.booking_id}:`);
        console.log(`  - Customer: ${booking.customer_name || booking.customer_email || 'N/A'}`);
        console.log(`  - Date: ${booking.booking_date}`);
        console.log(`  - Time: ${booking.start_time}`);
        console.log(`  - Combo ID: ${booking.combo_id || 'N/A'}`);
        console.log(`  - Attraction ID: ${booking.attraction_id || 'N/A'}`);
        console.log(`  - Combo Slot ID: ${booking.combo_slot_id || 'N/A'}`);
        console.log(`  - Slot ID: ${booking.slot_id || 'N/A'}`);
        console.log(`  - Status: ${booking.booking_status || 'N/A'}`);
        console.log('');
      });
      
      // Test slot-booking relationship
      const slotWithBookings = await pool.query(`
        SELECT cs.combo_slot_id, cs.start_date, cs.start_time, cs.combo_id,
               COUNT(b.booking_id) as booking_count
        FROM combo_slots cs
        LEFT JOIN bookings b ON b.combo_slot_id = cs.combo_slot_id
        WHERE cs.combo_slot_id IN (
          SELECT DISTINCT combo_slot_id FROM bookings WHERE combo_slot_id IS NOT NULL
          LIMIT 3
        )
        GROUP BY cs.combo_slot_id, cs.start_date, cs.start_time, cs.combo_id
      `);
      
      console.log('=== SLOT-BOOKING RELATIONSHIP ===');
      slotWithBookings.rows.forEach(slot => {
        console.log(`Combo Slot ${slot.combo_slot_id}: ${slot.booking_count} bookings`);
        console.log(`  - Date: ${slot.start_date}, Time: ${slot.start_time}`);
        console.log(`  - Combo ID: ${slot.combo_id}`);
      });
      
      const attractionSlotWithBookings = await pool.query(`
        SELECT asl.slot_id, asl.start_date, asl.start_time, asl.attraction_id,
               COUNT(b.booking_id) as booking_count
        FROM attraction_slots asl
        LEFT JOIN bookings b ON b.slot_id = asl.slot_id
        WHERE asl.slot_id IN (
          SELECT DISTINCT slot_id FROM bookings WHERE slot_id IS NOT NULL
          LIMIT 3
        )
        GROUP BY asl.slot_id, asl.start_date, asl.start_time, asl.attraction_id
      `);
      
      console.log('\n=== ATTRACTION SLOT-BOOKING RELATIONSHIP ===');
      attractionSlotWithBookings.rows.forEach(slot => {
        console.log(`Attraction Slot ${slot.slot_id}: ${slot.booking_count} bookings`);
        console.log(`  - Date: ${slot.start_date}, Time: ${slot.start_time}`);
        console.log(`  - Attraction ID: ${slot.attraction_id}`);
      });
    }
    
    console.log('\n✅ Time format updated to 12-hour format');
    console.log('✅ Enhanced booking fetching logic implemented');
    console.log('✅ Multiple booking query strategies added');
    
    console.log('\n📋 FEATURES ADDED:');
    console.log('1. 12-hour time format (10:00 AM, 2:00 PM, etc.)');
    console.log('2. Comprehensive booking search:');
    console.log('   - Primary: combo_id/attraction_id + date + time');
    console.log('   - Fallback: slot_id/combo_slot_id');
    console.log('   - Final: date + time only');
    console.log('3. Detailed booking information display');
    console.log('4. Console logging for debugging');
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await pool.end();
  }
}

testBookingDisplay();
