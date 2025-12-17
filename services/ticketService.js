'use strict';

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const dayjs = require('dayjs');

const { pool } = require('../config/db');
const bookingsModel = require('../models/bookings.model');

// ---------- Configuration ----------
const ASSET_DIR = path.resolve(__dirname, '../utils');
// Make sure you have these images, or the code falls back to colors
const TICKET_BG = path.join(ASSET_DIR, 'ticket/ticket-bg.png'); 
const LOGO_PATH = path.join(ASSET_DIR, 'logo.png'); 

// Wonderla-style vibrant colors
const COLORS = {
  primary: '#0056D2',    // Deep Blue
  secondary: '#00A8E8',  // Cyan
  accent: '#FFC107',     // Amber/Yellow
  text: '#333333',
  lightText: '#666666',
  white: '#FFFFFF',
  border: '#DDDDDD'
};

// Helpers
async function ensureDir(dir) { await fsp.mkdir(dir, { recursive: true }); }
const exists = (p) => { try { return p && fs.existsSync(p); } catch { return false; } };
const money = (n) => `Rs. ${Number(n || 0).toFixed(2)}`;
const fmtDate = (d) => dayjs(d).format('DD MMM, YYYY');

// Helper: Format time '14:30:00' -> '2:30 PM'
function formatTime(t) {
  if (!t) return '';
  // Handle both '14:30:00' and '14:30' formats
  const timeStr = String(t).split(' ')[0]; // Remove any date part if present
  const [h, m] = timeStr.split(':');
  if (!h || !m) return '';
  const hour = parseInt(h, 10);
  const minute = parseInt(m, 10);
  if (isNaN(hour) || isNaN(minute)) return '';
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${minute.toString().padStart(2, '0')} ${ampm}`;
}

// Helper: Get Slot String
function getSlotDisplay(row) {
  // Debug logging to see what data the ticket service receives
  console.log('🔍 DEBUG Ticket Service getSlotDisplay input:', {
    booking_id: row.booking_id,
    slot_start_time: row.slot_start_time,
    slot_end_time: row.slot_end_time,
    start_time: row.start_time,
    end_time: row.end_time,
    booking_time: row.booking_time,
    slot_label: row.slot_label,
    full_row: row
  });
  
  // Try slot times first (from our updated booking query)
  const start = formatTime(row.slot_start_time);
  const end = formatTime(row.slot_end_time);
  if (start && end) {
    const result = `${start} - ${end}`;
    console.log('🔍 DEBUG Ticket using slot_start_time/end_time:', result);
    return result;
  }
  
  // Fallback to legacy fields
  const legacyStart = formatTime(row.start_time);
  const legacyEnd = formatTime(row.end_time);
  if (legacyStart && legacyEnd) {
    const result = `${legacyStart} - ${legacyEnd}`;
    console.log('🔍 DEBUG Ticket using legacy start_time/end_time:', result);
    return result;
  }
  
  // Final fallback to booking_time
  const bookingTime = formatTime(row.booking_time);
  if (bookingTime) {
    console.log('🔍 DEBUG Ticket using booking_time fallback:', bookingTime);
    return bookingTime;
  }
  
  // If no time available, show appropriate message
  const fallback = row.slot_label || 'Open Entry';
  console.log('🔍 DEBUG Ticket using slot_label fallback:', fallback);
  return fallback;
}

// ---------- Data Fetching (Order-Centric) ----------

async function getFullOrderData(bookingId) {
  // 1. Find the Order ID for this booking
  const orderRes = await pool.query(
    `SELECT order_id FROM bookings WHERE booking_id = $1`, 
    [bookingId]
  );
  
  if (!orderRes.rows.length) return null;
  const orderId = orderRes.rows[0].order_id;

  // 2. Use canonical model helper (stays in sync with schema joins)
  const order = await bookingsModel.getOrderWithDetails(orderId);
  if (!order) return null;

  const items = (order.items || [])
    .filter((item) => !item.parent_booking_id)
    .map((item) => ({
      ...item,
      item_title: item.item_type === 'Combo'
        ? (item.combo_title || item.combo_name || item.item_title || (item.combo_id ? `Combo #${item.combo_id}` : 'Combo'))
        : (item.item_title || item.attraction_title || 'Entry Ticket')
    }));

  return {
    orderId: order.order_id,
    orderRef: order.order_ref,
    totalAmount: order.final_amount ?? order.total_amount,
    orderDate: order.created_at,
    items
  };
}

