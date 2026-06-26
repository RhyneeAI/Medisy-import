const mysql = require('mysql2');

class Database {
  constructor() {
    this.pool = null;
    this.connection = null;
  }

  // Method 1: Connection Pool (RECOMMENDED untuk production)
  createPool() {
    if (this.pool) return this.pool;

    this.pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'himed',
      connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
      queueLimit: parseInt(process.env.DB_QUEUE_LIMIT) || 0,
      waitForConnections: true,
      // Untuk debug (opsional)
      // debug: process.env.NODE_ENV === 'development'
    });

    // Test koneksi
    this.pool.getConnection((err, connection) => {
      if (err) {
        console.error('❌ Database connection failed:', err.message);
        process.exit(1);
      } else {
        console.log('✅ Database connected successfully');
        connection.release();
      }
    });

    return this.pool;
  }

  // Method 2: Single Connection (untuk development/sederhana)
  async getConnection() {
    if (this.connection) return this.connection;

    try {
      this.connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_DATABASE || 'himed'
      });

      await this.connection.connect();
      console.log('✅ Database connected successfully');
      
      return this.connection;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      throw error;
    }
  }

  // Helper untuk close connection
  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('Database pool closed');
    }
    if (this.connection) {
      await this.connection.end();
      console.log('Database connection closed');
    }
  }
}

module.exports = new Database();