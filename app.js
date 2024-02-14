const path = require('path');
const moment = require('moment');
const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = 2305;

let globalRooms = {};
let globalUsers = {};
let globalFiles = [];

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(express.static(path.join(__dirname, 'public')));

// Simplified logging middleware (debugging)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} [${req.ip}] => ${req.method} ${req.url}`);
  next();
});



app.get('/get/rooms', (req, res) => {
  res.status(200).json(globalRooms);
})
app.get('/get/users', (req, res) => {
  res.status(200).json(globalUsers);
})
app.get('/get/files', (req, res) => {
  res.status(200).json(globalFiles);
})

app.get('/room', (req, res) => {
  res.sendFile(__dirname + '/public/room.html');
})

// Get room timecode
app.get('/room/timecode', (req, res) => {
  const formData = req.body;
  const roomUuid = formData.roomUuid;
  let timestamp = formData.timestamp;
  let latence = new Date().getTime() - timestamp;
  if (globalRooms.hasOwnProperty(roomUuid)) {
    resres.status(200).json(globalRooms[roomUuid].timecode);
  } else {
    res.status(404).send('Room not found');
  }
})

// Update room timecode by host
app.post('/update/room', (req, res) => {
  const formData = req.body;
  const user = formData.user;
  const roomUuid = formData.roomUuid;
  let timecode = formData.timecode;
  let timestamp = formData.timestamp;
  let latence = new Date().getTime() - timestamp;
  if (globalUsers.hasOwnProperty(user.uuid)) {
    if (globalUsers[user.uuid].roomHosted === roomUuid) {
    globalRooms[roomUuid].timecode = timecode + latence;
    res.status(201).send('ok');
    } else {
      res.status(401).send('Wrong host');
    } 
  } else {
    res.status(404).send('User not found');
  }
})

// Create user
app.post('/create/user', (req, res) => {
  console.log(req);
  const formData = req.body;
  console.log(formData);
  let username = formData.username;
  let userUuid = uuidv4();
  globalUsers[userUuid] = { uuid: userUuid, username: username, roomHosted: undefined };
  res.status(201).json(globalUsers[userUuid]);
})

// Create room
app.post('/create/room', (req, res) => {
  const formData = req.body;
  let name = formData.name;
  let user = formData.user;
  let fileUrl = formData.fileUrl;
  if (globalUsers.hasOwnProperty(user.uuid)) {
    let roomUuid = uuidv4();

    globalUsers[user.uuid].roomHosted = roomUuid;
    globalRooms[uuidv4()] = { name: name,
      host: user, users: [user], fileUrl: fileUrl, timecode: 0 };

    res.status(201).send(`/room?id=${roomUuid}`);  // Quelque chose comme ça ;-;
  } else {
    res.status(404).send('User not found');
  }
})

// Log errors
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send(`Error occurred! ${err.stack}`);
});

// Startup
app.listen(port, () => {
  console.log(`App running at http://localhost:${port}`);
});