// ---------- Drawing Logic ----------

async function drawConsolidatedTicket(doc, data) {
  const { orderRef, items, totalAmount } = data;
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const margin = 20;

  // 1. Background / Branding
  if (exists(TICKET_BG)) {
    doc.image(TICKET_BG, 0, 0, { width: pageWidth, height: pageHeight });
  } else {
    // Header Strip
    doc.rect(0, 0, pageWidth, 90).fill(COLORS.primary);
    // Footer Strip
    doc.rect(0, pageHeight - 40, pageWidth, 40).fill(COLORS.secondary);
  }

  // Logo
  if (exists(LOGO_PATH)) {
    doc.image(LOGO_PATH, margin + 10, 15, { width: 80 });
  } else {
    doc.font('Helvetica-Bold').fontSize(24).fillColor(COLORS.white)
       .text('SNOW CITY', margin + 20, 35);
  }

  // Header Info
  doc.font('Helvetica-Bold').fontSize(14).fillColor(COLORS.white)
     .text('ORDER RECEIPT & E-TICKET', 0, 25, { align: 'right', width: pageWidth - margin });
  
  doc.font('Helvetica').fontSize(10).fillColor('#E0E0E0')
     .text(`Ref: ${orderRef}`, 0, 45, { align: 'right', width: pageWidth - margin });

  // 2. Item List Container
  let yPos = 110;
  
  doc.fillColor(COLORS.text);
  doc.font('Helvetica-Bold').fontSize(14).text('YOUR BOOKINGS', margin + 10, yPos);
  doc.rect(margin + 10, yPos + 18, pageWidth - (margin*2) - 20, 2).fill(COLORS.accent);
  
  yPos += 35;

  // 3. Iterate Items
  doc.font('Helvetica').fontSize(10);
  
  items.forEach((item, index) => {
    // Check for page overflow (simple check)
    if (yPos > pageHeight - 150) {
      doc.addPage(); // New page if list is huge
      yPos = 50;
    }

    const slotStr = getSlotDisplay(item);
    const dateStr = fmtDate(item.booking_date);
    const itemTitle = item.item_title.toUpperCase();
    const typeLabel = item.item_type === 'Combo' ? ' [COMBO PACKAGE]' : '';

    // Calculate item height based on addons and offers
    let itemHeight = 55;
    if (item.addons && item.addons.length > 0) {
      itemHeight += item.addons.length * 12 + 10; // Extra space for addons
    }
    if (item.offer) {
      itemHeight += 25; // Extra space for offer
    }

    // Item Box Background
    doc.save();
    doc.roundedRect(margin + 10, yPos, pageWidth - (margin*2) - 150, itemHeight, 5)
       .fillAndStroke('#F9F9F9', '#EEEEEE');
    doc.restore();

    // Item Text
    doc.fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(12)
       .text(`${index + 1}. ${itemTitle}${typeLabel}`, margin + 20, yPos + 10);

    doc.fillColor(COLORS.lightText).font('Helvetica').fontSize(10)
       .text(`Date: ${dateStr}   |   Slot: ${slotStr}`, margin + 20, yPos + 30);
    
    let currentY = yPos + 45;

    // Show addons if present
    if (item.addons && item.addons.length > 0) {
      doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(9)
         .text('Add-ons:', margin + 20, currentY);
      currentY += 12;
      
      item.addons.forEach((addon) => {
        const addonText = `• ${addon.title} x${addon.quantity} (${money(addon.price * addon.quantity)})`;
        doc.fillColor(COLORS.lightText).font('Helvetica').fontSize(8)
           .text(addonText, margin + 25, currentY);
        currentY += 10;
      });
      currentY += 5;
    }

    // Show offer details if present
    if (item.offer) {
      doc.fillColor(COLORS.secondary).font('Helvetica-Bold').fontSize(9)
         .text(`Offer: ${item.offer.title}`, margin + 20, currentY);
      currentY += 12;
      
      let offerText = '';
      if (item.offer.rule_type === 'buy_x_get_y' && item.offer.buy_qty && item.offer.get_qty) {
        offerText = `Buy ${item.offer.buy_qty} Get ${item.offer.get_qty}`;
        if (item.offer.get_discount_type === 'percent' && item.offer.get_discount_value) {
          offerText += ` (${item.offer.get_discount_value}% off)`;
        } else if (item.offer.get_discount_type === 'amount' && item.offer.get_discount_value) {
          offerText += ` (${money(item.offer.get_discount_value)} off)`;
        } else {
          offerText += ' Free';
        }
      } else if (item.offer.discount_type === 'percent') {
        offerText = `${item.offer.discount_percent}% discount`;
      } else if (item.offer.discount_type === 'amount') {
        offerText = `${money(item.offer.discount_value)} off`;
      }
      
      if (offerText) {
        doc.fillColor(COLORS.lightText).font('Helvetica').fontSize(8)
           .text(offerText, margin + 25, currentY);
      }
    }
    
    // Qty Badge
    doc.save();
    doc.circle(pageWidth - 180, yPos + 27, 18).fill(COLORS.accent);
    doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(10)
       .text(item.quantity, pageWidth - 195, yPos + 22, { width: 30, align: 'center' });
    doc.fontSize(7).text('PAX', pageWidth - 195, yPos + 33, { width: 30, align: 'center' });
    doc.restore();

    yPos += itemHeight + 10; // Move down for next item
  });

  // 4. QR Code Area (Right Side)
  const qrSize = 110;
  const qrX = pageWidth - margin - qrSize - 10;
  const qrY = 110;

  // Border
  doc.save();
  doc.roundedRect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 30, 5).strokeColor(COLORS.border).stroke();
  doc.restore();

  // QR Generation (Encodes Order Ref)
  try {
    const qrString = JSON.stringify({ type: 'ORDER', ref: orderRef, count: items.length });
    const qrBuf = Buffer.from(
      (await QRCode.toDataURL(qrString, { margin: 0, width: qrSize, color: { dark: COLORS.primary } })).split(',')[1],
      'base64'
    );
    doc.image(qrBuf, qrX, qrY, { width: qrSize, height: qrSize });
  } catch (e) {}

  doc.fontSize(8).fillColor(COLORS.lightText)
     .text('Scan for Entry', qrX, qrY + qrSize + 5, { width: qrSize, align: 'center' });

  // 5. Totals & Footer
  const bottomY = pageHeight - 80;
  
  doc.font('Helvetica-Bold').fontSize(16).fillColor(COLORS.primary)
     .text(`TOTAL PAID: ${money(totalAmount)}`, margin + 20, bottomY - 20);

  doc.fontSize(8).fillColor('#888')
     .text('Non-refundable. Valid only for the date/slot specified.', margin + 20, bottomY + 10);
  doc.text('www.snowcity.com | +91-9876543210', margin + 20, bottomY + 22);
}

