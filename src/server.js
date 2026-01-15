const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || './data/2fa.db';

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize SQLite database
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Create table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS data_store (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  )
`);

// Middleware
app.use(express.json());

// CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// API: GET /api/data
app.get('/api/data', (req, res) => {
  try {
    const key = req.query.key;

    if (!key || key.length < 32) {
      return res.status(400).json({ error: 'Invalid key' });
    }

    const row = db.prepare('SELECT value FROM data_store WHERE key = ?').get(key);

    if (!row) {
      return res.json({ exists: false, data: null });
    }

    return res.json({ exists: true, data: row.value });
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// API: PUT /api/data
app.put('/api/data', (req, res) => {
  try {
    const { key, data, salt, version } = req.body;

    if (!key || key.length < 32) {
      return res.status(400).json({ error: 'Invalid key' });
    }

    if (!data) {
      return res.status(400).json({ error: 'Missing data' });
    }

    const stored = JSON.stringify({
      encryptedData: data,
      salt: salt,
      version: version || 1,
      updatedAt: Date.now(),
    });

    db.prepare(`
      INSERT INTO data_store (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(key, stored, Date.now());

    return res.json({ success: true });
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// API: DELETE /api/data
app.delete('/api/data', (req, res) => {
  try {
    const key = req.query.key;

    if (!key) {
      return res.status(400).json({ error: 'Missing key' });
    }

    db.prepare('DELETE FROM data_store WHERE key = ?').run(key);
    return res.json({ success: true });
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// Serve service-worker.js with correct MIME type
app.get('/service-worker.js', (req, res) => {
  res.type('application/javascript');
  res.sendFile(path.join(__dirname, '../public/service-worker.js'));
});

// Serve manifest.json with correct MIME type
app.get('/manifest.json', (req, res) => {
  res.type('application/json');
  res.sendFile(path.join(__dirname, '../public/manifest.json'));
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Fallback to index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`2FA Authenticator server running on port ${PORT}`);
  console.log(`Database: ${path.resolve(DB_PATH)}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  db.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Shutting down...');
  db.close();
  process.exit(0);
});
