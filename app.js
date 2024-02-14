const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const app = express();
const port = 2305;

let globalRooms = {};
let globalUsers = {};
let globalFiles = [];

// Correct placement of bodyParser
app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({ extended: false }));

app.use(express.static(path.join(__dirname, 'public')));

// Simplified logging middleware (debugging)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} [${req.ip}] => ${req.method} ${req.url}`);
  next();
});

app.get('/get/rooms', (req, res) => {
  res.json(globalRooms);
});

app.get('/get/users', (req, res) => {
  res.json(globalUsers);
});

app.get('/get/files', (req, res) => {
  res.json(globalFiles);
});

app.post('/create/user', (req, res) => {
  const formData = req.body;
  console.log(formData); // Debugging
  if (!formData.username) {
    return res.status(400).send('Username required'); // Error handling
  }
  let userUuid = uuidv4();
  globalUsers[userUuid] = { uuid: userUuid, username: formData.username, roomHosted: undefined };
  res.json(globalUsers[userUuid]); // Use res.json for JSON responses
});

app.get('/room/timecode', (req, res) => {
  const roomUuid = req.query.roomUuid; 
  if (globalRooms.hasOwnProperty(roomUuid)) {
    res.json({ timecode: globalRooms[roomUuid].timecode });
  } else {
    res.status(404).send('Room not found');
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack); // Error logging
  res.status(500).send(`Error occurred! ${err.message}`); // Send error message (debugging)
});

app.listen(port, () => {
  console.log(`App running at http://localhost:${port}`);
});
