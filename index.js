require('dotenv').config();

const express = require('express');
const Database = require('./src/config/database');
const TindakanRepository = require('./src/repositories/tindakanRepository');
const PendaftaranRepository = require('./src/repositories/pendaftaranRepository');
const SatuanRepository = require('./src/repositories/satuanRepository');
const KategoriObatRepository = require('./src/repositories/kategoriObatRepository');
const GolonganObatRepository = require('./src/repositories/golonganObatRepository');
const ObatRepository = require('./src/repositories/obatRepository');
const KunjunganRepository = require('./src/repositories/kunjunganRepository');
const AsuransiRepository = require('./src/repositories/asuransiRepository');
const KunjunganAsuransiRepository = require('./src/repositories/kunjunganAsuransiRepository');
const KategoriPenyakitRepository = require('./src/repositories/kategoriPenyakitRepository');
const PemeriksaanDiagnosaRepository = require('./src/repositories/pemeriksaanDiagnosaRepository');
const PemeriksaanLabRepository = require('./src/repositories/pemeriksaanLabRepository');
const PemeriksaanTambahanLabRepository = require('./src/repositories/pemeriksaanTambahanLabRepository');
const ResepObatRepository = require('./src/repositories/resepObatRepository');
const PemeriksaanTindakanRepository = require('./src/repositories/pemeriksaanTindakanRepository');
const UsersRepository = require('./src/repositories/usersRepository');
const ImportService = require('./src/service/importService');
const ObatService = require('./src/service/obatService');
const KunjunganService = require('./src/service/kunjunganService');
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
const kunjunganRepo = new KunjunganRepository(db);
const asuransiRepo = new AsuransiRepository(db);
const kunjunganAsuransiRepo = new KunjunganAsuransiRepository(db);
const kategoriPenyakitRepo = new KategoriPenyakitRepository(db);
const pemeriksaanDiagnosaRepo = new PemeriksaanDiagnosaRepository(db);
const pemeriksaanLabRepo = new PemeriksaanLabRepository(db);
const pemeriksaanTambahanLabRepo = new PemeriksaanTambahanLabRepository(db);
const resepObatRepo = new ResepObatRepository(db);
const pemeriksaanTindakanRepo = new PemeriksaanTindakanRepository(db);
const usersRepo = new UsersRepository(db);

const tindakanService = new ImportService(tindakanRepo, 'Nama');
const pendaftaranService = new ImportService(pendaftaranRepo, 'no_pendaftaran');
const obatService = new ObatService({ obatRepo, satuanRepo, kategoriRepo, golonganRepo });
const kunjunganService = new KunjunganService({
  pendaftaranRepo, kunjunganRepo, asuransiRepo, kunjunganAsuransiRepo,
  kategoriPenyakitRepo, pemeriksaanDiagnosaRepo,
  pemeriksaanLabRepo, pemeriksaanTambahanLabRepo,
  obatRepo, resepObatRepo, tindakanRepo, pemeriksaanTindakanRepo, usersRepo
});

const importController = new ImportController({ tindakanService, pendaftaranService, obatService, kunjunganService });

app.use('/api', createImportRoutes(importController));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
