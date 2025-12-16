const { pool } = require('../config/db');

async function addWhatsappConsentColumn() {
  try {
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_consent BOOLEAN DEFAULT false;
    `);
    console.log('✅ whatsapp_consent column added successfully');
  } catch (error) {
    console.error('❌ Failed to add whatsapp_consent column:', error.message);
  } finally {
    await pool.end();
  }
}

addWhatsappConsentColumn();