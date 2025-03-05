const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "coindesk_news",
  password: "****", // ⚠️ 替換成你的真實密碼
  port: 5432,
});

pool.connect()
  .then(() => console.log("🟢 PostgreSQL Connected Successfully!"))
  .catch(err => console.error("🔴 PostgreSQL Connection Error:", err));

module.exports = pool;
