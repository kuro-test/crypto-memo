require("dotenv").config(); // 確保載入 .env
const { Pool } = require("pg");

console.log("🔹 DATABASE_URL:", process.env.DATABASE_URL); // 測試環境變數

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false, // 本地開發環境應設為 false
});

pool.connect()
  .then(() => console.log("🟢 PostgreSQL Connected!"))
  .catch(err => console.error("🔴 PostgreSQL Connection Error", err));

module.exports = pool;

