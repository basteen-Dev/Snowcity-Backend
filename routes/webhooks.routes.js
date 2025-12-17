const express = require('express');
const router = express.Router();

const payphiReturn = require('../webhooks/payphi.return');
const interaktWebhook = require('../webhooks/interakt.webhook');

router.get('/payphi/return', payphiReturn);
router.post('/payphi/return', payphiReturn);

// Interakt WhatsApp webhook
router.post('/interakt', interaktWebhook);

module.exports = router;