class SatuanRepository {
  constructor(db) {
    this.db = db;
    this.tableName = 'kk_satuan';
  }

  async findByNama(nama) {
    const query = `SELECT id_satuan FROM ${this.tableName} WHERE LOWER(TRIM(nama)) = LOWER(TRIM(?)) LIMIT 1`;
    return new Promise((resolve, reject) => {
      this.db.query(query, [nama], (err, results) => {
        if (err) reject(err);
        else resolve(results.length > 0 ? results[0] : null);
      });
    });
  }

  async insert(nama) {
    const query = `INSERT INTO ${this.tableName} (nama) VALUES (?)`;
    return new Promise((resolve, reject) => {
      this.db.query(query, [nama], (err, result) => {
        if (err) reject(err);
        else resolve(result.insertId);
      });
    });
  }
}

module.exports = SatuanRepository;
