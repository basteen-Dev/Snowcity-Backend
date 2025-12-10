const adminModel = require('../models/admin.model');
const { buildScopeFilter } = require('../middleware/scopedAccess');

// GET admin dashboard overview (scoped)
exports.getOverview = async (req, res, next) => {
  try {
    const { from = null, to = null } = req.query;
    // Apply attraction scope if not root/superadmin
    const scopes = req.user.scopes || {};
    const attractionScope = scopes.attraction || [];
    const attractionId = attractionScope.includes('*') ? null : (attractionScope.length ? attractionScope : null);
    const data = await adminModel.getAdminOverview({ from, to, attraction_id: attractionId });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

// GET recent bookings (scoped)
exports.getRecentBookings = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
    const offset = Math.max(parseInt(req.query.offset || '0', 10), 0);
    const scopes = req.user.scopes || {};
    const attractionScope = scopes.attraction || [];
    const attractionId = attractionScope.includes('*') ? null : (attractionScope.length ? attractionScope : null);
    const data = await adminModel.getRecentBookings({ limit, offset, attraction_id: attractionId });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

// GET top attractions (scoped)
exports.getTopAttractions = async (req, res, next) => {
  try {
    const { from = null, to = null } = req.query;
    const limit = Math.min(parseInt(req.query.limit || '10', 10), 50);
    const scopes = req.user.scopes || {};
    const attractionScope = scopes.attraction || [];
    const attractionId = attractionScope.includes('*') ? null : (attractionScope.length ? attractionScope : null);
    const data = await adminModel.getTopAttractions({ from, to, limit, attraction_id: attractionId });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

// GET booking status breakdown (scoped)
exports.getStatusBreakdown = async (req, res, next) => {
  try {
    const { from = null, to = null } = req.query;
    const scopes = req.user.scopes || {};
    const attractionScope = scopes.attraction || [];
    const attractionId = attractionScope.includes('*') ? null : (attractionScope.length ? attractionScope : null);
    const data = await adminModel.getBookingCountsByStatus({ from, to, attraction_id: attractionId });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

// GET sales trend (scoped)
exports.getTrend = async (req, res, next) => {
  try {
    const { from = null, to = null, granularity = 'day' } = req.query;
    const scopes = req.user.scopes || {};
    const attractionScope = scopes.attraction || [];
    const attractionId = attractionScope.includes('*') ? null : (attractionScope.length ? attractionScope : null);
    const data = await adminModel.getSalesTrend({ from, to, granularity, attraction_id: attractionId });
    res.json(data);
  } catch (err) {
    next(err);
  }
};