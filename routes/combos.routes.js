const router = require('express').Router();
const ctrl = require('../user/controllers/combos.controller');

// Public
router.get('/', ctrl.listCombos);
router.get('/:id', ctrl.getComboById);
router.get('/slug/:slug', ctrl.getComboBySlug);
router.get('/:id/slots', ctrl.getComboSlots);

module.exports = router;