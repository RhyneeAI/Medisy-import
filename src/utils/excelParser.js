const ExcelJS = require('exceljs');

class ExcelParser {
  async parse(buffer, options = {}) {
    const {
      sheetName = 'Tindakan_Dokter',
      startRow = 2,
      columnMapping = {}
    } = options;

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.getWorksheet(sheetName);
    if (!worksheet) {
      throw new Error(`Sheet "${sheetName}" tidak ditemukan`);
    }

    const result = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber < startRow) return;

      const rowData = {};
      for (const [field, colIndex] of Object.entries(columnMapping)) {
        rowData[field] = row.getCell(colIndex).value ?? null;
      }

      if (Object.values(rowData).some(v => v !== null && v !== '')) {
        result.push(rowData);
      }
    });

    return result;
  }
}

module.exports = ExcelParser;
