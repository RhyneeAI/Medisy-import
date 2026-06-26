require('dotenv').config();

const os = require('os');
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

app.get('/test', (req, res) => {
  res.json({ success: true, message: 'Server Medisy Import berjalan', time: new Date() });
});

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
const pendaftaranService = new ImportService(pendaftaranRepo, 'no_pendaftaran', 500);
const obatService = new ObatService({ obatRepo, satuanRepo, kategoriRepo, golonganRepo });
const kunjunganService = new KunjunganService({
  pendaftaranRepo, kunjunganRepo, asuransiRepo, kunjunganAsuransiRepo,
  kategoriPenyakitRepo, pemeriksaanDiagnosaRepo,
  pemeriksaanLabRepo, pemeriksaanTambahanLabRepo,
  obatRepo, resepObatRepo, tindakanRepo, pemeriksaanTindakanRepo, usersRepo
});

const importController = new ImportController({ tindakanService, pendaftaranService, obatService, kunjunganService });

app.use('/', createImportRoutes(importController));

const PORT = process.env.PORT || 3000;
const networkInterfaces = os.networkInterfaces();
let localIP = '127.0.0.1';
for (const name of Object.keys(networkInterfaces)) {
  for (const iface of networkInterfaces[name]) {
    if (iface.family === 'IPv4' && !iface.internal) {
      localIP = iface.address;
      break;
    }
  }
  if (localIP !== '127.0.0.1') break;
}

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on:`);
  console.log(`  Local:   http://localhost:${PORT}`);
  console.log(`  Network: http://${localIP}:${PORT}`);
});
server.timeout = 0;
