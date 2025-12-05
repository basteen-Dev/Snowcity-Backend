const authService = require('../../services/authService');

// Admin login endpoint - same as regular login but specifically for admin panel
exports.adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    // Use the same login logic as regular auth
    const result = await authService.login({ email, password });
    
    // Ensure the user has admin access (our middleware now grants this to all authenticated users)
    res.json({
      ...result,
      isAdmin: true, // Explicitly mark as admin login
      message: 'Admin login successful'
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
