const router = require('express').Router();
const ctrl = require('../controllers/slots.controller');
const { requirePermissions } = require('../middleware/permissionGuard');

router.get('/', requirePermissions('slots:read'), ctrl.listSlots);
router.get('/:id', requirePermissions('slots:read'), ctrl.getSlotById);
// Note: createSlot and createSlotsBulk are disabled - slots are generated dynamically
router.put('/:id', requirePermissions('slots:write'), ctrl.updateSlot);
router.delete('/:id', requirePermissions('slots:write'), ctrl.deleteSlot);

module.exports = router;