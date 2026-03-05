const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Ensure the documents table exists (idempotent) to avoid "table not found" errors.
const initDb = async () => {
  try {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS documents (
        id UUID PRIMARY KEY,
        content TEXT
      )`
    );
  } catch (err) {
    console.error("DB initialization error:", err.message);
  }
};

initDb();

module.exports = pool;