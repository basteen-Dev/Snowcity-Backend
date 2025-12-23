const router = require('express').Router();
const { uploaderMediaSingle, uploaderMediaArray } = require('../../utils/uploader');
const { uploadSingleImage, uploadBulkImages } = require('../controllers/uploads.controller');

router.post('/', uploaderMediaSingle('file'), uploadSingleImage);
router.post('/bulk', uploaderMediaArray('files', 20), uploadBulkImages);

module.exports = router;
