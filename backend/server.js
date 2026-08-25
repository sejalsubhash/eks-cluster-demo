const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// DB config comes from environment variables so the same image works
// against Mumbai RDS or Ohio RDS just by changing env vars / k8s secrets.
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'demodb',
  waitForConnections: true,
  connectionLimit: 5,
};

let pool;

async function initDb() {
  pool = mysql.createPool(dbConfig);

  // Retry loop: DB may not be reachable yet right after deploy/failover.
  const maxRetries = 10;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const conn = await pool.getConnection();
      await conn.query(`
        CREATE TABLE IF NOT EXISTS customers (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      conn.release();
      console.log('Connected to DB and ensured schema exists.');
      return;
    } catch (err) {
      console.error(`DB connection attempt ${attempt} failed: ${err.message}`);
      if (attempt === maxRetries) throw err;
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

// Health endpoint — also used later as the CloudWatch/ALB health check
// target that drives the DR alarm.
app.get('/health', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    await conn.query('SELECT 1');
    conn.release();
    res.status(200).json({ status: 'ok', db: 'reachable' });
  } catch (err) {
    res.status(503).json({ status: 'error', db: 'unreachable', message: err.message });
  }
});

app.get('/customers', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, email, created_at FROM customers ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/customers', async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'name and email are required' });
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO customers (name, email) VALUES (?, ?)',
      [name, email]
    );
    res.status(201).json({ id: result.insertId, name, email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`Backend listening on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to initialize DB, exiting:', err.message);
    process.exit(1);
  });
