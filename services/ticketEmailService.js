const fs = require('fs');
const path = require('path');
const email = require('./emailService');
const bookingsModel = require('../models/bookings.model');
const usersModel = require('../models/users.model');
const { APP_URL } = require('../config/messaging');

const TEMPLATE_PATH = path.join(__dirname, '..', 'templates', 'ticket_email.html');
let _ticketTemplate = null;
function loadTicketTemplate() {
  if (_ticketTemplate !== null) return _ticketTemplate;
  try {
    _ticketTemplate = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  } catch (e) {
    _ticketTemplate = null;
  }
  return _ticketTemplate;
}

function renderTicketTemplate(vars = {}) {
  const tpl = loadTicketTemplate();
  if (!tpl) {
    // Fallback minimal template (snow-blue theme)
    return `
      <div style="font-family:system-ui, -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#23395B">
        <div style="background:#EAF4FF;padding:18px;border-radius:6px;border:1px solid #D6EBFF">
          <h1 style="color:#0B4DA2;margin:0 0 6px">SnowCity</h1>
          <p style="margin:0 0 12px;color:#23527C">Hello ${vars.name || ''},</p>
          <p style="margin:0 0 12px">Your booking <strong>${vars.booking_ref || ''}</strong> is confirmed.</p>
          <div style="background:#fff;padding:12px;border-radius:4px;border:1px solid #EEF6FF">${vars.items_html || ''}</div>
          ${vars.download_link ? `<p style="margin-top:12px"><a href="${vars.download_link}" style="color:#0B66D2">Download ticket (PDF)</a></p>` : ''}
          <p style="margin-top:12px;color:#4A6B8A">Enjoy your visit — SnowCity Team</p>
        </div>
      </div>
    `;
  }

  return tpl.replace(/\{\{(\w+)\}\}/g, (m, key) => (vars[key] !== undefined && vars[key] !== null ? vars[key] : ''));
}

