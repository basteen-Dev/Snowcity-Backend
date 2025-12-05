const router = require('express').Router();
const ctrl = require('../controllers/adminAuth.controller');
const validate = require('../../middlewares/validate');
const { loginValidator } = require('../../validators/auth.validators');
const { adminAuth } = require('../middleware/adminAuth');

// Debug route to check if this router is loaded
router.get('/debug', (req, res) => {
  res.json({ message: 'Admin auth routes are loaded', timestamp: new Date().toISOString() });
});

// Admin login - no authentication required (this is the entry point)
router.post('/login', validate(loginValidator), ctrl.adminLogin);

// Admin logout - requires authentication
router.post('/logout', adminAuth, ctrl.adminLogout);

module.exports = router;
