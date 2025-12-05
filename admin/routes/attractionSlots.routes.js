const router = require('express').Router();
const ctrl = require('../controllers/attractionSlots.controller');
const { requirePermissions } = require('../middleware/permissionGuard');

router.get('/', requirePermissions('attractions:read'), ctrl.listAttractionSlots);
router.get('/:id', requirePermissions('attractions:read'), ctrl.getAttractionSlotById);
router.post('/', requirePermissions('attractions:write'), ctrl.createAttractionSlot);
router.put('/:id', requirePermissions('attractions:write'), ctrl.updateAttractionSlot);
router.delete('/:id', requirePermissions('attractions:write'), ctrl.deleteAttractionSlot);

module.exports = router;
