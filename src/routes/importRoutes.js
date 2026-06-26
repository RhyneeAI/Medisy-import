const express = require('express');
const multer = require('multer');
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const ImportController = require('../controller/importController');

module.exports = (importController) => {
  router.get('/test', (req, res) => {
    res.json({ success: true, message: 'Server Medisy Import berjalan', time: new Date() });
  });

  router.post(
    '/import',
    upload.single('file'),
    importController.import.bind(importController)
  );

  router.post(
    '/import/progress',
    upload.single('file'),
    importController.importProgress.bind(importController)
  );

  return router;
};
