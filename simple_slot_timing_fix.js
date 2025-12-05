require('dotenv').config();
const { pool } = require('./config/db');

async function simpleSlotTimingFix() {
  console.log('🔧 Simple slot timing data fix...');
  
  const client = await pool.connect();
  
  try {
    // First, let's see the current problematic records
    console.log('📊 Current problematic records...');
    const currentData = await client.query(`
      SELECT 
        booking_id,
        slot_start_time,
        slot_end_time,
        slot_label,
        booking_time,
        item_type
      FROM bookings 
      WHERE slot_start_time::TEXT ~ '\\.'
      ORDER BY booking_id DESC
    `);
    
    console.log(`Found ${currentData.rowCount} records with timestamps in slot timing`);
    
    // Fix each record individually
    for (const row of currentData.rows) {
      console.log(`\n🔄 Fixing booking ${row.booking_id}...`);
      
      // Extract hour from booking_time
      const hour = row.booking_time ? parseInt(row.booking_time.toString().split(':')[0]) : 10;
      const cleanStartTime = `${hour.toString().padStart(2, '0')}:00:00`;
      const cleanEndTime = `${((hour + 1) % 24).toString().padStart(2, '0')}:00:00`;
      const cleanLabel = `${hour % 12 || 12}:00 ${hour >= 12 ? 'PM' : 'AM'} - ${(hour + 1) % 12 || 12}:00 ${(hour + 1) >= 12 ? 'PM' : 'AM'}`;
      
      console.log(`  From: ${row.slot_start_time} - ${row.slot_end_time}`);
      console.log(`  To:   ${cleanStartTime} - ${cleanEndTime} (${cleanLabel})`);
      
      // Update the record
      await client.query(`
        UPDATE bookings 
        SET 
          slot_start_time = $1,
          slot_end_time = $2,
          slot_label = $3
        WHERE booking_id = $4
      `, [cleanStartTime, cleanEndTime, cleanLabel, row.booking_id]);
      
      console.log(`  ✅ Updated booking ${row.booking_id}`);
    }
    
    // Verify the fix
    console.log('\n📊 Verifying fix...');
    const remainingIssues = await client.query(`
      SELECT COUNT(*) as count
      FROM bookings 
      WHERE slot_start_time::TEXT ~ '\\.'
        OR slot_end_time::TEXT ~ '\\.'
    `);
    
    console.log(`📊 Remaining records with timestamps: ${remainingIssues.rows[0].count}`);
    
    // Show sample of fixed records
    const sampleData = await client.query(`
      SELECT 
        booking_id,
        slot_start_time,
        slot_end_time,
        slot_label,
        item_type
      FROM bookings 
      ORDER BY booking_id DESC 
      LIMIT 5
    `);
    
    console.log('\n📋 Sample fixed records:');
    sampleData.rows.forEach(row => {
      console.log(`- Booking ${row.booking_id}: ${row.slot_start_time} - ${row.slot_end_time} (${row.slot_label})`);
    });
    
    if (remainingIssues.rows[0].count === 0) {
      console.log('\n✅ All slot timing data has been fixed!');
      console.log('🎯 All slot times are now clean (HH:MM:SS format)');
    } else {
      console.log('\n⚠️  Some records still have timestamps');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

simpleSlotTimingFix()
  .then(() => {
    console.log('\n🚀 Slot timing fix completed!');
    console.log('📱 Users will now see clean slot times like "10:00 AM - 11:00 AM"');
    console.log('🔍 No more timestamp-based slot times in database');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n💥 Fix failed:', err);
    process.exit(1);
  });
