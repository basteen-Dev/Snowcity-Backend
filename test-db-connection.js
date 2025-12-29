const { Pool } = require('pg');

async function testConnection() {
  const pool = new Pool({
    connectionString: 'postgresql://root:E5zkE4XyQBaT0LUXFF1rQCVVGybFHMH2@dpg-d591fkruibrs73b0tps0-a.singapore-postgres.render.com/snowcity_553z',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000, // 5 seconds timeout
  });

  try {
    console.log('🔌 Testing database connection...');
    const client = await pool.connect();
    console.log('✅ Successfully connected to the database!');
    client.release();
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
  } finally {
    await pool.end();
  }
}

testConnection();
