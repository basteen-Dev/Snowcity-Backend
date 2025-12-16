"use strict";

const axios = require('axios');
const { pool } = require('../config/db');
const { APP_URL, interakt } = require('../config/messaging');

const INTERAKT_URL = interakt?.apiUrl || process.env.INTERAKT_API_URL || null;
const INTERAKT_KEY = interakt?.apiKey || process.env.INTERAKT_API_KEY || null;
const FIXED_APP_URL = APP_URL ? APP_URL.split(',')[0].trim() : null;

function normalizePhone(p) {
  if (!p) return null;
  let s = String(p).trim();
  s = s.replace(/[^0-9]/g, '');
  if (s.startsWith('91') && s.length === 12) {
    return { countryCode: '+91', phoneNumber: s.slice(2) };
  } else if (s.length === 10) {
    return { countryCode: '+91', phoneNumber: s };
  } else if (s.length > 10) {
    return { countryCode: '+91', phoneNumber: s.slice(-10) };
  }
  return null;
}

async function axiosPostWithRetries(url, payload, options = {}, retries = 3, backoffMs = 1000) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const start = Date.now();
    try {
      const res = await axios.post(url, payload, options);
      const dur = Date.now() - start;
      console.log(`axiosPostWithRetries success: ${url} attempt=${attempt} duration=${dur}ms`);
      return res;
    } catch (err) {
      const dur = Date.now() - start;
      const status = err?.response?.status || 'NO_STATUS';
      console.warn(`axiosPostWithRetries error: ${url} attempt=${attempt} duration=${dur}ms status=${status}`);
      if (attempt === retries) throw err;
      const wait = backoffMs * Math.pow(2, attempt - 1);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

async function sendWhatsApp({ to, text, mediaUrl } = {}) {
  if (!INTERAKT_URL || !INTERAKT_KEY) {
    console.log('Interakt not configured - skipping WhatsApp send');
    return { success: false, reason: 'not-configured' };
  }
  if (!to) return { success: false, reason: 'missing-recipient' };

  const phone = normalizePhone(to);
  if (!phone) return { success: false, reason: 'invalid-phone' };

  const payload = {
    countryCode: phone.countryCode,
    phoneNumber: phone.phoneNumber,
    callbackData: 'ticket-send',
    type: mediaUrl ? 'Document' : 'Text',
    data: mediaUrl
      ? { message: text || 'Your ticket is attached.', mediaUrl }
      : { message: text || '' }
  };

  console.log('Interakt sending to:', phone.countryCode + phone.phoneNumber, 'payload:', JSON.stringify(payload));

  try {
    const opts = {
      headers: { Authorization: `Basic ${INTERAKT_KEY}`, 'Content-Type': 'application/json' },
      timeout: 60000
    };
    const res = await axiosPostWithRetries(INTERAKT_URL, payload, opts, 3, 1000);
    return { success: true, response: res.data };
  } catch (err) {
    console.error('Interakt send error:', err?.response?.status, err?.response?.data || err?.message || err);
    return { success: false, reason: err?.response?.status || err?.message || 'request-failed' };
  }
}

async function sendTicketForBooking(bookingId, skipConsentCheck = false) {
  if (!bookingId) return { success: false, reason: 'missing-bookingId' };

  // Fetch booking with slot start from slots if available
  const comboTitleExpr = `COALESCE(NULLIF(CONCAT_WS(' + ', NULLIF(a1.title, ''), NULLIF(a2.title, '')), ''), CONCAT('Combo #', c.combo_id::text))`;
  const itemTitleExpr = `CASE WHEN b.item_type = 'Combo' THEN ${comboTitleExpr} ELSE a.title END`;

  const bRes = await pool.query(`
    SELECT
      b.*,
      u.name AS user_name, u.phone, u.email, u.whatsapp_consent,
      ${itemTitleExpr} AS item_title,
      COALESCE(s.start_time, cs.start_time, b.slot_start_time) AS slot_start_time,
      b.created_at AS booking_date
    FROM bookings b
    LEFT JOIN users u ON u.user_id = b.user_id
    LEFT JOIN attractions a ON a.attraction_id = b.attraction_id
    LEFT JOIN combos c ON c.combo_id = b.combo_id
    LEFT JOIN attractions a1 ON a1.attraction_id = c.attraction_1_id
    LEFT JOIN attractions a2 ON a2.attraction_id = c.combo_id
    LEFT JOIN attraction_slots s ON s.slot_id = b.slot_id
    LEFT JOIN combo_slots cs ON cs.combo_slot_id = b.combo_slot_id
    WHERE b.booking_id = $1
  `, [bookingId]);

  const bRow = bRes.rows[0];
  if (!bRow) return { success: false, reason: 'booking-not-found' };

  console.log('DEBUG booking row:', {
    booking_id: bRow.booking_id,
    user_name: bRow.user_name,
    item_title: bRow.item_title,
    slot_start_time: bRow.slot_start_time,
    phone: bRow.phone,
    ticket_pdf: bRow.ticket_pdf
  });

  if (!skipConsentCheck && !bRow.whatsapp_consent) {
    console.log('User has not consented to WhatsApp - skipping send');
    return { success: false, reason: 'no-consent' };
  }

  if (!bRow.phone) return { success: false, reason: 'no-phone' };
  const ticketPath = bRow.ticket_pdf || null;
  const mediaUrl = ticketPath ? `${FIXED_APP_URL}${ticketPath}` : null;
  if (!mediaUrl) return { success: false, reason: 'no-ticket-pdf' };

  // Build slotDateTime: try to combine booking_date + slot_start_time when slot_start_time is a time string
  let slotDateTime = 'TBD';
  try {
    if (bRow.slot_start_time) {
      // slot_start_time might be TIME like '10:00:00' or a full datetime
      if (/^\d{2}:\d{2}:?\d{0,2}$/.test(String(bRow.slot_start_time))) {
        const bookingDate = new Date(bRow.booking_date || Date.now());
        const [hh, mm, ss] = String(bRow.slot_start_time).split(':').map((v) => Number(v || 0));
        bookingDate.setHours(hh || 0, mm || 0, ss || 0, 0);
        slotDateTime = bookingDate.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: 'short', day: 'numeric' }) +
          ' at ' + bookingDate.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
      } else {
        // assume it's a full datetime
        const d = new Date(bRow.slot_start_time);
        slotDateTime = d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: 'short', day: 'numeric' }) +
          ' at ' + d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
      }
    }
  } catch (e) {
    console.warn('Failed to compute slotDateTime:', e);
    slotDateTime = 'TBD';
  }

  const phone = normalizePhone(bRow.phone);
  if (!phone) return { success: false, reason: 'invalid-phone' };

  const payload = {
    countryCode: phone.countryCode,
    phoneNumber: phone.phoneNumber,
    callbackData: `ticket-${bRow.booking_id}`,
    type: 'Template',
    template: {
      name: 'ticket_pdf_confirmation',
      languageCode: 'en',
      headerValues: [mediaUrl],
      fileName: `ticket-${bRow.booking_id}.pdf`,
      bodyValues: [
        bRow.user_name || 'Guest',
        bRow.item_title || 'Activity',
        slotDateTime,
        String(bRow.booking_id)
      ]
    }
  };

  console.log('Interakt template send payload:', JSON.stringify(payload, null, 2));

  try {
    const opts = { headers: { Authorization: `Basic ${INTERAKT_KEY}`, 'Content-Type': 'application/json' }, timeout: 60000 };
    const res = await axiosPostWithRetries(INTERAKT_URL, payload, opts, 3, 1500);
    console.log('Interakt ticket sent successfully:', res.data);
    return { success: true, response: res.data };
  } catch (err) {
    console.error('Interakt template send error:', err?.response?.status, err?.response?.data || err?.message || err);
    return { success: false, reason: err?.response?.status || err?.message || 'request-failed' };
  }
}

