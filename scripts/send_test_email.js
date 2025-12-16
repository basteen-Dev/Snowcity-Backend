// scripts/send_test_email.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const bookingId = Number(process.argv[2] || process.env.BOOKING_ID || 1);
(async () => {
  try {
    const svc = require('../services/ticketEmailService');
    console.log('Sending test ticket email for booking id', bookingId);
    const res = await svc.sendTicketEmail(bookingId);
    console.log('Result:', res);
    process.exit(0);
  } catch (err) {
    console.error('Error sending test email:', err?.message || err);
    if (err && err.stack) console.error(err.stack);
    process.exit(2);
  }
})();
