require('dotenv').config();

const express = require('express');
const Database = require('./src/config/database');
const TindakanRepository = require('./src/repositories/tindakanRepository');
const ImportService = require('./src/service/importService');
const ImportController = require('./src/controller/importController');
const createImportRoutes = require('./src/routes/importRoutes');

const app = express();
app.use(express.json());

const db = Database.createPool();
const tindakanRepo = new TindakanRepository(db);
const importService = new ImportService(tindakanRepo);
const importController = new ImportController(importService);

app.use('/api', createImportRoutes(importController));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
