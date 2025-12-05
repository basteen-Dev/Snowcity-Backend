const router = require('express').Router();
const ctrl = require('../controllers/users.controller');

// No permissions required - all admin users have access
router.get('/', ctrl.listUsers);
router.get('/:id', ctrl.getUserById);
router.post('/', ctrl.createUser);
router.put('/:id', ctrl.updateUser);
router.delete('/:id', ctrl.deleteUser);

module.exports = router;