const path = require('path');
const moment = require('moment');
const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = 2305;

let globalRooms = {};
let globalUsers = {};
let globalFiles = require('./index.json') || []; setInterval(() => { globalFiles = require('./index.json') || [];}, 10000);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(express.static(path.join(__dirname, 'public')));

// Simplified logging middleware (debugging)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} [${req.ip}] => ${req.method} ${req.url}`);
  next();
});

// DEBUG ===============================================
app.get('/check', (req, res) => {
  res.status(200).json({globalRooms, globalUsers, globalFiles}, 4);
})
app.get('/get/rooms', (req, res) => {
  res.status(200).json(globalRooms);
})
app.get('/get/room', checkParams(['roomId']),(req, res) => {
  const formData = req.body;
  let roomId = formData.roomId;
  if (globalRooms.hasOwnProperty(roomId)) {
    res.status(200).json(globalRooms[roomId]);
  } else {
    res.status(404).send('Room not found');
  }
})
app.get('/get/users', (req, res) => {
  res.status(200).json(globalUsers);
})
app.get('/get/user', checkParams(['useId']),(req, res) => {
  const formData = req.body;
  let userId = formData.userId;
  if (globalUsers.hasOwnProperty(userId)) {
    res.status(200).json(globalUsers[userId]);
  } else {
    res.status(404).send('User not found');
  }
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
  const roomId = formData.roomId;
  let timestamp = formData.timestamp;
  let latence = new Date().getTime() - timestamp;
  if (globalRooms.hasOwnProperty(roomId)) {
    resres.status(200).json(globalRooms[roomId].timecode + latence);
  } else {
    res.status(404).send('Room not found');
  }
})

// Check if all required params are present
function checkParams(requiredParams) {
  return function(req, res, next) {
    const formData = req.body;
    let missingParams = [];

    for (const param of requiredParams) {
      if (!(param in req.body)) {
        missingParams.push(param);
      }
    }

    if (missingParams.length > 0) {
      return res.status(400).json({ error: `Missing args : ${missingParams.join(', ')}` });
    }

    next();
  };
}

// Update room timecode by host
app.post('/update/room', checkParams(['user', 'roomId', 'timecode', 'timestamp']),(req, res) => {
  const formData = req.body;
  const user = formData.user;
  const roomId = formData.roomId;
  let timecode = formData.timecode;
  let timestamp = formData.timestamp;

  let latence = new Date().getTime() - timestamp;

  if (globalUsers.hasOwnProperty(user.uuid)) {
    if (globalUsers[user.uuid].roomHosted === roomId) {
    globalRooms[roomId].timecode = timecode + latence;
    res.status(201).send('ok');
    } else {
      res.status(401).send('Wrong host');
      console.log("Wrong host");
    } 
  } else {
    res.status(404).send('User not found');
    console.log("User not found");
  }
})

// Create user
app.post('/create/user', checkParams(['username']),(req, res) => {
  const formData = req.body;
  let username = formData.username;

  let userUuid = uuidv4();
  globalUsers[userUuid] = { uuid: userUuid, username: username, roomHosted: undefined };
  res.status(201).json(globalUsers[userUuid]);
  console.log("==> User created", globalUsers[userUuid]);
})

// Create room
app.post('/create/room', checkParams(['name', 'user', 'fileUrl']),(req, res) => {
  const formData = req.body;
  let name = formData.name;
  let user = formData.user;
  let fileUrl = formData.fileUrl;

  if (globalUsers.hasOwnProperty(user.uuid)) {
    let roomId = uuidv4();
    if (user.uuid.roomHosted) {
      uuidExisting = globalUsers[user.uuid].roomHosted;
      delete globalRooms[uuidExisting];
    }
    globalUsers[user.uuid].roomHosted = roomId;
    globalRooms[roomId] = { name: name, id: roomId,
      host: user, users: [user], fileUrl: fileUrl, timecode: 0 };
    res.status(201).send(`/room?id=${roomId}&userId=${user.uuid}`);  // Quelque chose comme ça ;-;
    console.log("==> Room created", globalRooms[roomId]);
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