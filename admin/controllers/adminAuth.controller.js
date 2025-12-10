const authService = require('../../services/authService');
const { loadUserScopes } = require('../middleware/scopedAccess');

// Helper function to load user roles
async function loadUserRoles(userId) {
  const { pool } = require('../../config/db');
  const { rows } = await pool.query(
    `SELECT LOWER(r.role_name) AS role_name
     FROM user_roles ur
     JOIN roles r ON r.role_id = ur.role_id
     WHERE ur.user_id = $1`,
    [userId]
  );
  return rows.map((r) => r.role_name);
}

// Admin login endpoint - same as regular login but specifically for admin panel
exports.adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    // Use the same login logic as regular auth
    const result = await authService.login({ email, password });
    
    // Load roles and scopes for the user
    const userId = result.user?.user_id;
    const roles = userId ? await loadUserRoles(userId) : [];
    const scopes = userId ? await loadUserScopes(userId) : {};
    
    // Ensure the user has admin access (our middleware now grants this to all authenticated users)
    res.json({
      ...result,
      isAdmin: true, // Explicitly mark as admin login
      message: 'Admin login successful',
      user: {
        ...result.user,
        roles,
        scopes // Include scopes so frontend can filter dropdowns
      }
    });
    
  } catch (err) {
    // Return the error in a format that matches what the frontend expects
    const status = err.status || err.statusCode || 500;
    res.status(status).json({
      error: err.message || 'Admin login failed',
      message: err.message || 'Admin access denied'
    });
  }
};

// Admin logout endpoint
exports.adminLogout = async (req, res, next) => {
  try {
    if (req.user?.id) {
      await authService.logout(req.user.id);
    }
    res.json({ message: 'Admin logout successful' });
  } catch (err) {
    next(err);
  }
};
