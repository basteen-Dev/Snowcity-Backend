// admin/routes/analytics.routes.js
const router = require('express').Router();
const adminModel = require('../models/admin.model');
const analyticsCtrl = require('../controllers/analytics.controller');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

// No permissions required - all admin users have access
router.get('/', analyticsCtrl.getAnalytics);

router.get('/overview', analyticsCtrl.getOverview);

router.get('/trend', analyticsCtrl.getTrend);

router.get('/top-attractions', analyticsCtrl.getTopAttractions);

router.get('/attractions-breakdown', async (req, res, next) => {
  try {
    const { from = null, to = null } = req.query;
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    const data = await adminModel.getAttractionBreakdown({ from, to, limit });
    res.json(data);
  } catch (err) { next(err); }
});

// Daily is just trend with granularity=day
router.get('/daily', async (req, res, next) => {
  try {
    const { from = null, to = null } = req.query;
    const data = await adminModel.getSalesTrend({ from, to, granularity: 'day' });
    res.json(data);
  } catch (err) { next(err); }
});

// Split data
router.get('/split', async (req, res, next) => {
  try {
    const { from = null, to = null, group_by = 'payment_status' } = req.query;
    const data = await adminModel.getSplitData({ from, to, group_by });
    res.json({ group_by, data });
  } catch (err) { next(err); }
});

// CSV export helpers (extend)
function toCsv(rows, headers) {
  const escape = (v) => {
    if (v == null) return '';
    let s = String(v);
    if (/^[=+\-@]/.test(s)) s = "'" + s; // mitigate CSV injection
    if (s.includes('"')) s = s.replace(/"/g, '""');
    if (s.includes(',') || s.includes('\n')) s = `"${s}"`;
    return s;
  };
  const head = headers.map((h) => h.label).join(',');
  const body = rows.map((r) => headers.map((h) => escape(h.get(r))).join(',')).join('\n');
  return head + '\n' + body + '\n';
}

async function getReportRows({ type = 'bookings', from = null, to = null, attraction_id = null, group_by = 'payment_status' }) {
  switch (type) {
    case 'top-attractions':
      return await adminModel.getTopAttractions({ from, to, limit: 100, attraction_id });
    case 'trend':
    case 'daily':
      return await adminModel.getSalesTrend({ from, to, granularity: 'day', attraction_id });
    case 'attractions-breakdown':
      return await adminModel.getAttractionBreakdown({ from, to, limit: 500 });
    case 'split':
      return (await adminModel.getSplitData({ from, to, group_by })) || [];
    case 'bookings':
    default:
      return await adminModel.getRecentBookings({ limit: 500, offset: 0, attraction_id });
  }
}

function resolveHeaders(type) {
  if (type === 'top-attractions' || type === 'attractions-breakdown') {
    return [
      { label: 'Attraction ID', key: 'attraction_id', get: (r) => r.attraction_id },
      { label: 'Title', key: 'title', get: (r) => r.title },
      { label: 'Bookings', key: 'bookings', get: (r) => r.bookings ?? r.total_bookings },
      { label: 'People', key: 'people', get: (r) => r.people ?? r.total_people ?? '' },
      { label: 'Revenue', key: 'revenue', get: (r) => r.revenue ?? r.total_revenue },
    ];
  }
  if (type === 'trend' || type === 'daily') {
    return [
      { label: 'Bucket', key: 'bucket', get: (r) => r.bucket },
      { label: 'Bookings', key: 'bookings', get: (r) => r.bookings },
      { label: 'People', key: 'people', get: (r) => r.people ?? '' },
      { label: 'Revenue', key: 'revenue', get: (r) => r.revenue },
    ];
  }
  if (type === 'split') {
    return [
      { label: 'Key', key: 'key', get: (r) => r.key },
      { label: 'Bookings', key: 'bookings', get: (r) => r.bookings },
      { label: 'People', key: 'people', get: (r) => r.people ?? '' },
      { label: 'Revenue', key: 'revenue', get: (r) => r.revenue },
    ];
  }
  return [
    { label: 'Booking Ref', key: 'booking_ref', get: (r) => r.booking_ref },
    { label: 'User Email', key: 'user_email', get: (r) => r.user_email },
    { label: 'Attraction', key: 'attraction_title', get: (r) => r.attraction_title },
    { label: 'Amount', key: 'final_amount', get: (r) => r.final_amount },
    { label: 'Payment', key: 'payment_status', get: (r) => r.payment_status },
    { label: 'Created At', key: 'created_at', get: (r) => r.created_at },
  ];
}

router.get('/report.csv', async (req, res, next) => {
  try {
    const { type = 'bookings', from = null, to = null, attraction_id = null, group_by = 'payment_status' } = req.query;
    const rows = await getReportRows({ type, from, to, attraction_id: attraction_id ? Number(attraction_id) : null, group_by });
    const headers = resolveHeaders(type);
    const csv = toCsv(rows, headers);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="report_${type}.csv"`);
    res.send(csv);
  } catch (err) { next(err); }
});

router.get('/report.xlsx', async (req, res, next) => {
  try {
    const { type = 'bookings', from = null, to = null, attraction_id = null, group_by = 'payment_status' } = req.query;
    const rows = await getReportRows({ type, from, to, attraction_id: attraction_id ? Number(attraction_id) : null, group_by });
    const headers = resolveHeaders(type);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Report');
    sheet.columns = headers.map((h) => ({ header: h.label, key: h.key, width: 25 }));
    rows.forEach((row) => {
      const values = {};
      headers.forEach((h) => { values[h.key] = h.get(row); });
      sheet.addRow(values);
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="report_${type}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
});

router.get('/report.pdf', async (req, res, next) => {
  try {
    const { type = 'bookings', from = null, to = null, attraction_id = null, group_by = 'payment_status' } = req.query;
    const rows = await getReportRows({ type, from, to, attraction_id: attraction_id ? Number(attraction_id) : null, group_by });
    const headers = resolveHeaders(type);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="report_${type}.pdf"`);
    doc.pipe(res);

    doc.fontSize(16).text('Snowcity Analytics Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Type: ${type} | Generated: ${new Date().toISOString()}`);
    if (from || to) doc.text(`Range: ${from || 'start'} → ${to || 'now'}`);
    doc.moveDown();

    const colWidths = headers.map(() => Math.floor((doc.page.width - doc.page.margins.left - doc.page.margins.right) / headers.length));
    const drawRow = (cells, isHeader = false) => {
      doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica').fontSize(10);
      cells.forEach((cell, idx) => {
        doc.text(String(cell ?? ''), doc.x, doc.y, { width: colWidths[idx], continued: idx !== cells.length - 1 });
      });
      doc.text('');
      doc.moveDown(0.3);
    };

    drawRow(headers.map((h) => h.label), true);
    doc.moveDown(0.2);
    rows.forEach((row) => {
      drawRow(headers.map((h) => h.get(row)));
      if (doc.y > doc.page.height - 80) doc.addPage();
    });

    if (!rows.length) doc.text('No data for selected filters.', { align: 'center' });

    doc.end();
  } catch (err) { next(err); }
});

module.exports = router;