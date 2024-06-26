const { globalRooms, globalUsers, globalFiles } = require('./globals.js');
let tempLog = 100;

async function clientRoomWebSocket (ws, event) {
  const msgBody = webJsonDecode(event);
  if (msgBody.action === 'getRoom') {
    let roomId = msgBody.roomId;
    if (globalRooms.hasOwnProperty(roomId)) {
      ws.send(JSON.stringify({room: globalRooms[roomId]}));
    } else {
      ws.send(JSON.stringify({error: "Room not found"}));
    }
  }
}

async function hostRoomWebSocket (ws, event) {
   let msgBody = webJsonDecode(event);
      if (msgBody.noLog === undefined) {
        console.log('Decoded message:', msgBody);
      }
      
      if (msgBody.action === 'nextTimecode') {
        // If client ask for next timecode
        
        let roomId = msgBody.roomId;
        let lastTimecode = msgBody.lastTimecode;
        if (globalRooms.hasOwnProperty(roomId)) {
          while (globalRooms[roomId].timecode === lastTimecode) {
            await new Promise(resolve => setTimeout(resolve, 100)); // wait 100ms
          }
          let timecode = globalRooms[roomId].timecode;
          ws.send(JSON.stringify({timecode: timecode}));
        } else {
          console.log("Room not found");
          ws.send(JSON.stringify({error: "Room not found"}));
        }
      } else if (msgBody.action === 'updateRoom') {
        // If host ask to update room
  
        const user = msgBody.user;
        const roomId = msgBody.roomId;
        const pause = msgBody.pause;
        let timecode = msgBody.timecode;
        let timestamp = msgBody.timestamp;
      
        let latence = (new Date().getTime() - timestamp) / 1000 ;
      
        if (globalUsers.hasOwnProperty(user.uuid)) {
          if (globalUsers[user.uuid].roomHosted === roomId) {
            if (pause) {
              console.log("paused at", timecode);
              globalRooms[roomId]['pause'] = true;
              globalRooms[roomId].timecode = timecode; 
            } else {
              globalRooms[roomId].timecode = timecode; // + latence;
              globalRooms[roomId].pause = false;
              if (tempLog == 100) {
                console.log(`[LOG/100] timecode updated: ${timecode} (${latence*1000}ms)`); // DEBUG ===================
                tempLog = 0;
              }
              tempLog++;
            }
            ws.send(JSON.stringify({ok: true}));
          } else {
            ws.send(JSON.stringify({error: "Wrong host"}));
            console.log("Wrong host");
          } 
        } else if (msgBody.action === 'getRoom') {
          let roomId = msgBody.roomId;
          if (globalRooms.hasOwnProperty(roomId)) {
            ws.send(JSON.stringify({room: globalRooms[roomId]}));
          } else {
            ws.send(JSON.stringify({error: "Room not found"}));
          }
        } else {
          ws.send(JSON.stringify({error: "User not found"}));
          console.log("User not found");
        }
      }
}

async function homeWebSocket (ws, event) {
  const msgBody = webJsonDecode(event);

  if (msgBody.action === 'getRooms') {
    ws.send(JSON.stringify({ rooms: globalRooms }));
    // console.log("Get rooms", globalRooms);
  } else if (msgBody.action === 'getFiles') {
    ws.send(JSON.stringify({ files: globalFiles }));
    // console.log("Get files", globalFiles);
  } else {
    ws.send(JSON.stringify({ error: 'Unknown action' }));
    console.log('Unknown action');
  }
}

function webJsonDecode (event) {
  const msgBody = JSON.parse(event.toString('utf-8'));
  return msgBody;
}

module.exports = { homeWebSocket, clientRoomWebSocket, hostRoomWebSocket, webJsonDecode };
