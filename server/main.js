/*
 Simple Task Scheduler API using Express and node-cron.
 Endpoints:
 - POST /tasks      { name, schedule (cron), payload? } -> create and schedule task
 - GET  /tasks      -> list tasks
 - GET  /tasks/:id  -> get task details
 - DELETE /tasks/:id -> remove and stop task

 The scheduled job currently will optionally POST to payload.url with payload.body when the task runs.
*/

const express = require('express');
const cron = require('node-cron');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const tasks = new Map();
const DATA_FILE = path.join(__dirname, 'sample.json');

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function serializeTask(task) {
  const { id, name, schedule, payload, createdAt } = task;
  return { id, name, schedule, payload, createdAt };
}

function loadTasksFromFile() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, '[]', 'utf8');
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf8') || '[]';
    const arr = JSON.parse(raw);
    for (const item of arr) {
      const { id, name, schedule, payload, createdAt } = item;
      if (!cron.validate(schedule)) {
        console.warn(`Skipping invalid cron expression for task ${id}`);
        continue;
      }
      const job = cron.schedule(
        schedule,
        async () => {
          console.log(`[${new Date().toISOString()}] Running task ${id} (${name})`);
          if (payload && payload.url) {
            try {
              const resp = await axios.post(payload.url, payload.body || {});
              console.log(`Task ${id} triggered ${payload.url} - status ${resp.status}`);
            } catch (err) {
              console.error(`Task ${id} failed to call ${payload.url}:`, err.message || err.toString());
            }
          }
        },
        { scheduled: true }
      );
      tasks.set(id, { id, name, schedule, payload, createdAt, job });
    }
  } catch (e) {
    console.error('Failed to load tasks from file:', e);
  }
}

function saveTasksToFile() {
  try {
    const arr = Array.from(tasks.values()).map((t) => {
      const { id, name, schedule, payload, createdAt } = t;
      return { id, name, schedule, payload, createdAt };
    });
    fs.writeFileSync(DATA_FILE, JSON.stringify(arr, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to save tasks to file:', e);
  }
}

app.post('/tasks', (req, res) => {
  const { name, schedule, payload } = req.body || {};
  if (!name || !schedule) {
    return res.status(400).json({ error: 'name and schedule are required' });
  }
  if (!cron.validate(schedule)) {
    return res.status(400).json({ error: 'invalid cron expression' });
  }

  const id = generateId();
  const createdAt = new Date().toISOString();

  const job = cron.schedule(
    schedule,
    async () => {
      console.log(`[${new Date().toISOString()}] Running task ${id} (${name})`);
      if (payload && payload.url) {
        try {
          const resp = await axios.post(payload.url, payload.body || {});
          console.log(`Task ${id} triggered ${payload.url} - status ${resp.status}`);
        } catch (err) {
          console.error(`Task ${id} failed to call ${payload.url}:`, err.message || err.toString());
        }
      }
    },
    { scheduled: true }
  );

  tasks.set(id, { id, name, schedule, payload, createdAt, job });
  // persist tasks
  try { saveTasksToFile(); } catch (e) { /* handled in saveTasksToFile */ }

  res.status(201).json(serializeTask(tasks.get(id)));
});

app.get('/tasks', (req, res) => {
  const list = Array.from(tasks.values()).map(serializeTask);
  res.json(list);
});

app.get('/tasks/:id', (req, res) => {
  const t = tasks.get(req.params.id);
  if (!t) return res.status(404).json({ error: 'not found' });
  res.json(serializeTask(t));
});

app.delete('/tasks/:id', (req, res) => {
  const id = req.params.id;
  const t = tasks.get(id);
  if (!t) return res.status(404).json({ error: 'not found' });
  try {
    t.job.stop();
  } catch (e) {
    // ignore
  }
  tasks.delete(id);
  // persist tasks
  try { saveTasksToFile(); } catch (e) { /* handled in saveTasksToFile */ }
  res.json({ ok: true });
});

// load persisted tasks then start server
loadTasksFromFile();

app.listen(PORT, () => console.log(`Task Scheduler server listening on ${PORT}`));

process.on('SIGINT', () => {
  console.log('Shutting down, stopping scheduled jobs...');
  for (const t of tasks.values()) {
    try { t.job.stop(); } catch (e) {}
  }
  // save current tasks before exit
  try { saveTasksToFile(); } catch (e) {}
  process.exit(0);
});
