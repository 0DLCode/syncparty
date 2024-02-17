const path = require('path');
const WebSocket = require('ws');
const moment = require('moment');
const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

const sleep = (millis) => {
  var stop = new Date().getTime();
  while (new Date().getTime() < stop + millis) {}
};

const wss = new WebSocket.Server({ port: 2300 });  // Create websocket server
const app = express();
const port = 2305;

let globalRooms = {};
let globalUsers = {};
let globalFiles = require('./index.json') || [];
setInterval(() => { globalFiles = require('./index.json') || [];}, 10000);

// Handle WebSocket
wss.on('connection', function connection(ws) {
  console.log(`Client connected`);

  // On message received
  ws.on('message', async function incoming(event) {
    console.log('event received:', event.toString("utf-8"));
    let msgBody = JSON.parse(event.toString("utf-8"));
    console.log('Decoded message:', msgBody);
    if (msgBody.action === 'nextTimecode') {
      let roomId = msgBody.roomId;
      let lastTimecode = msgBody.lastTimecode;
      if (globalRooms.hasOwnProperty(roomId)) {
        while (globalRooms[roomId].timecode === lastTimecode) {
          await new Promise(resolve => setTimeout(resolve, 100)); // Attendre 100ms
        }
        let timecode = globalRooms[roomId].timecode;
        ws.send(JSON.stringify({timecode: timecode}));
      } else {
        console.log("Room not found");
        ws.send(JSON.stringify({error: "Room not found"}));
      }
    }
  });
});

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

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/files', express.static(path.join(__dirname, 'files')));

// Simplified logging middleware (debugging)
app.use((req, res, next) => {
  if (req.url !== "/update/room") {
    console.log(`${moment().format('YYYY-MM-DD HH:mm:ss')} [${req.ip}] => ${req.method} ${req.url}`);
  }
  next();
});


// DEBUG ===============================================
app.get('/check', (req, res) => {
  res.status(200).json({globalRooms, globalUsers, globalFiles}, 4);
})
app.get('/get/rooms', (req, res) => {
  res.status(200).json(globalRooms);
})
app.post('/get/room', checkParams(['roomId']),(req, res) => {
  const formData = req.body;
  let roomId = formData.roomId;
  console.log(roomId)
  if (globalRooms.hasOwnProperty(roomId)) {
    res.status(200).json(globalRooms[roomId]);
  } else {
    res.status(404).send('Room not found');
  }
})
app.get('/get/users', (req, res) => {
  res.status(200).json(globalUsers);
})
app.post('/get/user', checkParams(['userId']),(req, res) => {
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
app.post('/room/timecode', checkParams(['roomId', 'timestamp']), (req, res) => {
  const formData = req.body;
  const roomId = formData.roomId;
  let timestamp = formData.timestamp;
  let latence;
  if (formData.noLatence) {
    latence = 0;
  } else {
    latence = (new Date().getTime() - timestamp) / 1000;
  }
  if (globalRooms.hasOwnProperty(roomId)) {
    let timecode = globalRooms[roomId].timecode + latence;
    res.status(200).json(timecode);
    console.log(`get timecode: ${timecode} + ${latence*1000}ms`);
  } else {
    res.status(404).send('Room not found');
  }
})

// Update room timecode by host
app.post('/update/room', checkParams(['user', 'roomId', 'timecode', 'timestamp', 'pause']),(req, res) => {
  const formData = req.body;
  const user = formData.user;
  const roomId = formData.roomId;
  const pause = formData.pause;
  let timecode = formData.timecode;
  let timestamp = formData.timestamp;

  let latence = (new Date().getTime() - timestamp) / 1000;

  if (globalUsers.hasOwnProperty(user.uuid)) {
    if (globalUsers[user.uuid].roomHosted === roomId) {
      if (pause) {
        console.log("paused at", timecode);
        globalRooms[roomId]['pause'] = true;
        globalRooms[roomId].timecode = timecode; 
      } else {
        globalRooms[roomId].timecode = timecode + latence;
        globalRooms[roomId].pause = false;
        console.log(`timecode updated: ${timecode} + ${latence*1000}ms`); // DEBUG ===================
      }
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

// Add user to room
app.post('/join/room', checkParams(['user', 'roomId']),(req, res) => {
  const formData = req.body;
  const user = formData.user;
  const roomId = formData.roomId;

  for (let oldUser of globalRooms[roomId].users) {
    if (oldUser.uuid === user.uuid) {
      console.log("User already in room");
      return res.status(409).send('User already in room');
    }
  }
  globalRooms[roomId].users.push(user);
  res.status(201).send('ok');
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
    res.status(201).json({ roomId: roomId })  // Quelque chose comme ça ;-;
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