#!/usr/bin/env node

/**
 * Migration Runner: Add Meta Title Support
 *
 * This script adds meta_title columns to attractions and combos tables.
 * Run via: node migrations/run_add_meta_title.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const fs = require('fs');
const { pool } = require('../config/db'); // Import pool from config/db

async function runMigration() {
  const migrationPath = path.join(__dirname, 'add_meta_title_to_attractions_and_combos.sql');

  if (!fs.existsSync(migrationPath)) {
    console.error(`Migration file not found: ${migrationPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');

  try {
    console.log('Starting migration: Add Meta Title Support...');

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