class ImportService {
  constructor(repository, idField = 'Nama') {
    this.repository = repository;
    this.idField = idField;
  }

  async importFromFile(parsedData, onProgress) {
    const results = {
      success: [],
      failed: [],
      total: 0
    };

    for (const row of parsedData) {
      try {
        results.total++;

        const exists = await this.repository.checkDuplicate(
          row[this.idField] || row.nama || row.no_pendaftaran
        );
        if (exists) {
          results.failed.push({
            row,
            reason: `Data "${row[this.idField] || row.nama || row.no_pendaftaran}" sudah ada`
          });
          if (onProgress) onProgress(results.total, parsedData.length, 'failed', row.nama || row[this.idField] || row.no_pendaftaran);
          continue;
        }

        const mappedData = await this.repository.mapToDatabase(row);
        await this.repository.insert(mappedData);
        results.success.push(row.nama || row[this.idField] || row.no_pendaftaran);
        if (onProgress) onProgress(results.total, parsedData.length, 'success', row.nama || row[this.idField] || row.no_pendaftaran);

      } catch (error) {
        results.failed.push({ row, reason: error.message });
        if (onProgress) onProgress(results.total, parsedData.length, 'error', error.message);
      }
    }

    return results;
  }

  async bulkImport(parsedData) {
    const mappedData = await Promise.all(parsedData.map(row =>
      this.repository.mapToDatabase(row)
    ));

    try {
      await this.repository.bulkInsert(mappedData);
      return { success: parsedData.length, total: parsedData.length };
    } catch (error) {
      throw new Error(`Bulk import failed: ${error.message}`);
    }
  }
}

module.exports = ImportService;
