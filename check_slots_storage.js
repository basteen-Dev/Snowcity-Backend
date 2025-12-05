require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkSlotsStorage() {
  console.log('Checking if slots are stored in database...');
  
  try {
    // Check combo slots
    const comboSlotsCount = await pool.query('SELECT COUNT(*) as count FROM combo_slots');
    console.log('\n=== COMBO SLOTS ===');
    console.log(`Total combo slots in database: ${comboSlotsCount.rows[0].count}`);
    
    if (comboSlotsCount.rows[0].count > 0) {
      const comboSlotsSample = await pool.query(`
        SELECT combo_slot_id, combo_id, start_date, start_time, end_time, capacity, price, available
        FROM combo_slots 
        ORDER BY created_at DESC 
        LIMIT 5
      `);
      
      console.log('\nRecent combo slots:');
      comboSlotsSample.rows.forEach(slot => {
        console.log(`  - Combo Slot ${slot.combo_slot_id}: Combo ${slot.combo_id}, ${slot.start_date} ${slot.start_time} → ${slot.end_time} (Capacity: ${slot.capacity})`);
      });
    }
    
    // Check attraction slots
    const attractionSlotsCount = await pool.query('SELECT COUNT(*) as count FROM attraction_slots');
    console.log('\n=== ATTRACTION SLOTS ===');
    console.log(`Total attraction slots in database: ${attractionSlotsCount.rows[0].count}`);
    
    if (attractionSlotsCount.rows[0].count > 0) {
      const attractionSlotsSample = await pool.query(`
        SELECT slot_id, attraction_id, start_date, start_time, end_time, capacity, price, available
        FROM attraction_slots 
        ORDER BY created_at DESC 
        LIMIT 5
      `);
      
      console.log('\nRecent attraction slots:');
      attractionSlotsSample.rows.forEach(slot => {
        console.log(`  - Attraction Slot ${slot.slot_id}: Attraction ${slot.attraction_id}, ${slot.start_date} ${slot.start_time} → ${slot.end_time} (Capacity: ${slot.capacity})`);
      });
    }
    
    // Check attractions and combos count
    const attractionsCount = await pool.query('SELECT COUNT(*) as count FROM attractions');
    const combosCount = await pool.query('SELECT COUNT(*) as count FROM combos');
    
    console.log('\n=== ENTITIES ===');
    console.log(`Total attractions: ${attractionsCount.rows[0].count}`);
    console.log(`Total combos: ${combosCount.rows[0].count}`);
    
    // Check slot distribution by date
    const slotDistribution = await pool.query(`
      SELECT 
        'combo' as type, start_date, COUNT(*) as count 
      FROM combo_slots 
      GROUP BY start_date
      UNION ALL
      SELECT 
        'attraction' as type, start_date, COUNT(*) as count 
      FROM attraction_slots 
      GROUP BY start_date
      ORDER BY start_date, type
      LIMIT 10
    `);
    
    console.log('\n=== SLOT DISTRIBUTION BY DATE ===');
    slotDistribution.rows.forEach(row => {
      console.log(`${row.type.toUpperCase()}: ${row.start_date} → ${row.count} slots`);
    });
    
    // Check if slots are linked to attractions/combos
    const slotLinkage = await pool.query(`
      SELECT 
        a.attraction_id, a.title, COUNT(asl.slot_id) as slot_count
      FROM attractions a
      LEFT JOIN attraction_slots asl ON a.attraction_id = asl.attraction_id
      GROUP BY a.attraction_id, a.title
      ORDER BY slot_count DESC
      LIMIT 5
    `);
    
    console.log('\n=== ATTRACTION-SLOT LINKAGE ===');
    slotLinkage.rows.forEach(row => {
      console.log(`Attraction ${row.attraction_id} (${row.title}): ${row.slot_count} slots`);
    });
    
    const comboSlotLinkage = await pool.query(`
      SELECT 
        c.combo_id, c.name, COUNT(csl.combo_slot_id) as slot_count
      FROM combos c
      LEFT JOIN combo_slots csl ON c.combo_id = csl.combo_id
      GROUP BY c.combo_id, c.name
      ORDER BY slot_count DESC
      LIMIT 5
    `);
    
    console.log('\n=== COMBO-SLOT LINKAGE ===');
    comboSlotLinkage.rows.forEach(row => {
      console.log(`Combo ${row.combo_id} (${row.name}): ${row.slot_count} slots`);
    });
    
    console.log('\n✅ SLOT STORAGE STATUS:');
    if (comboSlotsCount.rows[0].count > 0 || attractionSlotsCount.rows[0].count > 0) {
      console.log('🎉 Slots ARE stored in the database!');
      console.log(`📊 Total: ${comboSlotsCount.rows[0].count} combo slots + ${attractionSlotsCount.rows[0].count} attraction slots`);
    } else {
      console.log('❌ No slots found in the database');
      console.log('🔧 This means automatic slot generation is not working');
    }
    
  } catch (error) {
    console.error('Error checking slot storage:', error);
  } finally {
    await pool.end();
  }
}

checkSlotsStorage();
