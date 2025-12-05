const router = require('express').Router();
const ctrl = require('../controllers/combos.controller');
const { requirePermissions } = require('../middleware/permissionGuard');
const { createComboValidator, updateComboValidator } = require('../../validators/combos.validators');
const { handleValidationErrors } = require('../middleware/validationHandler');

router.get('/', requirePermissions('combos:read'), ctrl.listCombos);
router.get('/:id', requirePermissions('combos:read'), ctrl.getComboById);
router.post('/', requirePermissions('combos:write'), createComboValidator, handleValidationErrors, ctrl.createCombo);
router.put('/:id', requirePermissions('combos:write'), updateComboValidator, handleValidationErrors, ctrl.updateCombo);
router.delete('/:id', requirePermissions('combos:write'), ctrl.deleteCombo);

module.exports = router;