# Travel Requests

A minimal Node.js web app using Express.

## Run locally

```sh
npm install
npm start
```

Before starting the app, copy `.env.example` to `.env` and provide the PostgreSQL
connection settings. Submitting the form writes a new row to the
`travel_request` table with a request status of `Pending`. In PowerShell, copy the template with
`Copy-Item .env.example .env`.

Then open http://localhost:3000. A health check is available at
http://localhost:3000/api/health.
