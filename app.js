const fs = require("fs")
const path = require('path');
const WebSocket = require('ws');
const moment = require('moment');
const multer = require('multer');
const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
let { globalRooms, globalUsers, globalFiles, globalWarns, warnLimit } = require('./src/globals.js');
const { writeLog, black_list, warnClient, checkWarn, getIpAddress } = require('./src/security.js');

require('dotenv').config();
const app = express();

// Multer upload configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'files/') // Chemin où les fichiers téléversés seront stockés
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname)
  }
})
const fileFilter = (req, file, cb) => {
  // Checking extension
  if (!file.originalname.match(/\.(webm|avi|mp4|mkv|mp3|wav|ogg|flac)$/)) {
    return cb(new Error('Seuls les fichiers image sont autorisés.'));
  }
  // Checking size
  if (file.size > 1024 * 1024 * 1000) { // 1go max
    return cb(new Error('La taille du fichier ne doit pas dépasser 1 Go.'));
  }
  cb(null, true); // Autoriser le téléversement si les conditions sont remplies
}
const upload = multer({
  storage: storage,
  fileFilter: fileFilter
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

// Simplified logging middleware (debugging)
app.use((req, res, next) => {
  if (req.url !== "/update/room" && checkWarn(req.ip)) {
    let ip=req.ip.replace('::ffff:', '');
    let realIp = getIpAddress(req).replace('::ffff:', '');
    let ipLog =  (realIp == ip) ? ip : `${realIp} via ${ip}`;
    console.log(`${moment().format('YYYY-MM-DD HH:mm:ss')} [${ipLog}]=> ${req.method} ${req.url}`);
  }
  next();
});
// Write log
app.use((req, res, next) => {
  if (checkWarn(req.ip)) {
    writeLog(req);
  }
  next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/files', express.static(path.join(__dirname, 'files')));

app.post('/upload', upload.single('file'), (req, res) => {
  res.sendStatus(200); // Répondre avec un statut 200 si le téléversement est réussi
});

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
    res.status(404).json({error: 'Room not found'});
  }
})

// app.get('/get/users', (req, res) => {
//   res.status(200).json(globalUsers);
// })
app.post('/get/user', checkParams(['userId']),(req, res) => {
  const formData = req.body;
  let userId = formData.userId;
  if (globalUsers.hasOwnProperty(userId)) {
    res.status(200).json(globalUsers[userId]);
  } else {
    res.status(404).json({error: 'User not found'});
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
    res.status(404).json({error: 'Room not found'});
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
  console.log("DEBUG OK")
  if (globalUsers.hasOwnProperty(user.uuid)) {
    console.log("DEBUG OK 2")
    if (globalUsers[user.uuid].roomHosted === roomId) {
      console.log("CHANGE")
      if (pause) {
        console.log("paused at", timecode);
        globalRooms[roomId]['pause'] = true;
        globalRooms[roomId].timecode = timecode; 
      } else {
        globalRooms[roomId].timecode = timecode + latence;
        globalRooms[roomId]['pause'] = false;
        console.log(`timecode updated: ${timecode} + ${latence*1000}ms`); // DEBUG ===================
      }
      console.log("NEW STATUS", globalRooms[roomId])
      res.status(201).send('ok');
    } else {
      res.status(401).json({error: 'Wrong host'});
      console.log("Wrong host");
    } 
  } else {
    res.status(404).json({error: 'User not found'});
    console.log("User not found");
  }
})

// Add user to room
app.post('/room/join', checkParams(['user', 'roomId']), (req, res) => {
  const formData = req.body;
  const user = formData.user;
  const roomId = formData.roomId;

  if (!globalUsers.hasOwnProperty(user.uuid)) {
    return res.status(404).json({error: 'User not found'});
  }

  if (!globalRooms.hasOwnProperty(roomId)) {
    return res.status(404).json({error: 'Room not found'});
  }

  if (globalRooms[roomId].users.some(oldUser => oldUser.uuid === user.uuid)) {
    console.log("User already in room");
    return res.status(409).json({error: `User already in room`});
  }
  console.log("Old usernames", globalRooms[roomId].users.map(user => user.username));
  globalRooms[roomId].users.push(user);
  console.log("New usernames", globalRooms[roomId].users.map(user => user.username));
  return res.status(201).send('ok');
});

// Remove user from room
app.post('/room/exit', checkParams(['user', 'roomId']),(req, res) => {
  const formData = req.body;
  const user = formData.user;
  const roomId = formData.roomId;

  if (globalUsers.hasOwnProperty(user.uuid)) {
    if (globalRooms.hasOwnProperty(roomId)) {
      globalRooms[roomId].users.splice(globalRooms[roomId].users.indexOf(user), 1);
    } else {
      console.log("Room not found");
      return res.status(404).json({error: 'Room not found'});
    }
  } else {
    console.log("User not found");
    return res.status(404).json({error: 'User not found'});
  }
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
    if (globalUsers[user.uuid].roomHosted) {
      let roomExistingId = globalUsers[user.uuid].roomHosted;
      console.log("User already in room", roomExistingId);
      delete globalRooms[roomExistingId];
    }
    if (globalFiles.includes(fileUrl)) {
      fileUrl = encodeURI(`/files/${fileUrl}`);
    }
    globalUsers[user.uuid].roomHosted = roomId;
    globalRooms[roomId] = { name: name, id: roomId, host: user, users: [user], fileUrl: fileUrl, timecode: 0, pause: true };
    res.status(201).json({ roomId: roomId });
    console.log("==> Room created", globalRooms[roomId]);
  } else {
    res.status(404).json({error: 'User not found'});
  }
})

app.get('/.env', (req, res) => {
    black_list(req.ip);
})

// Check black listed ip
app.use((req, res, next) => {
  // TODO: CHECK FONCTION NOT EXIST BEFORE WARN
  if (checkWarn(req.ip)) {
    next();
  } else {
    return res.status(403).json({ error: 'Forbidden' });
  }
})

// Handle 404
app.use((req, res, next) => {
  warnClient(req.ip);
  res.status(404).json({ error: `You got warned ['${req.ip}'] ${globalWarns[req.ip]} times  (${warnLimit} warns max)` });
  console.log(`==> Warned [${req.ip}] ${globalWarns[req.ip]} times`);
});

// Log errors
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send(`Error occurred!`);
});

function updateGlobalFiles() {
  fs.readdir('./files', (err, files) => {
    if (err) {
      console.error('Error while reading files', err);
      return;
    }
    globalFiles.splice(0, globalFiles.length, ...files);
  });
}

setInterval(updateGlobalFiles, 1000);
console.log("Start check")

module.exports = app;