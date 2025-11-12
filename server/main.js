/*
 Simple Task Manager API using Express
 Endpoints:
 - POST /tasks      { name, date, time, description } -> create task
 - GET  /tasks      -> list all tasks
 - DELETE /tasks/:id -> delete task
*/

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

const tasks = new Map();
const DATA_FILE = path.join(__dirname, 'tasks.json');

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function loadTasksFromFile() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, '[]', 'utf8');
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf8') || '[]';
    const arr = JSON.parse(raw);
    for (const item of arr) {
      tasks.set(item.id, item);
    }
    console.log(`Loaded ${tasks.size} tasks from file`);
  } catch (e) {
    console.error('Failed to load tasks from file:', e);
  }
}

function saveTasksToFile() {
  try {
    const arr = Array.from(tasks.values());
    fs.writeFileSync(DATA_FILE, JSON.stringify(arr, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to save tasks to file:', e);
  }
}

// Create a new task
app.post('/tasks', (req, res) => {
  const { name, date, time, description } = req.body || {};
  
  if (!name || !date || !time) {
    return res.status(400).json({ error: 'name, date, and time are required' });
  }

  const id = generateId();
  const createdAt = new Date().toISOString();

  const task = {
    id,
    name,
    date,
    time,
    description: description || '',
    status: 'active',
    comments: [],
    createdAt,
    modifiedAt: createdAt
  };

  tasks.set(id, task);
  saveTasksToFile();

  res.status(201).json(task);
});

// Get all tasks
app.get('/tasks', (req, res) => {
  const list = Array.from(tasks.values());
  res.json(list);
});

// Get a single task
app.get('/tasks/:id', (req, res) => {
  const task = tasks.get(req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json(task);
});

// Update a task
app.put('/tasks/:id', (req, res) => {
  const id = req.params.id;
  const task = tasks.get(id);
  
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const { name, date, time, description, status } = req.body || {};
  
  task.name = name !== undefined ? name : task.name;
  task.date = date !== undefined ? date : task.date;
  task.time = time !== undefined ? time : task.time;
  task.description = description !== undefined ? description : task.description;
  task.status = status !== undefined ? status : task.status;
  task.modifiedAt = new Date().toISOString();
  
  tasks.set(id, task);
  saveTasksToFile();
  
  res.json(task);
});

// Add a comment to a task
app.post('/tasks/:id/comments', (req, res) => {
  const id = req.params.id;
  const task = tasks.get(id);
  
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const { text } = req.body || {};
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Comment text is required' });
  }

  if (!task.comments) {
    task.comments = [];
  }

  const comment = {
    id: generateId(),
    text: text.trim(),
    createdAt: new Date().toISOString()
  };

  task.comments.push(comment);
  task.modifiedAt = new Date().toISOString();
  
  tasks.set(id, task);
  saveTasksToFile();
  
  res.status(201).json(comment);
});

// Delete a task
app.delete('/tasks/:id', (req, res) => {
  const id = req.params.id;
  const task = tasks.get(id);
  
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  tasks.delete(id);
  saveTasksToFile();
  
  res.json({ ok: true, message: 'Task deleted successfully' });
});

// Load persisted tasks then start server
loadTasksFromFile();

app.listen(PORT, () => {
  console.log(`Task Manager server listening on http://localhost:${PORT}`);
});

process.on('SIGINT', () => {
  console.log('Shutting down...');
  saveTasksToFile();
  process.exit(0);
});
