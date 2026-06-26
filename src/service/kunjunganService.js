class KunjunganService {
  constructor({
    pendaftaranRepo, kunjunganRepo, asuransiRepo, kunjunganAsuransiRepo,
    kategoriPenyakitRepo, pemeriksaanDiagnosaRepo,
    pemeriksaanLabRepo, pemeriksaanTambahanLabRepo,
    obatRepo, resepObatRepo, tindakanRepo, pemeriksaanTindakanRepo, usersRepo
  }) {
    this.pendaftaranRepo = pendaftaranRepo;
    this.kunjunganRepo = kunjunganRepo;
    this.asuransiRepo = asuransiRepo;
    this.kunjunganAsuransiRepo = kunjunganAsuransiRepo;
    this.kategoriPenyakitRepo = kategoriPenyakitRepo;
    this.pemeriksaanDiagnosaRepo = pemeriksaanDiagnosaRepo;
    this.pemeriksaanLabRepo = pemeriksaanLabRepo;
    this.pemeriksaanTambahanLabRepo = pemeriksaanTambahanLabRepo;
    this.obatRepo = obatRepo;
    this.resepObatRepo = resepObatRepo;
    this.tindakanRepo = tindakanRepo;
    this.pemeriksaanTindakanRepo = pemeriksaanTindakanRepo;
    this.usersRepo = usersRepo;
  }

  async importFromFile(parsedData) {
    const results = { success: [], failed: [], total: 0 };

    for (const row of parsedData) {
      try {
        results.total++;
        const noReg = String(row.NO_REGISTRASI || '').trim();
        if (!noReg) { results.failed.push({ row, reason: 'No registrasi kosong' }); continue; }

        const noUrut = String(row.NO || row.no || '').trim();
        const idPendaftaran = await this._findOrCreatePendaftaran(row);
        const now = new Date();
        const tanggal = this._parseTanggal(row.TANGGAL);

        const idDokter = await this._resolvePemeriksa(row.POLI);

        const kunjunganData = {
          id_pendaftaran: idPendaftaran,
          tanggal,
          id_dokter: idDokter,
          id_layanan: 1,
          id_antrian: 0,
          prioritas: '1',
          status_kunjungan: row.STATUS_KUNJUNGAN || 'UMUM',
          status_berobat: row.STATUS_BEROBAT || 'Berobat',
          tinggi_badan: this._parseNumeric(row.TINGGI_BADAN),
          berat_badan: this._parseNumeric(row.BERAT_BADAN),
          lingkar_perut: this._parseNumeric(row.LINGKAR_PERUT),
          nilai_bmi: this._parseFloat(row.BMI),
          sistole: this._parseNumeric(row.SISTOLE),
          diastole: this._parseNumeric(row.DIASTOLE),
          spo2: this._parseSpo2(row.SPO2),
          resdiratory_rate: this._parseNumeric(row.RESPIRATORY_RATE),
          heart_rate: this._parseNumeric(row.HEART_RATE),
          suhu_badan: this._parseNumeric(row.SUHU_BADAN) || 0,
          keluhan_awal: row.KELUHAN || null,
          riwayat_peny_sekarang: row.RIWAYAT_PENYAKIT_SEKARANG || null,
          id_user: idDokter || 0,
          id_perusahaan: 1,
          ket: 'IMPORT',
          created: now,
          ucode: null,
        };

        const kunjunganResult = await this.kunjunganRepo.insert(kunjunganData);
        const idKunjungan = kunjunganResult.insertId;

        await this._handleAsuransi(row, idKunjungan, now);
        await this._updateJenisPasien(idPendaftaran, row);
        await this._handleDiagnosa(row.DIAGNOSA, idKunjungan, now);
        await this._handleLab(row.PEMERIKSAAN_LAB, idKunjungan, now);
        await this._handleObat(row.OBAT_LANGSUNG, idKunjungan, now);
        await this._handleTindakan(row.TINDAKAN, idKunjungan, now);

        results.success.push(noReg);

      } catch (error) {
        results.failed.push({ row: { no_reg: row.NO_REGISTRASI }, reason: error.message });
      }
    }

    return results;
  }

  async _findOrCreatePendaftaran(row) {
    const noReg = String(row.NO_REGISTRASI || '').trim();
    let nik = String(row.NIK || '').trim();
    const nama = String(row.NAMA || '').trim();
    const alamat = String(row.ALAMAT || '').trim();
    const tanggalLahir = this._parseTanggal(row.TANGGAL_LAHIR);
    const jenisKelamin = String(row.JENIS_KELAMIN || '').trim();

    if (!/^\d{16}$/.test(nik)) {
      nik = null;
    }

    const existing = await this.pendaftaranRepo.findByNikOrNama(nik, nama);
    if (existing) return existing.id;

    const now = new Date();
    const insertData = {
      no_pendaftaran: noReg,
      nama,
      no_identitas: nik || null,
      alamat: alamat || null,
      tanggal_lahir: tanggalLahir || null,
      jenis_kelamin: this._mapJenisKelamin(jenisKelamin),
      user: 0,
      id_perusahaan: 1,
      created: now,
      updated: now,
      ket: 'IMPORT',
      hash_id: '',
      ucode: ''
    };

    const result = await this.pendaftaranRepo.insert(insertData);
    return result.insertId;
  }

  async _handleAsuransi(row, idKunjungan, now) {
    const statusKunjungan = String(row.STATUS_KUNJUNGAN || '').trim().toUpperCase();
    if (statusKunjungan !== 'ASURANSI') return;

    const namaAsuransi = String(row.ASURANSI || '').trim();
    if (!namaAsuransi) return;

    let idAsuransi;
    const existing = await this.asuransiRepo.findByNama(namaAsuransi);
    if (existing) {
      idAsuransi = existing.id;
    } else {
      idAsuransi = await this.asuransiRepo.insert(namaAsuransi);
    }

    await this.kunjunganAsuransiRepo.insert({
      id_kunjungan: idKunjungan,
      id_asuransi: idAsuransi,
      id_antrian: 0,
      user: 1,
      created: now
    });
  }

  async _updateJenisPasien(idPendaftaran, row) {
    const jenisPasien = String(row.PASIEN_BARU_LAMA || '').trim();
    if (!jenisPasien) return;
    await this.pendaftaranRepo.updateJenisPasien(idPendaftaran, jenisPasien);
  }

  async _handleDiagnosa(text, idKunjungan, now) {
    if (!text || text.trim() === '') return;
    const items = this._parseDiagnosa(text);
    for (const item of items) {
      let idKategori;
      const existing = await this.kategoriPenyakitRepo.findByKode(item.kode);
      if (existing) {
        idKategori = existing.id;
      } else {
        idKategori = await this.kategoriPenyakitRepo.insert({
          kode: item.kode,
          nama: item.nama,
          status: 'AKTIF',
          id_perusahaan: 1,
          ket: 'IMPORT',
          created: now,
          user: 1
        });
      }

      await this.pemeriksaanDiagnosaRepo.insert({
        id_kunjungan: idKunjungan,
        id_kategori_penyakit: idKategori,
        jenis_diagnosa: 'UTAMA',
        user: 1,
        id_perusahaan: 1,
        ket: 'INPUT',
        created: now
      });
    }
  }

  async _handleLab(text, idKunjungan, now) {
    if (!text || text.trim() === '') return;
    const items = this._parseLab(text);
    for (const item of items) {
      const existing = await this.pemeriksaanLabRepo.findByNama(item.nama);
      if (!existing) continue;

      await this.pemeriksaanTambahanLabRepo.insert({
        id_pemeriksaan_lab: existing.id,
        id_kunjungan: idKunjungan,
        hasil: item.hasil || '-',
        biaya: 1,
        petugas: 1,
        id_paket: 0,
        ket: 'INPUT',
        created: now,
        deleted: new Date(0),
        updated: now,
        ucode: ''
      });
    }
  }

  async _handleObat(text, idKunjungan, now) {
    if (!text || text.trim() === '') return;
    const items = this._parseObat(text);
    for (const item of items) {
      if (!item.nama) continue;
      const existing = await this.obatRepo.findByNama(item.nama);
      if (!existing) continue;

      const resepData = {
        id_kunjungan: idKunjungan,
        id_obat: existing.id,
        qty: 1,
        signa1: item.signa1 || null,
        signa2: item.signa2 || null,
        signa_desc: item.signa_desc || null,
        penggunaan: 1,
        user: 1,
        id_perusahaan: 1,
        status: 'LANGSUNG',
        tipe_pemberian_obat: 'Obat Pulang',
        created: now
      };

      await this.resepObatRepo.insert(resepData);
    }
  }

  async _handleTindakan(text, idKunjungan, now) {
    if (!text || text.trim() === '') return;
    const items = this._parseTindakan(text);
    for (const item of items) {
      if (!item.nama) continue;
      const existing = await this.tindakanRepo.findByNama(item.nama);
      if (!existing) continue;

      await this.pemeriksaanTindakanRepo.insert({
        id_kunjungan: idKunjungan,
        id_jenis_tindakan: existing.id,
        qty: item.qty || 1,
        id_icd9: 0,
        perawat: 0,
        user: 1,
        id_perusahaan: 1,
        status: 'LANGSUNG',
        id_bayar: 0,
        total_bayar: 0,
        ket: 'INPUT',
        created: now
      });
    }
  }

  async _resolvePemeriksa(poli) {
    const namaPoli = String(poli || '').trim();
    if (!namaPoli) return 0;
    const existing = await this.usersRepo.findByNamaLengkap(namaPoli);
    if (existing) return existing.id;
    return await this.usersRepo.insert(namaPoli);
  }

  _parseTanggal(val) {
    if (!val || val === '') return null;
    if (val instanceof Date) {
      return val.toISOString().split('T')[0];
    }
    const str = String(val).trim();
    const months = {
      'januari': '01', 'februari': '02', 'maret': '03', 'april': '04',
      'mei': '05', 'juni': '06', 'juli': '07', 'agustus': '08',
      'september': '09', 'oktober': '10', 'november': '11', 'desember': '12'
    };

    const match = str.match(/(\d+)\s+(\w+)\s+(\d+)/);
    if (match) {
      const day = match[1].padStart(2, '0');
      const month = months[match[2].toLowerCase()] || '01';
      const year = match[3];
      return `${year}-${month}-${day}`;
    }

    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
    return null;
  }

  _parseNumeric(val) {
    if (val === undefined || val === null || val === '') return null;
    const str = String(val).trim();
    const match = str.match(/^([\d.]+)/);
    if (match) return parseFloat(match[1]);
    const num = parseFloat(str);
    return isNaN(num) ? null : num;
  }

  _parseFloat(val) {
    if (val === undefined || val === null || val === '') return null;
    const num = parseFloat(String(val).trim());
    return isNaN(num) ? null : num;
  }

  _parseSpo2(val) {
    if (val === undefined || val === null || val === '') return null;
    const str = String(val).trim().replace('%', '');
    const num = parseFloat(str);
    return isNaN(num) ? null : String(num);
  }

  _mapJenisKelamin(jk) {
    const jkLower = (jk || '').toLowerCase();
    if (jkLower === 'laki-laki' || jkLower === 'l' || jkLower === '1') return 'L';
    if (jkLower === 'perempuan' || jkLower === 'p' || jkLower === '2') return 'P';
    return null;
  }

  _parseDiagnosa(text) {
    const result = [];
    const lines = text.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const match = trimmed.match(/^([A-Z]\d+[\.\d]*)\s*-\s*(.+)/);
      if (match) {
        result.push({ kode: match[1].trim(), nama: match[2].trim() });
      }
    }
    return result;
  }

  _parseLab(text) {
    const result = [];
    const lines = text.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const match = trimmed.match(/^(.+?)\s*:\s*(.+)/);
      if (match) {
        result.push({ nama: match[1].trim(), hasil: match[2].trim() });
      }
    }
    return result;
  }

  _parseObat(text) {
    const result = [];
    const lines = text.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const dashIdx = trimmed.indexOf(' - ');
      if (dashIdx === -1) continue;

      const namaObat = trimmed.substring(0, dashIdx).trim();
      const rest = trimmed.substring(dashIdx + 3).trim();

      let signa1 = null, signa2 = null, signaDesc = null;

      const signaMatch = rest.match(/(\d+)x(\d+)/);
      if (signaMatch) {
        signa1 = parseFloat(signaMatch[1]);
        signa2 = parseFloat(signaMatch[2]);

        const afterSigna = rest.substring(rest.indexOf(signaMatch[0]) + signaMatch[0].length).trim();
        signaDesc = afterSigna.replace(/Obat\s+Pulang$/, '').trim() || null;
      } else {
        signaDesc = rest.replace(/Obat\s+Pulang$/, '').trim() || null;
      }

      result.push({ nama: namaObat, signa1, signa2, signa_desc: signaDesc });
    }
    return result;
  }

  _parseTindakan(text) {
    const result = [];
    const lines = text.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const dashIdx = trimmed.indexOf(' - ');
      const nama = dashIdx !== -1 ? trimmed.substring(0, dashIdx).trim() : trimmed.trim();
      const rest = dashIdx !== -1 ? trimmed.substring(dashIdx + 3).trim() : '';

      let qty = 1;
      if (rest) {
        const qtyMatch = rest.match(/qty\s*:\s*(\d+)/i);
        if (qtyMatch) qty = parseInt(qtyMatch[1], 10);
      }

      result.push({ nama, qty });
    }
    return result;
  }
}

module.exports = KunjunganService;
