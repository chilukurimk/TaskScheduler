Task Scheduler Server

This is a minimal task scheduling backend implemented in Node.js using Express and node-cron.

Quick start

1. cd server
2. npm install
3. npm start

API

- POST /tasks
  - body: { "name": "task name", "schedule": "cron-expression", "payload": { "url": "https://example.com/webhook", "body": { ... } } }
  - Example schedule: "*/5 * * * * *" (every 5 seconds) or "0 * * * *" (every hour)
  - Returns: created task (id, name, schedule, payload, createdAt)

- GET /tasks
  - Lists all tasks

- GET /tasks/:id
  - Returns task details

- DELETE /tasks/:id
  - Stops and removes the scheduled task

Notes

- Tasks are stored in memory for this simple implementation. Use a persistent datastore (DB) for production.
- The scheduler will POST to payload.url with payload.body when a scheduled job runs (if payload.url is provided).
- Be careful with cron expressions; invalid expressions will be rejected.
