const express = require('express');
const multer = require('multer');
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const ImportController = require('../controller/importController');

module.exports = (importController) => {
  router.post(
    '/import/tindakan',
    upload.single('file'),
    importController.importTindakan.bind(importController)
  );
  
  return router;
};