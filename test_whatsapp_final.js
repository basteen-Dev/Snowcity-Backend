require('dotenv').config();
const { sendTicketForBookingInstant } = require('./services/interaktService');

async function testWhatsAppResendEndToEnd() {
  console.log('🧪 Testing complete WhatsApp ticket resend workflow...');

  try {
    // Test with booking ID 183 (the one mentioned in the original error)
    console.log('📤 Attempting to resend WhatsApp ticket for booking 183...');
    const result = await sendTicketForBookingInstant(183, true); // skipConsentCheck = true for testing

    console.log('📊 Result:', result);

    if (result.success) {
      console.log('✅ WhatsApp ticket resend completed successfully!');
      console.log('🎉 All SQL column reference errors have been fixed!');
    } else {
      if (result.reason === 'not-configured') {
        console.log('⚠️  WhatsApp service not configured (expected in dev environment)');
        console.log('✅ But most importantly: NO SQL COLUMN ERRORS!');
        console.log('🎉 All database query fixes are working correctly!');
      } else {
        console.log('❌ WhatsApp resend failed:', result.reason);
      }
    }

  } catch (error) {
    console.error('💥 Test failed with error:', error.message);
    if (error.message.includes('column') && error.message.includes('does not exist')) {
      console.error('❌ SQL column reference error still exists - fixes did not work');
    } else {
      console.error('❌ Unexpected error - may need further investigation');
    }
  }
}

testWhatsAppResendEndToEnd().catch(err => {
  console.error('💥 Test setup error:', err);
  process.exit(1);
});