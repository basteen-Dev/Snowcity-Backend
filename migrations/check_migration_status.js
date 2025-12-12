/**
 * Migration Status Checker for Buy X Get Y Support
 * 
 * Verifies that the database schema has been properly updated with
 * Buy X Get Y columns and constraints. Run this before deployment.
 */

const pool = require('../db');

/**
 * Check if migration has been applied
 */
async function checkMigrationStatus() {
  try {
    console.log('🔍 Checking Buy X Get Y migration status...\n');

    // 1. Check ENUM value
    const enumCheck = await pool.query(`
      SELECT enum_range(NULL::offer_rule_type) as enum_values;
    `);
    
    const enumValues = enumCheck.rows[0]?.enum_values || '';
    const hasBuyXGetY = enumValues.includes('buy_x_get_y');
    console.log(`✓ offer_rule_type ENUM: ${hasBuyXGetY ? '✅ has buy_x_get_y' : '❌ missing buy_x_get_y'}`);
    console.log(`  Values: ${enumValues}\n`);

    // 2. Check offer_rules columns
    const columnCheck = await pool.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'offer_rules' 
      AND column_name IN ('buy_qty', 'get_qty', 'get_target_type', 'get_target_id', 'get_discount_type', 'get_discount_value')
      ORDER BY ordinal_position;
    `);

    const expectedColumns = ['buy_qty', 'get_qty', 'get_target_type', 'get_target_id', 'get_discount_type', 'get_discount_value'];
    const foundColumns = columnCheck.rows.map(r => r.column_name);
    
    console.log('✓ offer_rules columns:');
    for (const col of expectedColumns) {
      const found = foundColumns.includes(col);
      const details = columnCheck.rows.find(r => r.column_name === col);
      console.log(`  ${found ? '✅' : '❌'} ${col}${details ? ` (${details.data_type}, default: ${details.column_default})` : ' - NOT FOUND'}`);
    }
    console.log();

    // 3. Check constraints
    const constraintCheck = await pool.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'offer_rules' 
      AND constraint_type = 'CHECK'
      AND constraint_name LIKE '%buy_%'
      ORDER BY constraint_name;
    `);

    console.log(`✓ CHECK constraints for Buy X Get Y: ${constraintCheck.rows.length} found`);
    constraintCheck.rows.forEach(row => {
      console.log(`  - ${row.constraint_name}`);
    });
    console.log();

    // 4. Check offer_summary VIEW
    const viewCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_name = 'offer_summary';
    `);

    console.log(`✓ offer_summary VIEW: ${viewCheck.rows.length > 0 ? '✅ exists' : '❌ not found'}\n`);

    // 5. Final status
    const allChecks = hasBuyXGetY && foundColumns.length === 6 && constraintCheck.rows.length >= 3 && viewCheck.rows.length > 0;
    
    if (allChecks) {
      console.log('🎉 All migration checks passed! Buy X Get Y support is fully enabled.');
      return true;
    } else {
      console.log('⚠️  Some migration components are missing. Run the migration script before deployment.');
      return false;
    }

  } catch (err) {
    console.error('❌ Error checking migration status:', err.message);
    return false;
  }
}

module.exports = { checkMigrationStatus };

// Run check if called directly
if (require.main === module) {
  checkMigrationStatus().then(success => {
    process.exit(success ? 0 : 1);
  });
}
