require('dotenv').config();
const { pool } = require('./config/db');

async function fixSlotTimingData() {
  console.log('🔧 Fixing slot timing data in bookings table...');
  
  const client = await pool.connect();
  
  try {
    // First, let's see what we're working with
    console.log('📊 Current booking data analysis...');
    const currentData = await client.query(`
      SELECT 
        booking_id,
        booking_ref,
        slot_start_time,
        slot_end_time,
        slot_label,
        booking_time,
        slot_id,
        combo_slot_id,
        item_type,
        created_at
      FROM bookings 
      ORDER BY booking_id DESC 
      LIMIT 10
    `);
    
    console.log('\n📋 Current problematic records:');
    currentData.rows.forEach(row => {
      console.log(`- Booking ${row.booking_id}: ${row.slot_start_time} - ${row.slot_end_time} (${row.slot_label})`);
      console.log(`  slot_id: ${row.slot_id}, combo_slot_id: ${row.combo_slot_id}, item_type: ${row.item_type}`);
      console.log(`  created_at: ${row.created_at}`);
    });
    
    // Fix records with timestamp-based slot times
    console.log('\n🔄 Fixing records with timestamp-based slot times...');
    
    // Update records where slot_start_time contains milliseconds (timestamp pattern)
    const fixResult = await client.query(`
      UPDATE bookings 
      SET 
        slot_start_time = CASE 
          -- If slot_id has virtual slot ID format, extract hour
          WHEN slot_id IS NOT NULL AND slot_id::TEXT LIKE '%-%-%' THEN
            (SPLIT_PART(slot_id::TEXT, '-', 3))::TEXT || ':00:00'::TIME
          -- If combo_slot_id has virtual slot ID format, extract hour
          WHEN combo_slot_id IS NOT NULL AND combo_slot_id::TEXT LIKE '%-%-%' THEN
            (SPLIT_PART(combo_slot_id::TEXT, '-', 3))::TEXT || ':00:00'::TIME
          -- Otherwise, use clean hour from booking_time
          WHEN booking_time IS NOT NULL THEN
            EXTRACT(HOUR FROM booking_time)::TEXT || ':00:00'::TIME
          ELSE '10:00:00'::TIME
        END,
        slot_end_time = CASE 
          -- If slot_id has virtual slot ID format, extract hour + 1
          WHEN slot_id IS NOT NULL AND slot_id::TEXT LIKE '%-%-%' THEN
            ((SPLIT_PART(slot_id::TEXT, '-', 3))::INTEGER + 1)::TEXT || ':00:00'::TIME
          -- If combo_slot_id has virtual slot ID format, extract hour + 2
          WHEN combo_slot_id IS NOT NULL AND combo_slot_id::TEXT LIKE '%-%-%' THEN
            ((SPLIT_PART(combo_slot_id::TEXT, '-', 3))::INTEGER + 2)::TEXT || ':00:00'::TIME
          -- Otherwise, use clean hour from booking_time + 1
          WHEN booking_time IS NOT NULL THEN
            (EXTRACT(HOUR FROM booking_time)::INTEGER + 1)::TEXT || ':00:00'::TIME
          ELSE '11:00:00'::TIME
        END,
        slot_label = CASE 
          -- If slot_id has virtual slot ID format, create label
          WHEN slot_id IS NOT NULL AND slot_id::TEXT LIKE '%-%-%' THEN
            to_char(
              (SPLIT_PART(slot_id::TEXT, '-', 3))::INTEGER || ':00', 'HH12:MI AM'
            ) || ' - ' ||
            to_char(
              ((SPLIT_PART(slot_id::TEXT, '-', 3))::INTEGER + 1) || ':00', 'HH12:MI AM'
            )
          -- If combo_slot_id has virtual slot ID format, create label
          WHEN combo_slot_id IS NOT NULL AND combo_slot_id::TEXT LIKE '%-%-%' THEN
            to_char(
              (SPLIT_PART(combo_slot_id::TEXT, '-', 3))::INTEGER || ':00', 'HH12:MI AM'
            ) || ' - ' ||
            to_char(
              ((SPLIT_PART(combo_slot_id::TEXT, '-', 3))::INTEGER + 2) || ':00', 'HH12:MI AM'
            )
          -- Otherwise, use clean hour from booking_time
          WHEN booking_time IS NOT NULL THEN
            to_char(EXTRACT(HOUR FROM booking_time)::INTEGER || ':00', 'HH12:MI AM') || ' - ' ||
            to_char((EXTRACT(HOUR FROM booking_time)::INTEGER + 1) || ':00', 'HH12:MI AM')
          ELSE '10:00 AM - 11:00 AM'
        END
      WHERE 
        slot_start_time::TEXT ~ '^[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]+$'
        OR slot_end_time::TEXT ~ '^[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]+$'
    `);
    
    console.log(`✅ Fixed ${fixResult.rowCount} records with timestamp-based slot times`);
    
    // Show the fixed data
    console.log('\n📊 Checking fixed data...');
    const fixedData = await client.query(`
      SELECT 
        booking_id,
        booking_ref,
        slot_start_time,
        slot_end_time,
        slot_label,
        slot_id,
        combo_slot_id,
        item_type
      FROM bookings 
      ORDER BY booking_id DESC 
      LIMIT 10
    `);
    
    console.log('\n📋 Fixed records:');
    fixedData.rows.forEach(row => {
      console.log(`- Booking ${row.booking_id}: ${row.slot_start_time} - ${row.slot_end_time} (${row.slot_label})`);
      console.log(`  slot_id: ${row.slot_id}, combo_slot_id: ${row.combo_slot_id}, item_type: ${row.item_type}`);
    });
    
    // Check if any records still have timestamps
    const remainingIssues = await client.query(`
      SELECT COUNT(*) as count
      FROM bookings 
      WHERE 
        slot_start_time::TEXT ~ '^[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]+$'
        OR slot_end_time::TEXT ~ '^[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]+$'
    `);
    
    console.log(`\n📊 Remaining records with timestamps: ${remainingIssues.rows[0].count}`);
    
    if (remainingIssues.rows[0].count === 0) {
      console.log('✅ All slot timing data has been fixed!');
    } else {
      console.log('⚠️  Some records still have timestamps, may need manual review');
    }
    
  } catch (error) {
    console.error('❌ Error fixing slot timing:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

fixSlotTimingData()
  .then(() => {
    console.log('\n🚀 Slot timing data fix completed!');
    console.log('📱 Users will now see clean slot times like "10:00 AM - 11:00 AM"');
    console.log('🔍 No more timestamp-based slot times');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n💥 Fix failed:', err);
    process.exit(1);
  });
