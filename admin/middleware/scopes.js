// admin/middleware/scopes.js
const { pool } = require('../../config/db');

function isRoot(req) {
  const roles = (req.user?.roles || []).map((r) => String(r).toLowerCase());
  return roles.includes('root') || roles.includes('superadmin');
}

async function attachScopes(req, res, next) {
  try {
    if (!req.user?.id) return next();
    
    // Grant all admin users full access to all modules
    req.user.allAccess = true;
    req.user.scopes = {};
    next();
  } catch (err) { next(err); }
}

module.exports = { attachScopes, isRoot };