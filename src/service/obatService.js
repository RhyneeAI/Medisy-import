class ObatService {
  constructor({ obatRepo, satuanRepo, kategoriRepo, golonganRepo }) {
    this.obatRepo = obatRepo;
    this.satuanRepo = satuanRepo;
    this.kategoriRepo = kategoriRepo;
    this.golonganRepo = golonganRepo;
  }

  async importFromFile(parsedData, onProgress) {
    const results = { success: [], failed: [], total: 0, references: { satuan: 0, kategori: 0, golongan: 0 } };

    for (const row of parsedData) {
      try {
        results.total++;
        const kode = (row.Kode || '').trim();
        if (!kode) {
          results.failed.push({ row, reason: 'Kode tidak ditemukan' });
          if (onProgress) onProgress(results.total, parsedData.length, 'failed', '-');
          continue;
        }

        const exists = await this.obatRepo.checkDuplicate(kode);
        if (exists) {
          results.failed.push({ row, reason: `Obat "${kode}" sudah ada` });
          if (onProgress) onProgress(results.total, parsedData.length, 'failed', kode);
          continue;
        }

        const idSatuan = await this._resolveSatuan(row.Satuan, results.references);
        const idKategori = await this._resolveKategori(row.Kategori, results.references);
        const idGolongan = await this._resolveGolongan(row.Golongan, results.references);

        const mappedData = {
          kode,
          nama: row.Nama || '-',
          id_golongan: idGolongan,
          id_kategori: idKategori,
          id_satuan: idSatuan,
          zat_aktif: row['Zat Aktif'] || '-',
          bpjs: '',
          status: row.Status || 'AKTIF',
          harga_beli: 0,
          percentage_selling_price: 0,
          harga_jual: this._parsePrice(row['Harga Jual']),
          harga_jual_luar: this._parsePrice(row['Harga Jual Luar']),
          ket: 'INPUT',
          id_user: 1,
          kode_kfa: row['Kode kfa'] || null,
          nama_kfa: row['Code kfa'] || null,
          created: new Date()
        };

        await this.obatRepo.insert(mappedData);
        results.success.push(kode);
        if (onProgress) onProgress(results.total, parsedData.length, 'success', kode);

      } catch (error) {
        results.failed.push({ row, reason: error.message });
        if (onProgress) onProgress(results.total, parsedData.length, 'error', error.message);
      }
    }

    return results;
  }

  _parsePrice(value) {
    if (value === null || value === undefined || value === '' || value === '-') return 0;

    const strValue = String(value).trim();
    const num = Number(strValue);
    if (isNaN(num)) return 0;

    if (num >= 1000) return Math.round(num);

    if (strValue.includes('.')) {
      const parts = strValue.split('.');
      const decimalPart = parts[1] || '';
      if (decimalPart.length === 3) {
        return parseInt(strValue.replace('.', ''), 10);
      }
      return Math.round(num * 1000);
    }

    return Math.round(num * 1000);
  }

  async _resolveSatuan(nama, refCounter) {
    if (!nama || nama === '-' || nama.trim() === '') return 0;
    const clean = nama.trim();
    const existing = await this.satuanRepo.findByNama(clean);
    if (existing) return existing.id_satuan;
    const newId = await this.satuanRepo.insert(clean);
    refCounter.satuan++;
    return newId;
  }

  async _resolveKategori(nama, refCounter) {
    if (!nama || nama === '-' || nama.trim() === '') return 0;
    const clean = nama.trim();
    const existing = await this.kategoriRepo.findByNama(clean);
    if (existing) return existing.id;
    const newId = await this.kategoriRepo.insert(clean);
    refCounter.kategori++;
    return newId;
  }

  async _resolveGolongan(nama, refCounter) {
    if (!nama || nama === '-' || nama.trim() === '') return 0;
    const clean = nama.trim();
    const existing = await this.golonganRepo.findByNama(clean);
    if (existing) return existing.id;
    const newId = await this.golonganRepo.insert(clean);
    refCounter.golongan++;
    return newId;
  }
}

module.exports = ObatService;
