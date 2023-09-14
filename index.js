const express = require('express');
const app = express();
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

app.use(cors());
app.use(express.static('public'));
require('dotenv').config();

// Define the path to the JSON database file.
const dbFilePath = path.join(__dirname, 'data', 'database.json');

//Midleware to parse form data
app.use(express.urlencoded({ extended: true }));

// Middleware to load and parse the database file.
function loadDatabase(req, res, next) {
  const rawData = fs.readFileSync(dbFilePath, 'utf8');
  req.database = JSON.parse(rawData);
  next();
}

// Middleware to save the database.
function saveDatabase(req, res, next) {
  fs.writeFileSync(dbFilePath, JSON.stringify(req.database, null, 2));
  next();
}

// Initialize the database with an empty object if it doesn't exist.
if (!fs.existsSync(dbFilePath)) {
  fs.writeFileSync(dbFilePath, JSON.stringify({ users: [] }, null, 2));
}

// Routes

// Add this route to serve your HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Create a new user
app.post('/api/users', loadDatabase, (req, res) => {
  const { username } = req.body;

  // Check if the username already exists
  if (req.database.users.some((user) => user.username === username)) {
    return res.status(400).json({ error: 'Username already exists' });
  }

  const newUser = { username, _id: uuidv4() };
  req.database.users.push(newUser);
  saveDatabase(req, res, () => {
    res.json(newUser);
  });
});


// Get a list of all users
app.get('/api/users', loadDatabase, (req, res) => {
  res.json(req.database.users);
});

// Add a new exercise to a user's log
app.post('/api/users/:_id/exercises', loadDatabase, (req, res) => {
  const { _id } = req.params;
  const { description, duration, date } = req.body;
  const user = req.database.users.find((u) => u._id === _id);

  if (!user) {
    res.status(404).json({ error: 'User not found' });
  } else {
    const exercise = {
      description,
      duration: parseInt(duration),
      date: date || new Date().toDateString(),
    };

    if (!user.log) {
      user.log = [exercise];
    } else {
      user.log.push(exercise);
    }

    saveDatabase(req, res, () => {
      res.json({
        _id: user._id,
        username: user.username,
        description: exercise.description,
        duration: exercise.duration,
        date: new Date(exercise.date).toDateString(), // Format the date
      });
    });
  }
});


// Get a user's exercise log
app.get('/api/users/:_id/logs', loadDatabase, (req, res) => {
  const { _id } = req.params;
  const user = req.database.users.find((u) => u._id === _id);

  if (!user) {
    res.status(404).json({ error: 'User not found' });
  } else {
    const { from, to, limit } = req.query;
    let log = user.log || [];

    if (from) {
      log = log.filter((entry) => new Date(entry.date) >= new Date(from));
    }
    if (to) {
      log = log.filter((entry) => new Date(entry.date) <= new Date(to));
    }
    if (limit) {
      log = log.slice(0, limit);
    }

    res.json({
      username: user.username,
      _id: user._id,
      count: log.length, // Add the count property
      log,
    });
  }
});

// Start the server
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  const address = `http://localhost:${server.address().port}`;
  console.log(`Your app is listening on ${address}`);
});
