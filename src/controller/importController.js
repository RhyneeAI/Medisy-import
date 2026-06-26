const ExcelParser = require('../utils/excelParser');
const ImportService = require('../service/importService');

class ImportController {
  constructor(importService) {
    this.service = importService;
    this.parser = new ExcelParser();
  }

  async importTindakan(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'File Excel tidak ditemukan'
        });
      }

      const excelData = await this.parser.parse(req.file.buffer, {
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

      const result = await this.service.importFromExcel(excelData);

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
}

module.exports = ImportController;
