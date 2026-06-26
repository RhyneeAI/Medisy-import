class ImportService {
  constructor(tindakanRepository) {
    this.repository = tindakanRepository;
  }

  async importFromExcel(excelData) {
    const results = {
      success: [],
      failed: [],
      total: 0
    };

    for (const row of excelData) {
      try {
        results.total++;
        
        // Cek duplikat (opsional)
        const exists = await this.repository.checkDuplicate(row.Nama);
        if (exists) {
          results.failed.push({
            row: row,
            reason: `Data "${row.Nama}" sudah ada`
          });
          continue;
        }

        // Map data
        const mappedData = this.repository.mapExcelToDatabase(row);
        
        // Insert
        await this.repository.insert(mappedData);
        results.success.push(row.Nama);
        
      } catch (error) {
        results.failed.push({
          row: row,
          reason: error.message
        });
      }
    }

    return results;
  }

  async bulkImportFromExcel(excelData) {
    const mappedData = excelData.map(row => 
      this.repository.mapExcelToDatabase(row)
    );
    
    try {
      await this.repository.bulkInsert(mappedData);
      return {
        success: excelData.length,
        total: excelData.length
      };
    } catch (error) {
      throw new Error(`Bulk import failed: ${error.message}`);
    }
  }
}

module.exports = ImportService;