function absoluteFromUrlPath(urlPath) {
  // urlPath like /uploads/tickets/YYYY/MM/DD/FILENAME.pdf
  // files are stored at backend/uploads/... relative to __dirname/.. per ticketService
  if (!urlPath) return null;
  const rel = urlPath.replace(/^\/*/, '');
  return path.resolve(__dirname, '..', rel);
}

function formatMoney(n) {
  return `₹${Number(n || 0).toFixed(2)}`;
}

function buildItemsHtml(items = []) {
  if (!items.length) return '<em>No items found</em>';
  
  // Helper function to format time to 12-hour format
  function formatTime12Hour(time24) {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  }
  
  const rows = items.map((item) => {
    const title = item.item_title || (item.item_type === 'Combo' ? 'Combo Booking' : 'Attraction Ticket');
    
    // Debug logging
    console.log('🔍 DEBUG Email Service item:', {
      booking_id: item.booking_id,
      slot_start_time: item.slot_start_time,
      slot_end_time: item.slot_end_time,
      booking_time: item.booking_time,
      slot_label: item.slot_label
    });
    
    let slot;
    if (item.slot_start_time && item.slot_end_time) {
      slot = `${formatTime12Hour(item.slot_start_time)} - ${formatTime12Hour(item.slot_end_time)}`;
      console.log('🔍 DEBUG Email using formatted slot_start_time/end_time:', slot);
    } else if (item.booking_time) {
      slot = formatTime12Hour(item.booking_time);
      console.log('🔍 DEBUG Email using formatted booking_time:', slot);
    } else if (item.slot_label) {
      slot = item.slot_label;
      console.log('🔍 DEBUG Email using slot_label:', slot);
    } else {
      slot = 'Open Slot';
      console.log('🔍 DEBUG Email using fallback:', slot);
    }
    
    return `
      <tr>
        <td style="padding:6px 8px;border:1px solid #eee">${title}</td>
        <td style="padding:6px 8px;border:1px solid #eee">${item.booking_date || '-'}</td>
        <td style="padding:6px 8px;border:1px solid #eee">${slot}</td>
        <td style="padding:6px 8px;border:1px solid #eee">${item.quantity || 1}</td>
        <td style="padding:6px 8px;border:1px solid #eee">${formatMoney(item.final_amount || item.total_amount)}</td>
      </tr>`;
  }).join('');

  return `
    <table style="width:100%;border-collapse:collapse;margin-top:10px">
      <thead>
        <tr style="background:#f4f4f4">
          <th style="padding:6px 8px;border:1px solid #eee;text-align:left">Item</th>
          <th style="padding:6px 8px;border:1px solid #eee;text-align:left">Date</th>
          <th style="padding:6px 8px;border:1px solid #eee;text-align:left">Slot</th>
          <th style="padding:6px 8px;border:1px solid #eee;text-align:left">Qty</th>
          <th style="padding:6px 8px;border:1px solid #eee;text-align:left">Amount</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

async function sendTicketEmail(booking_id) {
  const b = await bookingsModel.getBookingById(booking_id);
  if (!b) throw new Error('Booking not found');
  if (b.email_sent) return { sent: true, skipped: true };

  const user = b.user_id ? await usersModel.getUserById(b.user_id) : null;
  const to = user?.email || null;
  if (!to) return { sent: false, skipped: true, reason: 'No user email' };

  const subject = `Your SnowCity Ticket — ${b.booking_ref}`;
  const text = `Hello${user?.name ? ' ' + user.name : ''},\n\nAttached is your SnowCity ticket.\nBooking Ref: ${b.booking_ref}\nAttraction ID: ${b.attraction_id}\nQuantity: ${b.quantity}\nAmount Paid: ${Number(b.final_amount || 0).toFixed(2)}\n\nEnjoy your visit!`;
  const html = `
    ${renderTicketTemplate({
      name: user?.name || '',
      booking_ref: b.booking_ref,
      attraction_id: b.attraction_id,
      quantity: b.quantity,
      amount: Number(b.final_amount || 0).toFixed(2),
      items_html: buildItemsHtml([b]) ,
      download_link: b.ticket_pdf ? `${APP_URL}${b.ticket_pdf}` : ''
    })}
  `;

  const attachments = [];
  if (b.ticket_pdf) {
    const abs = absoluteFromUrlPath(b.ticket_pdf);
    if (abs && fs.existsSync(abs)) {
      attachments.push({ filename: path.basename(abs), path: abs, contentType: 'application/pdf' });
    } else {
      console.warn('Ticket PDF file not found for booking', booking_id, abs);
    }
  }

  await email.send({ to, subject, text, html, attachments });
  await bookingsModel.updateBooking(booking_id, { email_sent: true });
  return { sent: true };
}

async function sendOrderEmail(order_id) {
  const order = await bookingsModel.getOrderWithDetails(order_id);
  if (!order) throw new Error('Order not found');

  const user = order.user_id ? await usersModel.getUserById(order.user_id) : null;
  const to = user?.email || null;
  if (!to) return { sent: false, skipped: true, reason: 'No user email' };

  const greetingName = user?.name ? ` ${user.name}` : '';
  const subject = `SnowCity Order ${order.order_ref || order.order_id}`;
  const plainItems = (order.items || []).map((item, idx) => {
    const title = item.item_title || `Item ${idx + 1}`;
    return `${idx + 1}. ${title} — Qty ${item.quantity || 1} — ${formatMoney(item.final_amount || item.total_amount)}`;
  }).join('\n');

  const text = `Hello${greetingName},\n\nThank you for your purchase at SnowCity.\nOrder Ref: ${order.order_ref || order.order_id}\nTotal Paid: ${formatMoney(order.final_amount || order.total_amount)}\n\nItems:\n${plainItems || '-'}\n\nYour ticket PDF is attached. Enjoy your visit!`;

  const html = renderTicketTemplate({
    name: user?.name || '',
    booking_ref: order.order_ref || order.order_id,
    items_html: buildItemsHtml(order.items || []),
    download_link: (order.items && order.items[0] && order.items[0].ticket_pdf) ? `${APP_URL}${order.items[0].ticket_pdf}` : ''
  });

  const attachments = [];
  const pdfPaths = new Set();
  for (const item of order.items || []) {
    if (!item.ticket_pdf) continue;
    const abs = absoluteFromUrlPath(item.ticket_pdf);
    if (abs && !pdfPaths.has(abs) && fs.existsSync(abs)) {
      pdfPaths.add(abs);
      attachments.push({ filename: path.basename(abs), path: abs, contentType: 'application/pdf' });
    }
  }

  await email.send({ to, subject, text, html, attachments });
  return { sent: true, attachments: attachments.length };
}

module.exports = { sendTicketEmail, sendOrderEmail };
