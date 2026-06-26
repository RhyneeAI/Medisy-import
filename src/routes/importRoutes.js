const express = require('express');
const multer = require('multer');
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const ImportController = require('../controller/importController');

module.exports = (importController) => {
  router.post(
    '/import',
    upload.single('file'),
    importController.import.bind(importController)
  );

  return router;
};
