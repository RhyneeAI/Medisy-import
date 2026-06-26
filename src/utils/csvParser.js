const fs = require('fs');

class CsvParser {
  parse(buffer, options = {}) {
    const {
      startRow = 1,
      fieldDelimiter = ';',
      columnMapping = {}
    } = options;

    const text = buffer.toString('utf8');
    const lines = text.split(/\r?\n/).filter(line => line.trim());

    const result = [];
    const fields = Object.keys(columnMapping);

    for (let i = 0; i < lines.length; i++) {
      if (i < startRow - 1) continue;

      const rawFields = this._parseRow(lines[i]);
      if (!rawFields || rawFields.length === 0) continue;
      if (rawFields.every(f => f === null || f === '')) continue;

      const rowData = {};
      let hasData = false;

      for (let j = 0; j < fields.length; j++) {
        const csvField = fields[j];
        const colIndex = columnMapping[csvField];
        if (colIndex !== undefined && colIndex < rawFields.length) {
          const val = rawFields[colIndex];
          rowData[csvField] = val;
          if (val !== null && val !== '') hasData = true;
        }
      }

      if (hasData) {
        result.push(rowData);
      }
    }

    return result;
  }

  _parseRow(rawLine) {
    const firstQuote = rawLine.indexOf('"');
    const lastQuote = rawLine.lastIndexOf('"');
    if (firstQuote === -1 || lastQuote <= firstQuote) return null;

    const inner = rawLine.substring(firstQuote + 1, lastQuote);
    const rawFields = inner.split(';');

    return rawFields.map(f => {
      let val = f.replace(/""/g, '"');
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
      }
      if (val === 'NULL' || val === 'null') return null;
      return val;
    });
  }
}

module.exports = CsvParser;
