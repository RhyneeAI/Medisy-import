require('dotenv').config();

const express = require('express');
const Database = require('./src/config/database');
const TindakanRepository = require('./src/repositories/tindakanRepository');
const PendaftaranRepository = require('./src/repositories/pendaftaranRepository');
const SatuanRepository = require('./src/repositories/satuanRepository');
const KategoriObatRepository = require('./src/repositories/kategoriObatRepository');
const GolonganObatRepository = require('./src/repositories/golonganObatRepository');
const ObatRepository = require('./src/repositories/obatRepository');
const ImportService = require('./src/service/importService');
const ObatService = require('./src/service/obatService');
const ImportController = require('./src/controller/importController');
const createImportRoutes = require('./src/routes/importRoutes');

const app = express();
app.use(express.json());

const db = Database.createPool();

const tindakanRepo = new TindakanRepository(db);
const pendaftaranRepo = new PendaftaranRepository(db);
const satuanRepo = new SatuanRepository(db);
const kategoriRepo = new KategoriObatRepository(db);
const golonganRepo = new GolonganObatRepository(db);
const obatRepo = new ObatRepository(db);

const tindakanService = new ImportService(tindakanRepo, 'Nama');
const pendaftaranService = new ImportService(pendaftaranRepo, 'no_pendaftaran');
const obatService = new ObatService({ obatRepo, satuanRepo, kategoriRepo, golonganRepo });

const importController = new ImportController({ tindakanService, pendaftaranService, obatService });

app.use('/api', createImportRoutes(importController));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
