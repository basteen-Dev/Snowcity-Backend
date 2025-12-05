require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkAttractionSlotsTable() {
  console.log('Checking attraction_slots table structure...');
  
  try {
    // Check if table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'attraction_slots'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('attraction_slots table does not exist. Creating it...');
      
      // Create the table
      await pool.query(`
        CREATE TABLE attraction_slots (
          attraction_slot_id BIGSERIAL PRIMARY KEY,
          attraction_id BIGINT NOT NULL,
          slot_code VARCHAR(255) NOT NULL,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          start_time TIME NOT NULL,
          end_time TIME NOT NULL,
          capacity INTEGER NOT NULL DEFAULT 20,
          price DECIMAL(10,2) DEFAULT 0,
          available BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      
      // Add indexes
      await pool.query(`
        CREATE UNIQUE INDEX uq_attraction_slots_window 
        ON attraction_slots (attraction_id, start_date, end_date, start_time, end_time);
      `);
      
      await pool.query(`
        CREATE UNIQUE INDEX uq_attraction_slots_code 
        ON attraction_slots (attraction_id, slot_code);
      `);
      
      await pool.query(`
        CREATE UNIQUE INDEX uq_attraction_slot_code 
        ON attraction_slots (slot_code);
      `);
      
      console.log('attraction_slots table created successfully!');
    } else {
      console.log('attraction_slots table already exists');
      
      // Get table columns
      const columnsResult = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'attraction_slots'
        ORDER BY ordinal_position
      `);
      
      console.log('Attraction slots table columns:');
      console.log(columnsResult.rows);
      
      // Get constraints
      const constraintsResult = await pool.query(`
        SELECT conname, contype, pg_get_constraintdef(oid) as definition
        FROM pg_constraint 
        WHERE conrelid = 'attraction_slots'::regclass
      `);
      
      console.log('Attraction slots table constraints:');
      console.log(constraintsResult.rows);
    }
    
  } catch (error) {
    console.error('Error checking/creating table:', error);
  } finally {
    await pool.end();
  }
}

checkAttractionSlotsTable();