async function addContact({ phone, name, email, userId }) {
  if (!INTERAKT_KEY) {
    console.log('Interakt not configured - skipping contact add');
    return { success: false, reason: 'not-configured' };
  }
  if (!phone) return { success: false, reason: 'missing-phone' };

  if (userId) {
    const consentRes = await pool.query('SELECT whatsapp_consent FROM users WHERE user_id = $1', [userId]);
    const user = consentRes.rows[0];
    if (!user || !user.whatsapp_consent) {
      console.log('User has not consented to WhatsApp - skipping contact add');
      return { success: false, reason: 'no-consent' };
    }
  }

  const phoneNormalized = normalizePhone(phone);
  if (!phoneNormalized) return { success: false, reason: 'invalid-phone' };

  const contactPayload = {
    phoneNumber: phoneNormalized.phoneNumber,
    countryCode: phoneNormalized.countryCode,
    traits: {
      name: name || 'Guest',
      email: email || '',
      source: 'SnowCity Booking',
      whatsapp_opted_in: true
    },
    add_to_sales_cycle: true,
    createdAt: new Date().toISOString(),
    tags: ['snowcity-customer']
  };

  console.log('Interakt addContact payload:', JSON.stringify(contactPayload, null, 2));

  try {
    const INTERAKT_CONTACT_URL = 'https://api.interakt.ai/v1/public/track/users/';
    const opts = { headers: { Authorization: `Basic ${INTERAKT_KEY}`, 'Content-Type': 'application/json' }, timeout: 60000 };
    const res = await axiosPostWithRetries(INTERAKT_CONTACT_URL, contactPayload, opts, 3, 1000);
    console.log('Interakt contact added successfully:', res.data);
    return { success: true, response: res.data };
  } catch (err) {
    if (err?.response?.status === 409) return { success: true, reason: 'already-exists' };
    console.error('Interakt add contact error:', err?.response?.status, err?.response?.data || err?.message);
    return { success: false, reason: err?.response?.status || 'request-failed' };
  }
}

module.exports = { sendWhatsApp, sendTicketForBooking, addContact };
