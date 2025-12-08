const router = require('express').Router();
const { uploaderMediaSingle } = require('../../utils/uploader');
const { uploadSingleImage } = require('../controllers/uploads.controller');

router.post('/', uploaderMediaSingle('file'), uploadSingleImage);

module.exports = router;
