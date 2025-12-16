const axios = require('axios');
const logger = require('./logger');

const apiKey = process.env.INTERAKT_API_KEY;

const client = axios.create({
  baseURL: 'https://api.interakt.ai/v1/public',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`
  }
});

if (!apiKey) {
  logger.warn('Interakt API key not configured. Missing INTERAKT_API_KEY environment variable.');
}

async function sendWhatsApp({ to, body, mediaUrl = null, fileName = null }) {
  if (!apiKey) throw new Error('Interakt not configured - missing API key');
  
  // Extract country code and phone number
  let phoneNumber = to;
  let countryCode = '+91'; // Default to India
  
  if (to.startsWith('+')) {
    countryCode = to.substring(0, 3);
    phoneNumber = to.substring(3);
  } else if (to.startsWith('whatsapp:+')) {
    countryCode = to.substring(9, 12);
    phoneNumber = to.substring(12);
  } else if (to.startsWith('whatsapp:')) {
    phoneNumber = to.substring(9);
  }

  // Remove any non-digit characters from phone number
  phoneNumber = phoneNumber.replace(/\D/g, '');

  const payload = {
    countryCode,
    phoneNumber,
    type: "Template",
    template: {
      name: "ticket_confirmation", // Template name to be configured in Interakt
      languageCode: "en",
      bodyValues: [
        body // Message body as first parameter
      ]
    }
  };

  // Add media if provided (for PDF attachment)
  if (mediaUrl && fileName) {
    payload.template.headerValues = [mediaUrl];
    payload.template.fileName = fileName;
  }

  try {
    const response = await client.post('/message/', payload);
    logger.info('WhatsApp message sent via Interakt', { 
      messageId: response.data.id, 
      to: `${countryCode}${phoneNumber}` 
    });
    return response.data;
  } catch (error) {
    logger.error('Failed to send WhatsApp message via Interakt', { 
      error: error.message, 
      response: error.response?.data 
    });
    throw new Error(`Interakt API error: ${error.response?.data?.message || error.message}`);
  }
}

async function sendSMS({ to, body }) {
  // Interakt focuses on WhatsApp, so we'll keep SMS functionality minimal
  logger.warn('SMS functionality not implemented for Interakt - please use WhatsApp');
  throw new Error('SMS not supported via Interakt - use WhatsApp instead');
}

module.exports = {
  client,
  sendWhatsApp,
  sendSMS
};
