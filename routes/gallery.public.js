// site/routes/gallery.public.js
const router = require('express').Router();
const galleryController = require('../user/controllers/gallery.controller');

// Use the controller for gallery endpoints
router.get('/gallery', galleryController.list);
router.get('/gallery/:id', galleryController.getById);

module.exports = router;