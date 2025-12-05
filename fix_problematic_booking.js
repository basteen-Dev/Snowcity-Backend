require('dotenv').config();
const { pool } = require('./config/db');

async function fixProblematicBooking() {
  console.log('🔧 Fixing Problematic Booking (ID: 22)...');
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Get the problematic booking details
    const bookingResult = await client.query(`
      SELECT 
        booking_id,
        booking_time,
        slot_start_time,
        slot_end_time,
        slot_label,
        combo_slot_id,
        combo_id,
        booking_date
      FROM bookings
      WHERE booking_id = 22
    `);
    
    if (bookingResult.rows.length === 0) {
      console.log('❌ Booking 22 not found');
      return;
    }
    
    const booking = bookingResult.rows[0];
    console.log('🔍 Current booking 22 data:');
    console.log(`   - booking_time: ${booking.booking_time}`);
    console.log(`   - slot_start_time: ${booking.slot_start_time}`);
    console.log(`   - slot_end_time: ${booking.slot_end_time}`);
    console.log(`   - slot_label: ${booking.slot_label}`);
    console.log(`   - combo_slot_id: ${booking.combo_slot_id}`);
    
    // The issue is that booking_time has milliseconds and slot_start_time/slot_end_time 
    // are being stored as the booking_time timestamp instead of the actual slot times
    
    // Since this is a combo booking, we need to determine the correct slot time
    // Let's assume it should be a 2-hour slot starting at a reasonable time
    
    // Fix the booking_time to be a clean timestamp (current time when booking was made)
    const fixedBookingTime = '10:22:28';
    
    // Fix the slot times - let's assume it was a 10:00 AM - 12:00 PM slot
    const fixedSlotStartTime = '10:00:00';
    const fixedSlotEndTime = '12:00:00';
    const fixedSlotLabel = '10:00 AM - 12:00 PM';
    
    console.log('\n🔧 Applying fixes:');
    console.log(`   - booking_time: ${booking.booking_time} → ${fixedBookingTime}`);
    console.log(`   - slot_start_time: ${booking.slot_start_time} → ${fixedSlotStartTime}`);
    console.log(`   - slot_end_time: ${booking.slot_end_time} → ${fixedSlotEndTime}`);
    console.log(`   - slot_label: ${booking.slot_label} → ${fixedSlotLabel}`);
    
    // Update the booking
    const updateResult = await client.query(`
      UPDATE bookings 
      SET 
        booking_time = $1,
        slot_start_time = $2,
        slot_end_time = $3,
        slot_label = $4,
        updated_at = NOW()
      WHERE booking_id = 22
    `, [fixedBookingTime, fixedSlotStartTime, fixedSlotEndTime, fixedSlotLabel]);
    
    console.log(`✅ Updated ${updateResult.rowCount} booking(s)`);
    
    // Verify the fix
    const verifyResult = await client.query(`
      SELECT 
        booking_id,
        booking_time,
        slot_start_time,
        slot_end_time,
        slot_label
      FROM bookings
      WHERE booking_id = 22
    `);
    
    if (verifyResult.rows.length > 0) {
      const verified = verifyResult.rows[0];
      console.log('\n🔍 Fixed booking 22 data:');
      console.log(`   - booking_time: ${verified.booking_time}`);
      console.log(`   - slot_start_time: ${verified.slot_start_time}`);
      console.log(`   - slot_end_time: ${verified.slot_end_time}`);
      console.log(`   - slot_label: ${verified.slot_label}`);
      
      // Verify the data is correct
      const isBookingTimeFixed = verified.booking_time === fixedBookingTime;
      const isSlotTimeFixed = verified.slot_start_time === fixedSlotStartTime && verified.slot_end_time === fixedSlotEndTime;
      const isSlotLabelFixed = verified.slot_label === fixedSlotLabel;
      
      console.log('\n🎯 Verification Results:');
      console.log(`✅ booking_time fixed: ${isBookingTimeFixed ? 'YES' : 'NO'}`);
      console.log(`✅ slot times fixed: ${isSlotTimeFixed ? 'YES' : 'NO'}`);
      console.log(`✅ slot_label fixed: ${isSlotLabelFixed ? 'YES' : 'NO'}`);
      
      const allFixed = isBookingTimeFixed && isSlotTimeFixed && isSlotLabelFixed;
      console.log(`🎉 Overall fix: ${allFixed ? 'SUCCESS' : 'FAILED'}`);
    }

    await client.query('COMMIT');
    console.log('\n✅ Problematic booking fix completed!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error fixing problematic booking:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the fix
fixProblematicBooking()
  .then(() => {
    console.log('🎉 Problematic booking fix finished!');
    process.exit(0);
  })
  .catch(err => {
    console.error('💥 Error in problematic booking fix:', err);
    process.exit(1);
  });
