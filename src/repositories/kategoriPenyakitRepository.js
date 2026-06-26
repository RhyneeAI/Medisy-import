class KategoriPenyakitRepository {
  constructor(db) {
    this.db = db;
    this.tableName = 'kk_kategori_penyakit';
  }

  async findByKode(kode) {
    const query = `SELECT id FROM ${this.tableName} WHERE LOWER(TRIM(kode)) = LOWER(TRIM(?)) LIMIT 1`;
    return new Promise((resolve, reject) => {
      this.db.query(query, [kode], (err, results) => {
        if (err) reject(err);
        else resolve(results.length > 0 ? results[0] : null);
      });
    });
  }

  async insert(data) {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map(() => '?').join(', ');
    const query = `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders})`;

    return new Promise((resolve, reject) => {
      this.db.query(query, values, (err, result) => {
        if (err) reject(err);
        else resolve(result.insertId);
      });
    });
  }
}

module.exports = KategoriPenyakitRepository;
