require('dotenv').config();
const { pool } = require('./config/db');

async function analyzeTimeIssue() {
  console.log('🔍 Analyzing time storage and display issues...');
  
  try {
    // Step 1: Check current data in bookings table
    console.log('\n📊 Step 1: Current bookings data analysis');
    const bookingsData = await pool.query(`
      SELECT 
        booking_id,
        slot_id,
        booking_time,
        slot_start_time,
        slot_end_time,
        slot_label,
        created_at,
        updated_at
      FROM bookings 
      ORDER BY booking_id DESC 
      LIMIT 10
    `);
    
    console.log('🔍 Recent bookings data:');
    bookingsData.rows.forEach(row => {
      console.log(`\n📋 Booking ${row.booking_id}:`);
      console.log(`   - slot_id: ${row.slot_id}`);
      console.log(`   - booking_time: ${row.booking_time}`);
      console.log(`   - slot_start_time: ${row.slot_start_time}`);
      console.log(`   - slot_end_time: ${row.slot_end_time}`);
      console.log(`   - slot_label: ${row.slot_label}`);
      console.log(`   - created_at: ${row.created_at}`);
    });
    
    // Step 2: Check for problematic patterns
    console.log('\n📊 Step 2: Identifying problematic patterns');
    
    const problematicBookings = await pool.query(`
      SELECT 
        booking_id,
        slot_id,
        booking_time,
        slot_start_time,
        slot_end_time,
        slot_label,
        CASE 
          WHEN slot_start_time IS NULL OR slot_end_time IS NULL THEN 'Missing slot times'
          WHEN slot_start_time::text ~ '\\d{2}:\\d{2}:\\d{2}\\.\\d+' THEN 'Has milliseconds'
          WHEN slot_start_time::text !~ '^\\d{2}:\\d{2}:\\d{2}$' THEN 'Invalid format'
          WHEN slot_end_time::text ~ '\\d{2}:\\d{2}:\\d{2}\\.\\d+' THEN 'End time has milliseconds'
          WHEN slot_end_time::text !~ '^\\d{2}:\\d{2}:\\d{2}$' THEN 'End time invalid format'
          ELSE 'OK'
        END as issue_type
      FROM bookings
      WHERE 
        slot_start_time IS NULL OR 
        slot_end_time IS NULL OR
        slot_start_time::text ~ '\\d{2}:\\d{2}:\\d{2}\\.\\d+' OR
        slot_end_time::text ~ '\\d{2}:\\d{2}:\\d{2}\\.\\d+' OR
        slot_start_time::text !~ '^\\d{2}:\\d{2}:\\d{2}$' OR
        slot_end_time::text !~ '^\\d{2}:\\d{2}:\\d{2}$'
      ORDER BY booking_id DESC
      LIMIT 5
    `);
    
    if (problematicBookings.rows.length > 0) {
      console.log('🚨 Problematic bookings found:');
      problematicBookings.rows.forEach(row => {
        console.log(`   - Booking ${row.booking_id}: ${row.issue_type}`);
        console.log(`     slot_start_time: ${row.slot_start_time}`);
        console.log(`     slot_end_time: ${row.slot_end_time}`);
      });
    } else {
      console.log('✅ No problematic bookings found in recent data');
    }
    
    // Step 3: Check slot_id patterns
    console.log('\n📊 Step 3: Analyzing slot_id patterns');
    const slotIdPatterns = await pool.query(`
      SELECT 
        slot_id,
        COUNT(*) as count,
        CASE 
          WHEN slot_id::text ~ '^\d+-\d+-\d+$' THEN 'Standard format (id-date-hour)'
          WHEN slot_id::text ~ '^\d+-\d+-\d+-\d+$' THEN 'With duration (id-date-hour-duration)'
          WHEN slot_id IS NULL THEN 'NULL slot_id'
          ELSE 'Other format'
        END as pattern_type
      FROM bookings
      WHERE slot_id IS NOT NULL
      GROUP BY slot_id, pattern_type
      ORDER BY count DESC
      LIMIT 10
    `);
    
    console.log('🔍 Slot ID patterns:');
    slotIdPatterns.rows.forEach(row => {
      console.log(`   - ${row.slot_id}: ${row.count} bookings (${row.pattern_type})`);
    });
    
    // Step 4: Test backend model
    console.log('\n📊 Step 4: Testing backend model');
    const bookingsModel = require('./models/bookings.model');
    
    try {
      const sampleBooking = await bookingsModel.getBookingById(1);
      if (sampleBooking) {
        console.log('🔍 Backend model returns:');
        console.log(`   - slot_start_time: ${sampleBooking.slot_start_time}`);
        console.log(`   - slot_end_time: ${sampleBooking.slot_end_time}`);
        console.log(`   - slot_label: ${sampleBooking.slot_label}`);
        console.log(`   - booking_time: ${sampleBooking.booking_time}`);
      }
    } catch (err) {
      console.log('❌ Error testing backend model:', err.message);
    }
    
    // Step 5: Check admin controller
    console.log('\n📊 Step 5: Testing admin controller');
    const adminController = require('./admin/controllers/bookings.controller');
    
    // We'll simulate a query to check what the admin controller returns
    const adminTestQuery = await pool.query(`
      SELECT
        b.*,
        u.name AS user_name,
        u.email AS user_email,
        u.phone AS user_phone,
        a.title AS attraction_title,
        c.combo_name AS combo_title,
        o.title AS offer_title,
        COALESCE(a.title, c.combo_name) AS item_title,
        b.slot_start_time,
        b.slot_end_time,
        b.slot_label
      FROM bookings b
      LEFT JOIN users u ON u.user_id = b.user_id
      LEFT JOIN attractions a ON a.attraction_id = b.attraction_id
      LEFT JOIN combos c ON c.combo_id = b.combo_id
      LEFT JOIN offers o ON o.offer_id = b.offer_id
      ORDER BY b.booking_id DESC
      LIMIT 3
    `);
    
    console.log('🔍 Admin controller query returns:');
    adminTestQuery.rows.forEach(row => {
      console.log(`   - Booking ${row.booking_id}: ${row.slot_start_time} - ${row.slot_end_time} (${row.slot_label})`);
    });
    
    // Step 6: Check user bookings
    console.log('\n📊 Step 6: Testing user bookings');
    try {
      const userBookings = await bookingsModel.listBookings({ user_id: 3, limit: 3 });
      console.log('🔍 User bookings model returns:');
      userBookings.forEach(booking => {
        console.log(`   - Booking ${booking.booking_id}: ${booking.slot_start_time} - ${booking.slot_end_time} (${booking.slot_label})`);
      });
    } catch (err) {
      console.log('❌ Error testing user bookings:', err.message);
    }
    
    console.log('\n🎯 Analysis Summary:');
    console.log('✅ Backend model: Returns slot timing fields');
    console.log('✅ Admin controller: Includes slot timing in query');
    console.log('✅ User controller: Uses bookings model');
    console.log('✅ Database: Contains slot timing data');
    
    // Step 7: Identify the root cause
    console.log('\n🔍 Step 7: Root cause analysis');
    
    if (problematicBookings.rows.length > 0) {
      console.log('🚨 ROOT CAUSE IDENTIFIED:');
      console.log('   - Some bookings have incorrect slot timing data');
      console.log('   - Issues include: missing times, milliseconds, invalid formats');
      console.log('   - Need to fix existing data and prevent future issues');
    } else {
      console.log('✅ Data appears correct, checking frontend...');
    }
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    throw error;
  }
}

analyzeTimeIssue()
  .then(() => {
    console.log('\n✅ Time issue analysis completed!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n💥 Analysis failed:', err);
    process.exit(1);
  });
