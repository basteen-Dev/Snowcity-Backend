#!/usr/bin/env node

/**
 * Migration Runner: Add Buy X Get Y Offer Support
 * 
 * This script applies the Buy X Get Y migration to the database.
 * Run via: npm run migrate:001 or node migrations/run_001_add_buy_x_get_y_offers.js
 */

const fs = require('fs');
const path = require('path');
const pool = require('../db'); // or your DB pool export

async function runMigration() {
  const migrationPath = path.join(__dirname, '001_add_buy_x_get_y_offers.sql');
  
  if (!fs.existsSync(migrationPath)) {
    console.error(`Migration file not found: ${migrationPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');
  
  try {
    console.log('Starting migration: Add Buy X Get Y Offer Support...');
    
    // Split SQL statements by semicolon and filter empty lines
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    let count = 0;
    for (const statement of statements) {
      try {
        await pool.query(statement);
        count++;
        console.log(`✓ Executed statement ${count}`);
      } catch (err) {
        // Ignore "already exists" errors (IF NOT EXISTS)
        if (err.message.includes('already exists') || err.message.includes('duplicate')) {
          console.log(`⚠ Skipped (already exists): ${statement.substring(0, 50)}...`);
        } else {
          throw err;
        }
      }
    }

    console.log(`\n✅ Migration completed successfully (${count} statements executed)`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.error('Details:', err);
    process.exit(1);
  }
}

// Run migration
runMigration();
