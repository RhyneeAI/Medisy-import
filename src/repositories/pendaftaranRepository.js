class PendaftaranRepository {
  constructor(db) {
    this.db = db;
    this.tableName = 'kk_pendaftaran';
  }

  mapToDatabase(csvRow) {
    const now = new Date();
    return {
      nama: csvRow.nama || '',
      no_pendaftaran: csvRow.no_pendaftaran || '',
      no_register_keluarga: csvRow.no_register_keluarga || '',
      no_identitas: csvRow.no_identitas || null,
      status_menikah: csvRow.status_menikah || null,
      pendidikan: csvRow.pendidikan || '',
      bahasa_dikuasai: csvRow.bahasa_dikuasai || null,
      jenis_kelamin: csvRow.jenis_kelamin || null,
      gol_darah: csvRow.gol_darah || '',
      status_pendaftaran: csvRow.status_pendaftaran || null,
      tanggal_lahir: csvRow.tanggal_lahir || null,
      place_of_birth: csvRow.tempat_lahir || '',
      telpon: csvRow.telpon || '',
      telpon_rumah: csvRow.telpon_rumah || null,
      email: csvRow.email || null,
      nama_penanggung_jawab: csvRow.nama_penanggung_jawab || null,
      alamat: csvRow.alamat || null,
      rt: csvRow.rt || null,
      rw: csvRow.rw || null,
      kode_pos: csvRow.kode_pos || null,
      negara: csvRow.negara || null,
      user: 0,
      id_perusahaan: 1,
      created: now,
      updated: now,
      ket: 'IMPORT',
      hash_id: '',
      ucode: ''
    };
  }

  async insert(data) {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map(() => '?').join(', ');

    const query = `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders})`;

    return new Promise((resolve, reject) => {
      this.db.query(query, values, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  async bulkInsert(dataArray) {
    if (!dataArray.length) return [];

    const columns = Object.keys(dataArray[0]);
    const values = dataArray.map(row => Object.values(row));
    const placeholders = values.map(() =>
      `(${columns.map(() => '?').join(', ')})`
    ).join(', ');

    const query = `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES ${placeholders}`;
    const flatValues = values.flat();

    return new Promise((resolve, reject) => {
      this.db.query(query, flatValues, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  async checkDuplicate(noPendaftaran) {
    const query = `SELECT id FROM ${this.tableName} WHERE no_pendaftaran = ? AND deleted IS NULL`;
    return new Promise((resolve, reject) => {
      this.db.query(query, [noPendaftaran], (err, results) => {
        if (err) reject(err);
        else resolve(results.length > 0);
      });
    });
  }

  async findByNikOrNama(nik, nama) {
    let query;
    let params;
    if (nik && nik !== 'NULL' && nik !== '') {
      query = `SELECT id FROM ${this.tableName} WHERE (no_identitas = ? OR LOWER(TRIM(nama)) = LOWER(TRIM(?))) AND deleted IS NULL LIMIT 1`;
      params = [nik, nama];
    } else {
      query = `SELECT id FROM ${this.tableName} WHERE LOWER(TRIM(nama)) = LOWER(TRIM(?)) AND deleted IS NULL LIMIT 1`;
      params = [nama];
    }
    return new Promise((resolve, reject) => {
      this.db.query(query, params, (err, results) => {
        if (err) reject(err);
        else resolve(results.length > 0 ? results[0] : null);
      });
    });
  }

  async updateJenisPasien(id, jenisPasien) {
    const query = `UPDATE ${this.tableName} SET jenis_pasien = ? WHERE id = ?`;
    return new Promise((resolve, reject) => {
      this.db.query(query, [jenisPasien, id], (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }
}

module.exports = PendaftaranRepository;
