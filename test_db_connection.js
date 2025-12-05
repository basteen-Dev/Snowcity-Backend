require('dotenv').config();
const { pool } = require('./config/db');

async function testConnection() {
  console.log('🔍 Testing database connection...');
  
  try {
    const client = await pool.connect();
    console.log('✅ Connected to database');
    
    const result = await client.query('SELECT NOW() as current_time');
    console.log('📊 Current time:', result.rows[0].current_time);
    
    const bookingStats = await client.query('SELECT COUNT(*) as count FROM bookings');
    console.log('📊 Total bookings:', bookingStats.rows[0].count);
    
    client.release();
    console.log('✅ Connection test completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();
