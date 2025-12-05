require('dotenv').config();
const { pool } = require('./config/db');

async function addSlotTimingColumns() {
  console.log('🔧 Adding slot timing columns to bookings table...');
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Add slot_start_time column
    console.log('➕ Adding slot_start_time column...');
    try {
      await client.query(`
        ALTER TABLE bookings 
        ADD COLUMN slot_start_time TIME WITHOUT TIME ZONE
      `);
      console.log('✅ Added slot_start_time column');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('ℹ️  slot_start_time column already exists');
      } else {
        throw err;
      }
    }
    
    // Add slot_end_time column
    console.log('➕ Adding slot_end_time column...');
    try {
      await client.query(`
        ALTER TABLE bookings 
        ADD COLUMN slot_end_time TIME WITHOUT TIME ZONE
      `);
      console.log('✅ Added slot_end_time column');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('ℹ️  slot_end_time column already exists');
      } else {
        throw err;
      }
    }
    
    // Add slot_label column for display
    console.log('➕ Adding slot_label column...');
    try {
      await client.query(`
        ALTER TABLE bookings 
        ADD COLUMN slot_label TEXT
      `);
      console.log('✅ Added slot_label column');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('ℹ️  slot_label column already exists');
      } else {
        throw err;
      }
    }
    
    await client.query('COMMIT');
    console.log('✅ Columns added successfully!');
    
    // Update existing records
    console.log('\n🔄 Updating existing records with slot timing...');
    
    // First, try to extract from virtual slot IDs
    const updateResult = await client.query(`
      UPDATE bookings 
      SET 
        slot_start_time = CASE 
          WHEN slot_id IS NOT NULL AND slot_id::TEXT LIKE '%-%-%' THEN
            (RIGHT(slot_id::TEXT, POSITION('-' IN REVERSE(slot_id::TEXT)) - 1) || ':00:00')::TIME
          WHEN booking_time IS NOT NULL THEN booking_time
          ELSE '10:00:00'::TIME
        END,
        slot_end_time = CASE 
          WHEN slot_id IS NOT NULL AND slot_id::TEXT LIKE '%-%-%' THEN
            ((RIGHT(slot_id::TEXT, POSITION('-' IN REVERSE(slot_id::TEXT)) - 1)::INTEGER + 1)::TEXT || ':00:00')::TIME
          WHEN booking_time IS NOT NULL THEN 
            (booking_time + INTERVAL '1 hour')::TIME
          ELSE '11:00:00'::TIME
        END,
        slot_label = CASE 
          WHEN slot_id IS NOT NULL AND slot_id::TEXT LIKE '%-%-%' THEN
            to_char(
              to_date(RIGHT(slot_id::TEXT, POSITION('-' IN REVERSE(slot_id::TEXT)) - 1) || ':00', 'HH12:MI AM')
            ) || ' - ' ||
            to_char(
              to_date(((RIGHT(slot_id::TEXT, POSITION('-' IN REVERSE(slot_id::TEXT)) - 1)::INTEGER + 1)::TEXT || ':00', 'HH12:MI AM')
            )
          ELSE to_char(booking_time, 'HH12:MI AM')
        END
      WHERE slot_start_time IS NULL OR slot_end_time IS NULL
    `);
    
    console.log(`✅ Updated ${updateResult.rowCount} records with slot timing`);
    
    // Show sample of updated records
    const sampleRecords = await client.query(`
      SELECT 
        booking_id,
        booking_ref,
        slot_start_time,
        slot_end_time,
        slot_label,
        booking_time,
        slot_id,
        item_type
      FROM bookings 
      WHERE slot_start_time IS NOT NULL
      ORDER BY booking_id DESC 
      LIMIT 5
    `);
    
    console.log('\n📋 Sample updated records:');
    sampleRecords.rows.forEach(row => {
      console.log(`- Booking ${row.booking_id}: ${row.slot_start_time} - ${row.slot_end_time} (${row.slot_label})`);
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to add columns:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Run the column addition
addSlotTimingColumns()
  .then(() => {
    console.log('\n🚀 Slot timing columns added successfully!');
    console.log('📱 Ready to make them mandatory...');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n💥 Failed to add columns:', err);
    process.exit(1);
  });
