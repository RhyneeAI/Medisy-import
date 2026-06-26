const fs = require('fs');
const path = require('path');

class PendaftaranRepository {
  constructor(db) {
    this.db = db;
    this.tableName = 'kk_pendaftaran';
    this._provinsiCache = new Map();
    this._kotaCache = new Map();
    this._kecamatanCache = new Map();
    this._desaCache = new Map();
    this._sqlFile = null;
  }

  clearCache() {
    this._provinsiCache.clear();
    this._kotaCache.clear();
    this._kecamatanCache.clear();
    this._desaCache.clear();
  }

  async loadAllExistingIds() {
    const rows = await this._query(
      `SELECT no_pendaftaran FROM ${this.tableName} WHERE deleted IS NULL`
    );
    return new Set(rows.map(r => r.no_pendaftaran));
  }

  _isValid(value) {
    return value && value !== 'NULL' && value.trim() !== '';
  }

  _query(sql, params) {
    return new Promise((resolve, reject) => {
      this.db.query(sql, params, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
  }

  async _lookupWithCache(cache, query, nama) {
    const key = nama.trim().toLowerCase();
    if (cache.has(key)) return cache.get(key);
    const rows = await this._query(query, [nama.trim()]);
    const result = rows.length ? rows[0] : null;
    cache.set(key, result);
    return result;
  }

  async findProvinsiByNama(nama) {
    return this._lookupWithCache(
      this._provinsiCache,
      'SELECT id FROM kk_provinsi WHERE TRIM(nama) = ? LIMIT 1',
      nama
    );
  }

  async findKotaByNama(nama) {
    return this._lookupWithCache(
      this._kotaCache,
      'SELECT id FROM kk_kota WHERE TRIM(nama) = ? LIMIT 1',
      nama
    );
  }

  async findKecamatanByNama(nama) {
    return this._lookupWithCache(
      this._kecamatanCache,
      'SELECT id FROM kk_kecamatan WHERE TRIM(nama) = ? LIMIT 1',
      nama
    );
  }

  async findDesaByNama(nama) {
    return this._lookupWithCache(
      this._desaCache,
      'SELECT id FROM kk_desa WHERE TRIM(nama) = ? LIMIT 1',
      nama
    );
  }

  generateInsertSql(dataArray) {
    if (!this._sqlFile) {
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      this._sqlFile = path.join(__dirname, '../../sql-output', `pendaftaran-${ts}.sql`);
      const dir = path.dirname(this._sqlFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    }

    const _fmt = v => {
      if (v === null || v === undefined) return 'NULL';
      if (v instanceof Date) return `'${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,'0')}-${String(v.getDate()).padStart(2,'0')} ${String(v.getHours()).padStart(2,'0')}:${String(v.getMinutes()).padStart(2,'0')}:${String(v.getSeconds()).padStart(2,'0')}'`;
      if (typeof v === 'number') return String(v);
      return `'${String(v).replace(/'/g, "\\'")}'`;
    };

    const columns = Object.keys(dataArray[0]);
    const lines = dataArray.map(data => {
      const values = columns.map(col => _fmt(data[col]));
      return `INSERT INTO \`${this.tableName}\` (\`${columns.join('`, `')}\`) VALUES (${values.join(', ')});`;
    });

    fs.appendFileSync(this._sqlFile, lines.join('\n') + '\n', 'utf8');
    return this._sqlFile;
  }

  async mapToDatabase(csvRow) {
    const now = new Date();
    const tanggal = now.toISOString().split('T')[0];
    const data = {
      nama: csvRow.nama || '',
      no_pendaftaran: csvRow.no_pendaftaran ? csvRow.no_pendaftaran.replace(/\D/g, '') : '',
      tanggal,
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

    if (this._isValid(csvRow.nama_provinsi)) {
      const provinsi = await this.findProvinsiByNama(csvRow.nama_provinsi);
      if (provinsi) data.provinsi = provinsi.id;
    }
    if (this._isValid(csvRow.nama_kota)) {
      const kota = await this.findKotaByNama(csvRow.nama_kota);
      if (kota) data.kota = kota.id;
    }
    if (this._isValid(csvRow.nama_kecamatan)) {
      const kecamatan = await this.findKecamatanByNama(csvRow.nama_kecamatan);
      if (kecamatan) data.kecamatan = kecamatan.id;
    }
    if (this._isValid(csvRow.nama_desa)) {
      const desa = await this.findDesaByNama(csvRow.nama_desa);
      if (desa) data.desa = desa.id;
    }

    return data;
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