// ---------- MAIN FUNCTION ----------

async function generateTicket(booking_id) {
  // 1. Get Complete Order Data (Consolidated)
  const data = await getFullOrderData(booking_id);
  if (!data) throw new Error('Order/Booking not found');

  // 2. Prepare Storage Path
  // We use the Order Date for folder structure
  const date = dayjs(data.orderDate);
  const relativeDir = `/uploads/tickets/${date.format('YYYY')}/${date.format('MM')}/${date.format('DD')}`;
  const storageDir = path.join(__dirname, '..', relativeDir);
  
  await ensureDir(storageDir);

  // Filename based on Order Ref
  const filename = `ORDER_${data.orderRef}.pdf`;
  const absPath = path.join(storageDir, filename);
  const webPath = path.posix.join(relativeDir, filename);

  // 3. Generate PDF
  const doc = new PDFDocument({ 
    size: [650, 400], // Custom Wide Ticket Size
    margin: 0,
    autoFirstPage: true
  });

  const stream = fs.createWriteStream(absPath);
  doc.pipe(stream);

  await drawConsolidatedTicket(doc, data);

  doc.end();
  
  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  // 4. Update DB: Link this PDF to ALL bookings in the order
  // This ensures whether the user clicks "Download" on Item A or Item B, they get the same full receipt.
  await pool.query(
    `UPDATE bookings SET ticket_pdf = $1, updated_at = NOW() WHERE order_id = $2`,
    [webPath, data.orderId]
  );

  return webPath;
}

module.exports = { generateTicket };