const ExcelParser = require('../utils/excelParser');
const XlsParser = require('../utils/xlsParser');
const CsvParser = require('../utils/csvParser');

class ImportController {
  constructor({ tindakanService, pendaftaranService, obatService, kunjunganService }) {
    this.tindakanService = tindakanService;
    this.pendaftaranService = pendaftaranService;
    this.obatService = obatService;
    this.kunjunganService = kunjunganService;
    this.excelParser = new ExcelParser();
    this.xlsParser = new XlsParser();
    this.csvParser = new CsvParser();
  }

  async import(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'File tidak ditemukan'
        });
      }

      const tipe = req.body.tipe;
      if (!tipe) {
        return res.status(400).json({
          success: false,
          message: 'Parameter "tipe" diperlukan (tindakan / pendaftaran / obat / kunjungan)'
        });
      }

      const handlers = {
        tindakan: () => this._importTindakan(req.file),
        pendaftaran: () => this._importPendaftaran(req.file),
        obat: () => this._importObat(req.file),
        kunjungan: () => this._importKunjungan(req.file)
      };

      const handler = handlers[tipe];
      if (!handler) {
        return res.status(400).json({
          success: false,
          message: `Tipe "${tipe}" tidak dikenal`
        });
      }

      const result = await handler();

      return res.status(200).json({
        success: true,
        message: 'Import selesai',
        data: result
      });

    } catch (error) {
      console.error('Import error:', error);
      return res.status(500).json({
        success: false,
        message: 'Gagal import data',
        error: error.message
      });
    }
  }

  async _importTindakan(file) {
    const excelData = await this.excelParser.parse(file.buffer, {
      sheetName: 'Tindakan_Dokter',
      startRow: 2,
      columnMapping: {
        Nama: 2,
        ICD9: 3,
        Biaya: 4,
        BHP: 5,
        Perawat: 6,
        Klinik: 7,
        'Fee Dokter': 8
      }
    });

    return this.tindakanService.importFromFile(excelData);
  }

  async _importPendaftaran(file) {
    const isCsv = file.mimetype === 'text/csv' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.originalname.endsWith('.csv');

    const data = isCsv
      ? this.csvParser.parse(file.buffer, {
          startRow: 2,
          columnMapping: {
            no_pendaftaran: 0,
            no_register_keluarga: 1,
            no_identitas: 2,
            nama: 3,
            status_menikah: 4,
            pendidikan: 5,
            bahasa_dikuasai: 6,
            jenis_kelamin: 7,
            gol_darah: 8,
            status_pendaftaran: 9,
            tanggal_lahir: 10,
            tempat_lahir: 11,
            telpon: 12,
            telpon_rumah: 13,
            email: 14,
            nama_penanggung_jawab: 15,
            alamat: 16,
            nama_desa: 17,
            nama_kecamatan: 18,
            nama_kota: 19,
            nama_provinsi: 20,
            negara: 21,
            rt: 22,
            rw: 23,
            kode_pos: 24
          }
        })
      : await this.excelParser.parse(file.buffer, {
          sheetName: 'Pendaftaran',
          startRow: 2,
          columnMapping: {
            no_pendaftaran: 1,
            no_register_keluarga: 2,
            no_identitas: 3,
            nama: 4,
            status_menikah: 5,
            pendidikan: 6,
            bahasa_dikuasai: 7,
            jenis_kelamin: 8,
            gol_darah: 9,
            status_pendaftaran: 10,
            tanggal_lahir: 11,
            tempat_lahir: 12,
            telpon: 13,
            telpon_rumah: 14,
            email: 15,
            nama_penanggung_jawab: 16,
            alamat: 17,
            nama_desa: 18,
            nama_kecamatan: 19,
            nama_kota: 20,
            nama_provinsi: 21,
            negara: 22,
            rt: 23,
            rw: 24,
            kode_pos: 25
          }
        });

    return this.pendaftaranService.importFromFile(data);
  }

  async _importObat(file) {
    const excelData = await this.excelParser.parse(file.buffer, {
      sheetName: 'List_Obat',
      startRow: 2,
      columnMapping: {
        Kode: 2,
        Nama: 3,
        'Kode kfa': 4,
        'Code kfa': 5,
        Satuan: 6,
        'Harga Jual': 7,
        'Harga Jual Luar': 8,
        Kategori: 9,
        Golongan: 10,
        'Zat Aktif': 11,
        Status: 12
      }
    });

    return this.obatService.importFromFile(excelData);
  }

  async _importKunjungan(file) {
    const isXls = file.originalname.match(/\.xls$/i) &&
      !file.originalname.match(/\.xlsx$/i);

    const data = isXls
      ? this.xlsParser.parse(file.buffer, {
          startRow: 6,
          columnMapping: {
            NO: 0,
            TANGGAL: 1,
            NO_REGISTRASI: 2,
            NAMA: 3,
            NIK: 4,
            JENIS_KELAMIN: 5,
            STATUS_KUNJUNGAN: 6,
            ASURANSI: 7,
            NOMOR_BPJS: 8,
            STATUS_BEROBAT: 9,
            ALAMAT: 10,
            POLI: 11,
            TANGGAL_LAHIR: 12,
            UMUR: 13,
            PASIEN_BARU_LAMA: 14,
            DIAGNOSA: 15,
            BERAT_BADAN: 16,
            TINGGI_BADAN: 17,
            SISTOLE: 18,
            DIASTOLE: 19,
            SPO2: 20,
            RESPIRATORY_RATE: 21,
            HEART_RATE: 22,
            SUHU_BADAN: 23,
            LINGKAR_PERUT: 24,
            BMI: 25,
            KETERANGAN_BMI: 26,
            PEMERIKSAAN_LAB: 27,
            SKRINING_VISUAL: 28,
            KELUHAN: 29,
            RIWAYAT_PENYAKIT_SEKARANG: 30,
            PEMERIKSAAN_FISIK: 31,
            OBAT_LANGSUNG: 32,
            OBAT_RACIK: 33,
            TINDAKAN: 34,
          }
        })
      : await this.excelParser.parse(file.buffer, {
          sheetName: 'Daftar Pasien',
          startRow: 7,
          columnMapping: {
            NO: 1,
            TANGGAL: 2,
            NO_REGISTRASI: 3,
            NAMA: 4,
            NIK: 5,
            JENIS_KELAMIN: 6,
            STATUS_KUNJUNGAN: 7,
            ASURANSI: 8,
            NOMOR_BPJS: 9,
            STATUS_BEROBAT: 10,
            ALAMAT: 11,
            POLI: 12,
            TANGGAL_LAHIR: 13,
            UMUR: 14,
            PASIEN_BARU_LAMA: 15,
            DIAGNOSA: 16,
            BERAT_BADAN: 17,
            TINGGI_BADAN: 18,
            SISTOLE: 19,
            DIASTOLE: 20,
            SPO2: 21,
            RESPIRATORY_RATE: 22,
            HEART_RATE: 23,
            SUHU_BADAN: 24,
            LINGKAR_PERUT: 25,
            BMI: 26,
            KETERANGAN_BMI: 27,
            PEMERIKSAAN_LAB: 28,
            SKRINING_VISUAL: 29,
            KELUHAN: 30,
            RIWAYAT_PENYAKIT_SEKARANG: 31,
            PEMERIKSAAN_FISIK: 32,
            OBAT_LANGSUNG: 33,
            OBAT_RACIK: 34,
            TINDAKAN: 35,
          }
        });

    return this.kunjunganService.importFromFile(data);
  }
}

module.exports = ImportController;
