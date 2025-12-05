require('dotenv').config();
const { pool } = require('./config/db');

async function fixSlotTimingComplete() {
  console.log('🔧 Complete Slot Timing Fix...');
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Step 1: Fix existing data - add slot_label for bookings that have slot times
    console.log('\n📊 Step 1: Fixing existing slot_label data');
    
    const updateLabels = await client.query(`
      UPDATE bookings 
      SET slot_label = CASE 
        WHEN slot_start_time IS NOT NULL AND slot_end_time IS NOT NULL THEN
          CASE 
            WHEN slot_start_time::text ~ '^\\d{2}:\\d{2}:\\d{2}$' AND slot_end_time::text ~ '^\\d{2}:\\d{2}:\\d{2}$' THEN
              -- Convert 24-hour to 12-hour format
              (CASE 
                WHEN EXTRACT(HOUR FROM slot_start_time) = 0 THEN '12:' || LPAD(EXTRACT(MINUTE FROM slot_start_time)::text, 2, '0') || ' AM'
                WHEN EXTRACT(HOUR FROM slot_start_time) < 12 THEN EXTRACT(HOUR FROM slot_start_time)::text || ':' || LPAD(EXTRACT(MINUTE FROM slot_start_time)::text, 2, '0') || ' AM'
                WHEN EXTRACT(HOUR FROM slot_start_time) = 12 THEN '12:' || LPAD(EXTRACT(MINUTE FROM slot_start_time)::text, 2, '0') || ' PM'
                ELSE (EXTRACT(HOUR FROM slot_start_time) - 12)::text || ':' || LPAD(EXTRACT(MINUTE FROM slot_start_time)::text, 2, '0') || ' PM'
              END) || ' - ' ||
              (CASE 
                WHEN EXTRACT(HOUR FROM slot_end_time) = 0 THEN '12:' || LPAD(EXTRACT(MINUTE FROM slot_end_time)::text, 2, '0') || ' AM'
                WHEN EXTRACT(HOUR FROM slot_end_time) < 12 THEN EXTRACT(HOUR FROM slot_end_time)::text || ':' || LPAD(EXTRACT(MINUTE FROM slot_end_time)::text, 2, '0') || ' AM'
                WHEN EXTRACT(HOUR FROM slot_end_time) = 12 THEN '12:' || LPAD(EXTRACT(MINUTE FROM slot_end_time)::text, 2, '0') || ' PM'
                ELSE (EXTRACT(HOUR FROM slot_end_time) - 12)::text || ':' || LPAD(EXTRACT(MINUTE FROM slot_end_time)::text, 2, '0') || ' PM'
              END)
            ELSE slot_label
          END
        ELSE slot_label
      END
      WHERE slot_label IS NULL 
        AND slot_start_time IS NOT NULL 
        AND slot_end_time IS NOT NULL
        AND slot_start_time::text ~ '^\\d{2}:\\d{2}:\\d{2}$'
        AND slot_end_time::text ~ '^\\d{2}:\\d{2}:\\d{2}$'
    `);
    
    console.log(`✅ Updated ${updateLabels.rowCount} bookings with slot_label`);

    // Step 2: Fix bookings that have slot_id but no slot times
    console.log('\n📊 Step 2: Fixing bookings with slot_id but no slot times');
    
    const fixFromSlotId = await client.query(`
      UPDATE bookings 
      SET 
        slot_start_time = CASE 
          WHEN slot_id::text ~ '^-\\d+-\\d+-\\d+$' THEN
            LPAD((regexp_matches(slot_id::text, '-(\\d+)$'))[1], 2, '0') || ':00:00'
          ELSE slot_start_time
        END,
        slot_end_time = CASE 
          WHEN slot_id::text ~ '^-\\d+-\\d+-\\d+$' THEN
            LPAD(((regexp_matches(slot_id::text, '-(\\d+)$'))[1]::INTEGER + 1)::text, 2, '0') || ':00:00'
          ELSE slot_end_time
        END,
        slot_label = CASE 
          WHEN slot_id::text ~ '^-\\d+-\\d+-\\d+$' THEN
            (CASE 
              WHEN (regexp_matches(slot_id::text, '-(\\d+)$'))[1]::INTEGER = 0 THEN '12:00 AM'
              WHEN (regexp_matches(slot_id::text, '-(\\d+)$'))[1]::INTEGER < 12 THEN (regexp_matches(slot_id::text, '-(\\d+)$'))[1] || ':00 AM'
              WHEN (regexp_matches(slot_id::text, '-(\\d+)$'))[1]::INTEGER = 12 THEN '12:00 PM'
              ELSE ((regexp_matches(slot_id::text, '-(\\d+)$'))[1]::INTEGER - 12)::text || ':00 PM'
            END) || ' - ' ||
            (CASE 
              WHEN ((regexp_matches(slot_id::text, '-(\\d+)$'))[1]::INTEGER + 1) % 24 = 0 THEN '12:00 AM'
              WHEN ((regexp_matches(slot_id::text, '-(\\d+)$'))[1]::INTEGER + 1) % 24 < 12 THEN (((regexp_matches(slot_id::text, '-(\\d+)$'))[1]::INTEGER + 1) % 24)::text || ':00 AM'
              WHEN ((regexp_matches(slot_id::text, '-(\\d+)$'))[1]::INTEGER + 1) % 24 = 12 THEN '12:00 PM'
              ELSE ((((regexp_matches(slot_id::text, '-(\\d+)$'))[1]::INTEGER + 1) % 24) - 12)::text || ':00 PM'
            END)
          ELSE slot_label
        END
      WHERE slot_id IS NOT NULL 
        AND (slot_start_time IS NULL OR slot_end_time IS NULL OR slot_label IS NULL)
        AND slot_id::text ~ '^-\\d+-\\d+-\\d+$'
    `);
    
    console.log(`✅ Fixed ${fixFromSlotId.rowCount} bookings from slot_id`);

    // Step 3: Check the results
    console.log('\n📊 Step 3: Verification');
    
    const verifyResults = await client.query(`
      SELECT 
        booking_id,
        slot_id,
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
      if (row.status !== 'Complete') {
        console.log(`     slot_id: ${row.slot_id}`);
        console.log(`     slot_start_time: ${row.slot_start_time}`);
        console.log(`     slot_end_time: ${row.slot_end_time}`);
        console.log(`     slot_label: ${row.slot_label}`);
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
fixSlotTimingComplete()
  .then(() => {
    console.log('🎉 Complete slot timing fix finished!');
    process.exit(0);
  })
  .catch(err => {
    console.error('💥 Error in complete slot timing fix:', err);
    process.exit(1);
  });
