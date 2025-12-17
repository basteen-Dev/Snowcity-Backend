require('dotenv').config();
const { pool } = require('./config/db');

async function testWhatsAppSQL() {
  console.log('Testing WhatsApp SQL query fixes...');

  try {
    // Test the SQL query from sendTicketForBookingInstant (our fixed version)
    const bookingId = 183;
    const bRes = await pool.query(`
      SELECT b.booking_id, u.name AS user_name, u.phone, b.ticket_pdf, b.booking_date, u.whatsapp_consent,
             COALESCE(a.title, CONCAT('Combo #', c.combo_id::text)) as item_title,
             COALESCE(ab.start_time, cb.start_time) as slot_start_time,
             COALESCE(
               STRING_AGG(
                 CONCAT(ad.title, ' (', ba.quantity, 'x)'),
                 ', '
               ),
               'None'
             ) AS addons_details
      FROM bookings b
      LEFT JOIN users u ON u.user_id = b.user_id
      LEFT JOIN attractions a ON a.attraction_id = b.attraction_id
      LEFT JOIN combos c ON c.combo_id = b.combo_id
      LEFT JOIN attraction_slots ab ON ab.slot_id = b.slot_id
      LEFT JOIN combo_slots cb ON cb.combo_slot_id = b.combo_slot_id
      LEFT JOIN booking_addons ba ON ba.booking_id = b.booking_id
      LEFT JOIN addons ad ON ad.addon_id = ba.addon_id
      WHERE b.booking_id = $1
      GROUP BY b.booking_id, u.user_id, u.name, u.phone, b.ticket_pdf, b.booking_date, u.whatsapp_consent,
               a.attraction_id, a.title, c.combo_id, ab.slot_id, ab.start_time,
               cb.combo_slot_id, cb.start_time
    `, [bookingId]);

    const bRow = bRes.rows[0];
    if (!bRow) {
      console.log('❌ Booking not found');
      return;
    }

    console.log('✅ SQL query executed successfully!');
    console.log('Booking data retrieved:', {
      booking_id: bRow.booking_id,
      user_name: bRow.user_name,
      phone: bRow.phone,
      whatsapp_consent: bRow.whatsapp_consent,
      item_title: bRow.item_title,
      slot_start_time: bRow.slot_start_time
    });

    console.log('✅ All SQL column reference fixes are working correctly!');

  } catch (error) {
    console.error('❌ SQL query failed:', error.message);
    if (error.message.includes('column') && error.message.includes('does not exist')) {
      console.error('❌ Column reference error - our fixes did not work');
    }
  } finally {
    await pool.end();
  }
}

testWhatsAppSQL().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});