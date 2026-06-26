class ImportService {
  constructor(repository, idField = 'Nama', batchSize = 500) {
    this.repository = repository;
    this.idField = idField;
    this.batchSize = batchSize;
  }

  async importFromFile(parsedData, onProgress) {
    const results = { success: [], failed: [], total: 0 };
    const batch = [];

    let existingIds = null;
    if (typeof this.repository.loadAllExistingIds === 'function') {
      existingIds = await this.repository.loadAllExistingIds();
      if (typeof this.repository.clearCache === 'function') {
        this.repository.clearCache();
      }
    }

    for (const row of parsedData) {
      try {
        results.total++;
        const idValue = row[this.idField] || row.nama || row.no_pendaftaran;

        let isDuplicate = false;
        if (existingIds) {
          isDuplicate = existingIds.has(idValue);
        } else {
          isDuplicate = await this.repository.checkDuplicate(idValue);
        }

        if (isDuplicate) {
          results.failed.push({ row, reason: `Data "${idValue}" sudah ada` });
          if (onProgress) onProgress(results.total, parsedData.length, 'failed', row.nama || row[this.idField] || row.no_pendaftaran);
          continue;
        }

        const mappedData = await this.repository.mapToDatabase(row);
        batch.push(mappedData);
        if (existingIds) existingIds.add(idValue);

        if (batch.length >= this.batchSize) {
          await this.repository.bulkInsert(batch);
          if (typeof this.repository.generateInsertSql === 'function') {
            this.repository.generateInsertSql(batch);
          }
          for (const item of batch) {
            results.success.push(item.nama || item[this.idField] || item.no_pendaftaran);
            if (onProgress) onProgress(results.total, parsedData.length, 'success', item.nama || item[this.idField] || item.no_pendaftaran);
          }
          batch.length = 0;
        }
      } catch (error) {
        results.failed.push({ row, reason: error.message });
        if (onProgress) onProgress(results.total, parsedData.length, 'error', error.message);
      }
    }

    if (batch.length > 0) {
      await this.repository.bulkInsert(batch);
      if (typeof this.repository.generateInsertSql === 'function') {
        this.repository.generateInsertSql(batch);
      }
      for (const item of batch) {
        results.success.push(item.nama || item[this.idField] || item.no_pendaftaran);
        if (onProgress) onProgress(results.total, parsedData.length, 'success', item.nama || item[this.idField] || item.no_pendaftaran);
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
