const fs = require('fs');
const path = require('path');
const logger = require('./logger');

// Zeptomail configuration
// Required env vars: ZEPTOMAIL_URL, ZEPTOMAIL_TOKEN, MAIL_FROM
const ZEPTO_URL = process.env.ZEPTOMAIL_URL || 'https://api.zeptomail.com/v1.1/email';
const ZEPTO_TOKEN = process.env.ZEPTOMAIL_TOKEN || process.env.ZEPTOMAIL_API_KEY || null;
const MAIL_FROM = process.env.MAIL_FROM || process.env.MAIL_FROM_ADDRESS || 'noreply@snowcityblr.com';

let ZeptoClient = null;
let client = null;
try {
  const { SendMailClient } = require('zeptomail');
  ZeptoClient = SendMailClient;
  if (ZEPTO_TOKEN) {
    client = new ZeptoClient({ url: ZEPTO_URL, token: ZEPTO_TOKEN });
    logger.info('Zeptomail client configured');
  } else {
    logger.warn('Zeptomail token not set; email sending is disabled until ZEPTOMAIL_TOKEN is provided');
  }
} catch (err) {
  logger.warn('Zeptomail SDK not installed; please npm install zeptomail to enable email sending');
}

async function buildAttachments(attachments = []) {
  const out = [];
  for (const a of attachments || []) {
    try {
      if (a.path && fs.existsSync(a.path)) {
        const buffer = fs.readFileSync(a.path);
        out.push({ name: a.filename || path.basename(a.path), content: buffer.toString('base64'), contentType: a.contentType || 'application/octet-stream' });
      } else if (a.content && a.filename) {
        // assume content is a Buffer or base64 string
        const content = Buffer.isBuffer(a.content) ? a.content.toString('base64') : String(a.content);
        out.push({ name: a.filename, content, contentType: a.contentType || 'application/octet-stream' });
      }
    } catch (e) {
      logger.warn('Failed to prepare attachment', { err: e.message, attachment: a.filename || a.path });
    }
  }
  return out;
}

async function sendMail({ to, subject, html, text, attachments = [] }) {
  if (!client) {
    const err = new Error('Zeptomail client not configured (missing ZEPTOMAIL_TOKEN or SDK)');
    logger.warn('Attempted to send email without Zeptomail configuration', { to, subject });
    throw err;
  }

  const toList = Array.isArray(to) ? to : [{ email_address: { address: String(to) } }];
  // If to is a simple string, convert to zeptomail expected shape
  if (!Array.isArray(to) && typeof to === 'string') {
    // handled above
  } else if (Array.isArray(to) && to.length && typeof to[0] === 'string') {
    // array of emails
    toList.length = 0;
    for (const t of to) toList.push({ email_address: { address: String(t) } });
  } else if (Array.isArray(to) && to.length && to[0] && to[0].email_address) {
    // already shaped
  }

  const preparedAttachments = await buildAttachments(attachments);

  const payload = {
    from: { address: MAIL_FROM, name: process.env.MAIL_FROM_NAME || 'SnowCity' },
    to: toList,
    subject: subject || '',
    htmlbody: html || (text ? `<pre>${text}</pre>` : ''),
  };

  if (preparedAttachments.length) {
    payload.attachments = preparedAttachments.map((a) => ({ name: a.name, content: a.content, mime_type: a.contentType }));
  }

  try {
    const resp = await client.sendMail(payload);
    logger.info('Email sent via Zeptomail', { to, subject, resp: resp?.response || null });
    return resp;
  } catch (err) {
    logger.error('Zeptomail sendMail failed', { err: err?.message || err });
    throw err;
  }
}

module.exports = {
  client,
  sendMail,
};