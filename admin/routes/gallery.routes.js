const router = require('express').Router();
const ctrl = require('../controllers/gallery.controller');
const { requirePermissions } = require('../middleware/permissionGuard');

router.get('/', requirePermissions('gallery:read'), ctrl.list);
router.get('/:id', requirePermissions('gallery:read'), ctrl.getById);
router.post('/', requirePermissions('gallery:write'), ctrl.create);
router.put('/:id', requirePermissions('gallery:write'), ctrl.update);
router.delete('/:id', requirePermissions('gallery:write'), ctrl.remove);
router.post('/bulk-delete', requirePermissions('gallery:write'), ctrl.bulkDelete);

module.exports = router;
