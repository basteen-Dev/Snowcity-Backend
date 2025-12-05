require('dotenv').config();
const { pool } = require('./config/db');

async function checkSchema() {
  console.log('📋 Checking current bookings table schema...');
  
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'bookings' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📊 Current bookings table schema:');
    result.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Check if slot timing columns exist
    const hasSlotStartTime = result.rows.some(col => col.column_name === 'slot_start_time');
    const hasSlotEndTime = result.rows.some(col => col.column_name === 'slot_end_time');
    
    console.log('\n🔍 Slot timing columns:');
    console.log(`- slot_start_time exists: ${hasSlotStartTime ? '✅' : '❌'}`);
    console.log(`- slot_end_time exists: ${hasSlotEndTime ? '✅' : '❌'}`);
    
    if (!hasSlotStartTime || !hasSlotEndTime) {
      console.log('\n⚠️  Slot timing columns need to be added first!');
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    client.release();
    process.exit(0);
  }
}

checkSchema();
