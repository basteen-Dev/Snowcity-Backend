const { sendTicketForBookingInstant } = require('./services/interaktService');

async function testWhatsAppResend() {
  console.log('Testing WhatsApp ticket resend functionality...');

  // Test with booking ID 183 (the one mentioned in the error)
  const result = await sendTicketForBookingInstant(183, true); // skipConsentCheck = true for testing

  console.log('Test result:', result);

  if (result.success) {
    console.log('✅ WhatsApp ticket resend test PASSED');
  } else {
    console.log('❌ WhatsApp ticket resend test FAILED:', result.reason);
  }

  process.exit(0);
}

testWhatsAppResend().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});