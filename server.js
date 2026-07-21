require('dotenv').config({ quiet: true });

const express = require('express');
const path = require('path');
const { Client } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.post('/api/test-database', async (_request, response) => {
  const client = new Client({
    host: process.env.PGHOST,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    port: Number(process.env.PGPORT || 5432),
    ssl: { rejectUnauthorized: true },
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    await client.query('SELECT 1');
    response.json({ connected: true });
  } catch (error) {
    console.error('PostgreSQL connection test failed:', error.message);
    response.status(503).json({
      connected: false,
      message: 'Could not connect to the database.',
    });
  } finally {
    await client.end().catch(() => {});
  }
});

app.listen(port, () => {
  console.log(`Travel Requests is running at http://localhost:${port}`);
});
