const authService = require('../../services/authService');

exports.register = async (req, res, next) => {
  try {
    const { name, email, phone, password, whatsapp_consent = false } = req.body || {};
    if (!name || !email) {
      return res.status(400).json({ error: 'name and email are required' });
    }
    // Password is optional for regular users (passwordless)
    // If password is provided, it's for admin users
    const out = await authService.register({ name, email, phone, password, isAdmin: !!password, whatsapp_consent });
    res.status(201).json(out);
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password, isAdmin = false } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: 'email is required' });
    }
    // Password is optional - admin users need password, regular users use OTP
    const out = await authService.login({ email, password });
    
    // If this is an admin login request, add admin flag
    if (isAdmin) {
      res.json({
        ...out,
        isAdmin: true,
        message: 'Admin login successful'
      });
    } else {
      res.json(out);
    }
  } catch (err) {
    // If error indicates OTP is required, return helpful message
    if (err.requires_otp) {
      return res.status(403).json({ 
        error: err.message,
        requires_otp: true
      });
    }
    // For admin login requests, return admin-specific error format
    if (req.body.isAdmin) {
      const status = err.status || err.statusCode || 500;
      res.status(status).json({
        error: err.message || 'Admin login failed',
        message: err.message || 'Admin access denied'
      });
    } else {
      next(err);
    }
  }
};

exports.logout = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    await authService.logout(userId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

exports.sendOtp = async (req, res, next) => {
  try {
    const { user_id, email, phone, name, channel = 'sms', createIfNotExists = false, whatsapp_consent = false } = req.body || {};
    if (!user_id && !email && !phone) {
      return res.status(400).json({ error: 'Provide user_id or email or phone' });
    }
    // For booking flow, allow creating user if not exists
    const out = await authService.sendOtp({ user_id, email, phone, name, channel, createIfNotExists, whatsapp_consent });
    res.json(out);
  } catch (err) {
    next(err);
  }
};

exports.verifyOtp = async (req, res, next) => {
  try {
    const { user_id, otp, email, phone, name, whatsapp_consent = false } = req.body || {};
    if (!otp) return res.status(400).json({ error: 'otp is required' });
    if (!user_id && !email && !phone) {
      return res.status(400).json({ error: 'Provide user_id or email or phone' });
    }
    const out = await authService.verifyOtp({ user_id, otp, email, phone, name, whatsapp_consent });
    res.json(out);
  } catch (err) {
    next(err);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'email is required' });
    const out = await authService.forgotPassword({ email });
    res.json(out);
  } catch (err) {
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { email, code, newPassword } = req.body || {};
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'email, code and newPassword are required' });
    }
    const out = await authService.resetPassword({ email, code, newPassword });
    res.json(out);
  } catch (err) {
    next(err);
  }
};