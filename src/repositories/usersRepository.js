class UsersRepository {
  constructor(db) {
    this.db = db;
    this.tableName = 'kk_users';
  }

  async findByNamaLengkap(nama) {
    const query = `SELECT id FROM ${this.tableName} WHERE LOWER(TRIM(nama_lengkap)) = LOWER(TRIM(?)) LIMIT 1`;
    return new Promise((resolve, reject) => {
      this.db.query(query, [nama], (err, results) => {
        if (err) reject(err);
        else resolve(results.length > 0 ? results[0] : null);
      });
    });
  }

  async insert(nama) {
    const now = new Date();
    const query = `INSERT INTO ${this.tableName} (nama_lengkap, username, password, level, jabatan, id_perusahaan, ket, created, status, satusehat_mode) VALUES (?, ?, '', 0, 0, 1, 'IMPORT', ?, '', 0)`;
    const username = nama.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();
    return new Promise((resolve, reject) => {
      this.db.query(query, [nama, username, now], (err, result) => {
        if (err) reject(err);
        else resolve(result.insertId);
      });
    });
  }
}

module.exports = UsersRepository;
