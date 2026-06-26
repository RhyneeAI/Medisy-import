const XLSX = require('xlsx');

class XlsParser {
  parse(buffer, options = {}) {
    const {
      sheetIndex = 0,
      startRow = 6,
      columnMapping = {}
    } = options;

    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[sheetIndex];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    const result = [];
    const orderedFields = Object.keys(columnMapping);

    for (let i = startRow; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.every(c => c === '')) continue;

      const rowData = {};
      let hasData = false;

      for (let j = 0; j < orderedFields.length; j++) {
        const field = orderedFields[j];
        const colIndex = columnMapping[field];
        const val = row[colIndex] !== undefined ? row[colIndex] : '';
        rowData[field] = val;
        if (val !== '' && val !== null) hasData = true;
      }

      if (hasData) {
        result.push(rowData);
      }
    }

    return result;
  }
}

module.exports = XlsParser;
