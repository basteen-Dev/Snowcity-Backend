require('dotenv').config();
const { pool } = require('./config/db');

async function runMigration() {
  console.log('🔧 Running migration: Make slot timing mandatory...');
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('📊 Checking current booking data...');
    
    // Check current state
    const currentStats = await client.query(`
      SELECT 
        COUNT(*) as total_bookings,
        COUNT(CASE WHEN slot_start_time IS NOT NULL THEN 1 END) as with_start_time,
        COUNT(CASE WHEN slot_end_time IS NOT NULL THEN 1 END) as with_end_time,
        COUNT(CASE WHEN slot_start_time IS NULL OR slot_end_time IS NULL THEN 1 END) as missing_timing
      FROM bookings
    `);
    
    console.log('Current stats:', currentStats.rows[0]);
    
    if (currentStats.rows[0].missing_timing > 0) {
      console.log(`⚠️  Found ${currentStats.rows[0].missing_timing} bookings missing slot timing`);
      console.log('🔄 Updating missing slot timing...');
      
      // Update records with null slot timing
      const updateResult = await client.query(`
        UPDATE bookings 
        SET 
          slot_start_time = COALESCE(
            slot_start_time, 
            CASE 
              WHEN booking_time IS NOT NULL AND booking_time != '' AND booking_time !~ '^\d{2}:\d{2}:\d{2}\.\d+$' THEN booking_time
              ELSE '10:00:00'
            END
          ),
          slot_end_time = COALESCE(
            slot_end_time,
            CASE 
              WHEN booking_time IS NOT NULL AND booking_time != '' AND booking_time !~ '^\d{2}:\d{2}:\d{2}\.\d+$' THEN 
                to_char(
                  (to_date(booking_time, 'HH24:MI:SS') + interval '1 hour'), 
                  'HH24:MI:SS'
                )
              ELSE '11:00:00'
            END
          )
        WHERE slot_start_time IS NULL OR slot_end_time IS NULL
      `);
      
      console.log(`✅ Updated ${updateResult.rowCount} records with slot timing`);
    }
    
    // Add constraints
    console.log('🔒 Adding NOT NULL constraints...');
    
    try {
      await client.query(`
        ALTER TABLE bookings 
        ADD CONSTRAINT bookings_slot_start_time_not_null 
        CHECK (slot_start_time IS NOT NULL AND slot_start_time != '')
      `);
      console.log('✅ Added slot_start_time constraint');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('ℹ️  slot_start_time constraint already exists');
      } else {
        throw err;
      }
    }
    
    try {
      await client.query(`
        ALTER TABLE bookings 
        ADD CONSTRAINT bookings_slot_end_time_not_null 
        CHECK (slot_end_time IS NOT NULL AND slot_end_time != '')
      `);
      console.log('✅ Added slot_end_time constraint');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('ℹ️  slot_end_time constraint already exists');
      } else {
        throw err;
      }
    }
    
    try {
      await client.query(`
        ALTER TABLE bookings 
        ADD CONSTRAINT bookings_slot_time_valid_range 
        CHECK (slot_end_time > slot_start_time)
      `);
      console.log('✅ Added slot time range constraint');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('ℹ️  slot time range constraint already exists');
      } else {
        throw err;
      }
    }
    
    await client.query('COMMIT');
    
    // Verify the results
    console.log('\n📊 Final verification...');
    const finalStats = await client.query(`
      SELECT 
        COUNT(*) as total_bookings,
        COUNT(CASE WHEN slot_start_time IS NOT NULL THEN 1 END) as with_start_time,
        COUNT(CASE WHEN slot_end_time IS NOT NULL THEN 1 END) as with_end_time,
        COUNT(CASE WHEN slot_start_time IS NOT NULL AND slot_end_time IS NOT NULL THEN 1 END) as with_complete_timing
      FROM bookings
    `);
    
    console.log('Final stats:', finalStats.rows[0]);
    
    // Show sample records
    const sampleRecords = await client.query(`
      SELECT 
        booking_id,
        booking_ref,
        slot_start_time,
        slot_end_time,
        booking_time,
        item_type
      FROM bookings 
      ORDER BY booking_id DESC 
      LIMIT 5
    `);
    
    console.log('\n📋 Sample records:');
    sampleRecords.rows.forEach(row => {
      console.log(`- Booking ${row.booking_id}: ${row.slot_start_time} - ${row.slot_end_time} (${row.item_type})`);
    });
    
    console.log('\n✅ Migration completed successfully!');
    console.log('🎯 All bookings now have mandatory slot timing');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('\n🚀 Slot timing is now mandatory for all bookings!');
    console.log('📱 Users will see correct timing in all displays');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n💥 Migration failed:', err);
    process.exit(1);
  });
