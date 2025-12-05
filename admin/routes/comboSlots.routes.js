const router = require('express').Router();
const ctrl = require('../controllers/dynamicComboSlots.controller');
const { requirePermissions } = require('../middleware/permissionGuard');
const validate = require('../../middlewares/validate');
const {
  listComboSlotsQuery,
  updateComboSlotValidator,
} = require('../../validators/comboSlots.validators');

router.get('/', requirePermissions('combos:read'), validate(listComboSlotsQuery), ctrl.listComboSlots);
router.get('/:id', requirePermissions('combos:read'), ctrl.getComboSlotById);
// Note: createSlot and createSlotsBulk are disabled - combo slots are generated dynamically
router.put('/:id', requirePermissions('combos:write'), validate(updateComboSlotValidator), ctrl.updateComboSlot);
router.delete('/:id', requirePermissions('combos:write'), ctrl.deleteComboSlot);

module.exports = router;
