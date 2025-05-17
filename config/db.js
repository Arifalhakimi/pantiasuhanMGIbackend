require("dotenv").config();

const mysql = require("mysql2/promise");

const db = mysql.createPool({
  host: process.env.DB_HOST || "srv1155.hstgr.io",
  user: process.env.DB_USER || "u344296107_arifal",
  password: process.env.DB_PASS || "Triplek041",
  database: process.env.DB_NAME || "u344296107_db_pantiasuhan",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test koneksi database
db.getConnection()
  .then((connection) => {
    console.log("✅ Koneksi database berhasil");
    // Test query
    return connection.query("SELECT 1");
  })
  .then(() => {
    console.log("✅ Query test berhasil");
  })
  .catch((err) => {
    console.error("❌ Gagal terhubung ke database:", err);
  });

module.exports = db;
