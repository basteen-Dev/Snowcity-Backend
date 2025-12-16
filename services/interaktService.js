"use strict";

const axios = require('axios');
const { pool } = require('../config/db');
const { APP_URL, interakt } = require('../config/messaging');

const INTERAKT_URL = interakt?.apiUrl || null;
const INTERAKT_KEY = interakt?.apiKey || null;

// Fix APP_URL if it has comma
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
    // Take last 10 digits
    return { countryCode: '+91', phoneNumber: s.slice(-10) };
  } else {
    return null; // Invalid
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

  console.log('Interakt phone normalization:', { original: to, normalized: phone });

  const payload = {
    countryCode: phone.countryCode,
    phoneNumber: phone.phoneNumber,
    callbackData: 'ticket-send',
    type: mediaUrl ? 'Document' : 'Text',
    data: mediaUrl ? {
      message: text || 'Your ticket is attached.',
      mediaUrl: mediaUrl
    } : {
      message: text || ''
    }
  };

  console.log('Interakt sending to:', phone.countryCode + phone.phoneNumber, 'payload:', JSON.stringify(payload, null, 2));

  try {
    const res = await axios.post(INTERAKT_URL, payload, {
      headers: { 
        Authorization: `Basic ${INTERAKT_KEY}`, 
        'Content-Type': 'application/json' 
      },
      timeout: 10000
    });
    return { success: true, response: res.data };
  } catch (err) {
    console.error('Interakt send error:', err?.response?.status, err?.response?.data || err?.message || err);
    return { success: false, reason: err?.response?.status || err?.message || 'request-failed' };
  }
}

async function sendTicketForBooking(bookingId, skipConsentCheck = false) {
  if (!bookingId) return { success: false, reason: 'missing-bookingId' };

  // Get booking details with item title and slot time
  const comboTitleExpr = `COALESCE(NULLIF(CONCAT_WS(' + ', NULLIF(a1.title, ''), NULLIF(a2.title, '')), ''), CONCAT('Combo #', c.combo_id::text))`;
  const itemTitleExpr = `CASE WHEN b.item_type = 'Combo' THEN ${comboTitleExpr} ELSE a.title END`;
  const bRes = await pool.query(`
    SELECT
      b.*,
      u.name AS user_name, u.phone, u.email, u.whatsapp_consent,
      ${itemTitleExpr} AS item_title,
      b.slot_start_time,
      b.created_at AS booking_date
    FROM bookings b
    LEFT JOIN users u ON u.user_id = b.user_id
    LEFT JOIN attractions a ON a.attraction_id = b.attraction_id
    LEFT JOIN combos c ON c.combo_id = b.combo_id
    LEFT JOIN attractions a1 ON a1.attraction_id = c.attraction_1_id
    LEFT JOIN attractions a2 ON a2.attraction_id = c.attraction_2_id
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

  // Format date and time
  console.log('DEBUG slot_start_time:', bRow.slot_start_time, 'booking_date:', bRow.booking_date);
  let slotDateTime = 'TBD';
  if (bRow.slot_start_time && bRow.booking_date) {
    try {
      // Combine booking date with slot time
      const bookingDate = new Date(bRow.booking_date);
      const [hours, minutes, seconds] = bRow.slot_start_time.split(':').map(Number);
      
      // Set the time on the booking date
      bookingDate.setHours(hours, minutes, seconds || 0);
      
      console.log('DEBUG combined datetime:', bookingDate);
      
      // Format as "Dec 16, 2025 at 2:30 PM"
      slotDateTime = bookingDate.toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }) + ' at ' + bookingDate.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit'
      });
      console.log('DEBUG formatted dateTime:', slotDateTime);
    } catch (e) {
      console.error('Error formatting date:', e);
      slotDateTime = 'TBD';
    }
  }

  // Template payload
  const payload = {
    countryCode: '+91', // Assuming Indian numbers
    phoneNumber: bRow.phone.replace(/^\+91/, ''), // Remove country code if present
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
        bRow.booking_id.toString()
      ]
    }
  };

  console.log('Interakt template send payload:', JSON.stringify(payload, null, 2));

  try {
    const res = await axios.post(INTERAKT_URL, payload, {
      headers: { 
        Authorization: `Basic ${INTERAKT_KEY}`, 
        'Content-Type': 'application/json' 
      },
      timeout: 10000
    });
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

  // WhatsApp consent check
  if (userId) {
    const consentRes = await pool.query(
      'SELECT whatsapp_consent FROM users WHERE user_id = $1',
      [userId]
    );
    const user = consentRes.rows[0];
    if (!user || !user.whatsapp_consent) {
      console.log('User has not consented to WhatsApp - skipping contact add');
      return { success: false, reason: 'no-consent' };
    }
  }

  const phoneNormalized = normalizePhone(phone);
  if (!phoneNormalized) return { success: false, reason: 'invalid-phone' };

  const payload = {
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

  console.log('Interakt addContact payload:', JSON.stringify(payload, null, 2));

  try {
    const INTERAKT_CONTACT_URL = 'https://api.interakt.ai/v1/public/track/users/';

    const res = await axios.post(
      INTERAKT_CONTACT_URL,
      payload,
      {
        headers: {
          Authorization: `Basic ${INTERAKT_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    console.log('Interakt contact added successfully:', res.data);
    return { success: true, response: res.data };

  } catch (err) {
    if (err?.response?.status === 409) {
      console.log('Interakt contact already exists');
      return { success: true, reason: 'already-exists' };
    }

    console.error(
      'Interakt add contact error:',
      err?.response?.status,
      err?.response?.data || err?.message
    );

    return { success: false, reason: err?.response?.status || 'request-failed' };
  }
}

module.exports = { sendWhatsApp, sendTicketForBooking, addContact };
