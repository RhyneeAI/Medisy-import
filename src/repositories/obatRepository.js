class ObatRepository {
  constructor(db) {
    this.db = db;
    this.tableName = 'kk_obat';
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

  async checkDuplicate(kode) {
    const query = `SELECT id FROM ${this.tableName} WHERE kode = ? LIMIT 1`;
    return new Promise((resolve, reject) => {
      this.db.query(query, [kode], (err, results) => {
        if (err) reject(err);
        else resolve(results.length > 0);
      });
    });
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
}

module.exports = ObatRepository;
