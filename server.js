require('dotenv').config({ quiet: true });

const express = require('express');
const path = require('path');
const { Client } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.post('/api/travel-requests', async (request, response) => {
  const { reason, startDate, endDate } = request.body;

  if (!reason?.trim() || !startDate || !endDate) {
    return response.status(400).json({
      message: 'Reason, start date, and end date are required.',
    });
  }

  if (endDate < startDate) {
    return response.status(400).json({
      message: 'End date cannot be before start date.',
    });
  }

  const client = new Client({
    host: process.env.AZURE_POSTGRESQL_HOST,
    user: process.env.AZURE_POSTGRESQL_USER,
    password: process.env.AZURE_POSTGRESQL_PASSWORD,
    database: process.env.AZURE_POSTGRESQL_DATABASE,
    port: Number(process.env.AZURE_POSTGRESQL_PORT || 5432),
    ssl: process.env.AZURE_POSTGRESQL_SSL === 'true'
      ? { rejectUnauthorized: true }
      : false,
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    await client.query(
      `INSERT INTO travel_request
        ("Reason for Travel", "Start Date", "End Date", "Request Status")
       VALUES ($1, $2, $3, $4)`,
      [reason.trim(), startDate, endDate, 'Pending'],
    );
    response.status(201).json({ message: 'Travel request submitted.' });
  } catch (error) {
    console.error('Travel request insert failed:', error.message);
    response.status(500).json({
      message: 'Could not submit the travel request.',
    });
  } finally {
    await client.end().catch(() => {});
  }
});

app.listen(port, () => {
  console.log(`Travel Requests is running at http://localhost:${port}`);
});
