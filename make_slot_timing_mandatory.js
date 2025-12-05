require('dotenv').config();
const { pool } = require('./config/db');

async function makeSlotTimingMandatory() {
  console.log('🔒 Making slot timing mandatory in bookings table...');
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    console.log('✅ Transaction started');
    
    // Add NOT NULL constraint for slot_start_time
    console.log('🔒 Adding NOT NULL constraint for slot_start_time...');
    try {
      await client.query(`
        ALTER TABLE bookings 
        ALTER COLUMN slot_start_time SET NOT NULL
      `);
      console.log('✅ slot_start_time is now mandatory');
    } catch (err) {
      if (err.message.includes('already exists') || err.message.includes('already not null')) {
        console.log('ℹ️  slot_start_time constraint already exists');
      } else {
        throw err;
      }
    }
    
    // Add NOT NULL constraint for slot_end_time
    console.log('🔒 Adding NOT NULL constraint for slot_end_time...');
    try {
      await client.query(`
        ALTER TABLE bookings 
        ALTER COLUMN slot_end_time SET NOT NULL
      `);
      console.log('✅ slot_end_time is now mandatory');
    } catch (err) {
      if (err.message.includes('already exists') || err.message.includes('already not null')) {
        console.log('ℹ️  slot_end_time constraint already exists');
      } else {
        throw err;
      }
    }
    
    // Add check constraint to ensure end_time is after start_time
    console.log('🔒 Adding check constraint for slot time range...');
    try {
      await client.query(`
        ALTER TABLE bookings 
        ADD CONSTRAINT bookings_slot_time_valid_range 
        CHECK (slot_end_time > slot_start_time)
      `);
      console.log('✅ Slot time range constraint added');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('ℹ️  Slot time range constraint already exists');
      } else {
        throw err;
      }
    }
    
    // Add default values for future insertions
    console.log('🔧 Setting default values for slot timing...');
    try {
      await client.query(`
        ALTER TABLE bookings 
        ALTER COLUMN slot_start_time SET DEFAULT '10:00:00'::TIME
      `);
      console.log('✅ Default value set for slot_start_time');
    } catch (err) {
      console.log('ℹ️  Default value already exists or not needed');
    }
    
    try {
      await client.query(`
        ALTER TABLE bookings 
        ALTER COLUMN slot_end_time SET DEFAULT '11:00:00'::TIME
      `);
      console.log('✅ Default value set for slot_end_time');
    } catch (err) {
      console.log('ℹ️  Default value already exists or not needed');
    }
    
    await client.query('COMMIT');
    console.log('✅ Transaction committed');
    
    // Verify the changes
    console.log('\n📊 Verifying constraints...');
    const constraints = await client.query(`
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        cc.check_clause
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
      WHERE tc.table_name = 'bookings' 
        AND tc.constraint_type IN ('CHECK', 'NOT NULL')
        AND (tc.constraint_name LIKE '%slot%' OR cc.check_clause LIKE '%slot%')
    `);
    
    console.log('🔍 Slot timing constraints:');
    constraints.rows.forEach(constraint => {
      console.log(`- ${constraint.constraint_name}: ${constraint.constraint_type}`);
      if (constraint.check_clause) {
        console.log(`  Check: ${constraint.check_clause}`);
      }
    });
    
    // Check column info
    console.log('\n📋 Column information:');
    const columns = await client.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'bookings' 
        AND column_name IN ('slot_start_time', 'slot_end_time', 'slot_label')
      ORDER BY column_name
    `);
    
    columns.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default})`);
    });
    
    console.log('\n✅ Slot timing is now mandatory!');
    console.log('🎯 All new bookings must have slot_start_time and slot_end_time');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to make slot timing mandatory:', error.message);
    throw error;
  } finally {
    client.release();
    console.log('✅ Database connection released');
  }
}

makeSlotTimingMandatory()
  .then(() => {
    console.log('\n🚀 Slot timing is now mandatory for all bookings!');
    console.log('📱 Users will see correct timing in all displays');
    console.log('🔍 Backend will enforce slot timing for new bookings');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n💥 Failed to make slot timing mandatory:', err);
    process.exit(1);
  });
