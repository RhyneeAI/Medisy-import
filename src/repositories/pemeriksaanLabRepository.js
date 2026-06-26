class PemeriksaanLabRepository {
  constructor(db) {
    this.db = db;
    this.tableName = 'kk_pemeriksaan_lab';
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

module.exports = PemeriksaanLabRepository;
