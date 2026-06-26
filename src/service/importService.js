class ImportService {
  constructor(repository, idField = 'Nama', batchSize = 100) {
    this.repository = repository;
    this.idField = idField;
    this.batchSize = batchSize;
  }

  _progress(onProgress, ...args) {
    try {
      if (onProgress) onProgress(...args);
    } catch (e) {
      console.error('[ImportService] progress error (client may have disconnected):', e.message);
    }
  }

  async _flush(batch, results, parsedLength, onProgress) {
    if (!batch.length) return;

    await this.repository.bulkInsert(batch);
    if (typeof this.repository.generateInsertSql === 'function') {
      this.repository.generateInsertSql(batch);
    }

    for (const item of batch) {
      const name = item.nama || item[this.idField] || item.no_pendaftaran;
      results.success.push(name);
      this._progress(onProgress, results.total, parsedLength, 'success', name);
    }
    batch.length = 0;
  }

  async importFromFile(parsedData, onProgress) {
    const results = { success: [], failed: [], total: 0 };
    const batch = [];

    let existingIds = null;
    if (typeof this.repository.loadAllExistingIds === 'function') {
      try {
        existingIds = await this.repository.loadAllExistingIds();
        console.log(`[ImportService] preloaded ${existingIds.size} existing IDs`);
      } catch (e) {
        console.error('[ImportService] failed to preload IDs:', e.message);
      }
      if (typeof this.repository.clearCache === 'function') {
        this.repository.clearCache();
      }
    }

    for (const [i, row] of parsedData.entries()) {
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
          this._progress(onProgress, results.total, parsedData.length, 'failed', row.nama || row[this.idField] || row.no_pendaftaran);
          continue;
        }

        const mappedData = await this.repository.mapToDatabase(row);
        batch.push(mappedData);
        if (existingIds) existingIds.add(idValue);

        if (batch.length >= this.batchSize) {
          await this._flush(batch, results, parsedData.length, onProgress);
        }
      } catch (error) {
        console.error(`[ImportService] error at row ${i}:`, error.message);
        results.failed.push({ row, reason: error.message });
        batch.length = 0;
        this._progress(onProgress, results.total, parsedData.length, 'error', error.message);
      }
    }

    // flush remaining
    try {
      await this._flush(batch, results, parsedData.length, onProgress);
    } catch (error) {
      console.error('[ImportService] final flush error:', error.message);
      for (const item of batch) {
        results.failed.push({ row: item, reason: error.message });
      }
      this._progress(onProgress, results.total, parsedData.length, 'error', error.message);
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
