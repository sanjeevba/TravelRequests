# Travel Requests

A React front end with a Node.js and Express API.

## Run locally

```sh
npm install
npm start
```

`npm start` automatically creates a fresh production build before starting
Express.

Before starting the app, copy `.env.example` to `.env` and provide the PostgreSQL
connection settings. Submitting the form writes a new row to the
`travel_request` table with a request status of `Pending`. In PowerShell, copy the template with
`Copy-Item .env.example .env`.

Then open http://localhost:3000. A health check is available at
http://localhost:3000/api/health.

For development, run `npm run dev`. Vite serves the React app at
http://localhost:5173 and proxies API requests to Express on port 3000.
