class TindakanRepository {
  constructor(db) {
    this.db = db;
    this.tableName = 'kk_jenis_tindakan';
  }

  // Mapping field Excel ke kolom database
  mapToDatabase(excelRow) {
    return {
      nama: excelRow.Nama || '-',
      id_icd9: parseInt(excelRow.ICD9) || 0,
      biaya_awal: this.parseRupiah(excelRow.Biaya),
      diskon_persen: 0,
      diskon_rp: 0,
      biaya: this.parseRupiah(excelRow.Biaya),
      biaya_dokter: this.parseRupiah(excelRow['Fee Dokter']) || 0,
      status: 'AKTIF',
      keterangan: '',
      user: null,
      id_perusahaan: 1, // atau dari konfigurasi
      ket: 'INPUT',
      coverBPJS: '',
      created: new Date(),
      updated: new Date(),
      deleted: null,
      fee_dokter: parseFloat(excelRow['Fee Dokter']) || 0,
      tipe_fee: 'PERSEN', // atau sesuaikan
      bhp: this.parseRupiah(excelRow.BHP) || 0,
      perawat: this.parseRupiah(excelRow.Perawat) || 0,
      klinik: this.parseRupiah(excelRow.Klinik) || 0
    };
  }

  parseRupiah(value) {
    if (!value) return 0;
    // Hapus titik dan konversi ke number
    const cleanValue = String(value).replace(/\./g, '');
    return parseInt(cleanValue) || 0;
  }

  async insert(data) {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map(() => '?').join(', ');
    
    const query = `
      INSERT INTO ${this.tableName} (${columns.join(', ')})
      VALUES (${placeholders})
    `;
    
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
    
    const query = `
      INSERT INTO ${this.tableName} (${columns.join(', ')})
      VALUES ${placeholders}
    `;
    
    const flatValues = values.flat();
    
    return new Promise((resolve, reject) => {
      this.db.query(query, flatValues, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  async checkDuplicate(nama) {
    const query = `SELECT id FROM ${this.tableName} WHERE nama = ? AND deleted IS NULL`;
    return new Promise((resolve, reject) => {
      this.db.query(query, [nama], (err, results) => {
        if (err) reject(err);
        else resolve(results.length > 0);
      });
    });
  }

  async findByNama(nama) {
    const query = `SELECT id FROM ${this.tableName} WHERE LOWER(TRIM(nama)) = LOWER(TRIM(?)) AND deleted IS NULL LIMIT 1`;
    return new Promise((resolve, reject) => {
      this.db.query(query, [nama], (err, results) => {
        if (err) reject(err);
        else resolve(results.length > 0 ? results[0] : null);
      });
    });
  }
}

module.exports = TindakanRepository;