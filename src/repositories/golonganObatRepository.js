class GolonganObatRepository {
  constructor(db) {
    this.db = db;
    this.tableName = 'kk_golongan_obat';
  }

  async findByNama(nama) {
    const query = `SELECT id FROM ${this.tableName} WHERE LOWER(TRIM(nama)) = LOWER(TRIM(?)) LIMIT 1`;
    return new Promise((resolve, reject) => {
      this.db.query(query, [nama], (err, results) => {
        if (err) reject(err);
        else resolve(results.length > 0 ? results[0] : null);
      });
    });
  }

  async insert(nama) {
    const now = new Date();
    const query = `INSERT INTO ${this.tableName} (nama, singkatan, created, user, ket, id_perusahaan) VALUES (?, '', ?, 1, 'INPUT', 1)`;
    return new Promise((resolve, reject) => {
      this.db.query(query, [nama, now], (err, result) => {
        if (err) reject(err);
        else resolve(result.insertId);
      });
    });
  }
}

module.exports = GolonganObatRepository;
