const { sendSMS, sendWhatsApp, client } = require('../config/interakt');

async function sendSms({ to, body }) {
  return sendSMS({ to, body });
}

async function sendWhatsapp({ to, body, mediaUrl = null, fileName = null }) {
  return sendWhatsApp({ to, body, mediaUrl, fileName });
}

module.exports = {
  client,
  sendSms,
  sendWhatsapp,
};