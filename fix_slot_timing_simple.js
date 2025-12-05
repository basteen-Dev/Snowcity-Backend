require('dotenv').config();
const { pool } = require('./config/db');

async function fixSlotTimingSimple() {
  console.log('🔧 Simple Slot Timing Fix...');
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Step 1: Update slot_label for bookings that have slot_start_time and slot_end_time
    console.log('\n📊 Step 1: Adding slot_label for existing bookings');
    
    // First, let's see what we're working with
    const checkData = await client.query(`
      SELECT 
        booking_id,
        slot_start_time,
        slot_end_time,
        slot_label
      FROM bookings
      WHERE slot_label IS NULL 
        AND slot_start_time IS NOT NULL 
        AND slot_end_time IS NOT NULL
      ORDER BY booking_id DESC
      LIMIT 5
    `);
    
    console.log('🔍 Bookings needing slot_label:');
    checkData.rows.forEach(row => {
      console.log(`   - Booking ${row.booking_id}: ${row.slot_start_time} - ${row.slot_end_time}`);
    });

    // Update each booking individually with proper slot_label
    for (const row of checkData.rows) {
      if (row.slot_start_time && row.slot_end_time) {
        const startHour = parseInt(row.slot_start_time.split(':')[0]);
        const startMin = row.slot_start_time.split(':')[1];
        const endHour = parseInt(row.slot_end_time.split(':')[0]);
        const endMin = row.slot_end_time.split(':')[1];
        
        // Convert to 12-hour format
        const formatTime = (hour, min) => {
          const displayHour = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour);
          const ampm = hour >= 12 ? 'PM' : 'AM';
          return `${displayHour}:${min} ${ampm}`;
        };
        
        const slotLabel = `${formatTime(startHour, startMin)} - ${formatTime(endHour, endMin)}`;
        
        await client.query(
          `UPDATE bookings SET slot_label = $1 WHERE booking_id = $2`,
          [slotLabel, row.booking_id]
        );
        
        console.log(`   ✅ Updated booking ${row.booking_id}: ${slotLabel}`);
      }
    }

    // Step 2: Check if there are any bookings with slot_id that need fixing
    console.log('\n📊 Step 2: Checking for slot_id based bookings');
    
    const slotIdBookings = await client.query(`
      SELECT 
        booking_id,
        slot_id,
        slot_start_time,
        slot_end_time,
        slot_label
      FROM bookings
      WHERE slot_id IS NOT NULL 
        AND (slot_start_time IS NULL OR slot_end_time IS NULL OR slot_label IS NULL)
      ORDER BY booking_id DESC
      LIMIT 5
    `);
    
    console.log('🔍 Bookings with slot_id but missing slot data:');
    slotIdBookings.rows.forEach(row => {
      console.log(`   - Booking ${row.booking_id}: slot_id=${row.slot_id}`);
    });

    // For now, let's focus on the main issue - the frontend display
    // Step 3: Verify the fix
    console.log('\n📊 Step 3: Verification');
    
    const verifyResults = await client.query(`
      SELECT 
        booking_id,
        slot_start_time,
        slot_end_time,
        slot_label,
        CASE 
          WHEN slot_start_time IS NULL OR slot_end_time IS NULL THEN 'Missing times'
          WHEN slot_label IS NULL THEN 'Missing label'
          ELSE 'Complete'
        END as status
      FROM bookings
      ORDER BY booking_id DESC
      LIMIT 10
    `);
    
    console.log('🔍 Recent bookings status:');
    verifyResults.rows.forEach(row => {
      console.log(`   - Booking ${row.booking_id}: ${row.status}`);
      if (row.status === 'Complete') {
        console.log(`     ${row.slot_start_time} - ${row.slot_end_time} (${row.slot_label})`);
      }
    });

    await client.query('COMMIT');
    console.log('\n✅ Slot timing fix completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error fixing slot timing:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the fix
fixSlotTimingSimple()
  .then(() => {
    console.log('🎉 Simple slot timing fix finished!');
    process.exit(0);
  })
  .catch(err => {
    console.error('💥 Error in simple slot timing fix:', err);
    process.exit(1);
  });
