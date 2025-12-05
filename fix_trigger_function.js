require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function fixTriggerFunction() {
  console.log('Fixing update_combo_details function...');
  
  try {
    // Drop the old function
    await pool.query('DROP FUNCTION IF EXISTS public.update_combo_details() CASCADE');
    console.log('Dropped old function');
    
    // Create the corrected function
    const createFunction = `
      CREATE OR REPLACE FUNCTION public.update_combo_details()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $function$
      BEGIN
        IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
          UPDATE combos 
          SET total_price = (
            SELECT COALESCE(SUM(attraction_price), 0) 
            FROM combo_attractions 
            WHERE combo_id = NEW.combo_id
          )
          WHERE combo_id = NEW.combo_id;
          RETURN COALESCE(NEW, OLD);
        ELSIF TG_OP = 'DELETE' THEN
          UPDATE combos 
          SET total_price = (
            SELECT COALESCE(SUM(attraction_price), 0) 
            FROM combo_attractions 
            WHERE combo_id = OLD.combo_id
          )
          WHERE combo_id = OLD.combo_id;
          RETURN OLD;
        END IF;
        RETURN NULL;
      END;
      $function$;
    `;
    
    await pool.query(createFunction);
    console.log('Created corrected function');
    
    // Recreate the triggers
    const createTriggers = `
      CREATE TRIGGER trg_update_combo_details
      AFTER INSERT OR UPDATE OR DELETE ON combo_attractions
      FOR EACH ROW EXECUTE FUNCTION update_combo_details();
    `;
    
    await pool.query(createTriggers);
    console.log('Recreated triggers');
    
    console.log('Function fixed successfully!');
    
  } catch (error) {
    console.error('Error fixing function:', error);
  } finally {
    await pool.end();
  }
}

fixTriggerFunction();
