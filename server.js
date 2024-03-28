const WSServer = require('ws').Server;
const server = require('http').createServer();
const { homeWebSocket, clientRoomWebSocket, hostRoomWebSocket } = require('./src/webSocketManager.js');
const app = require('./app.js');


const port = process.env.PORT || 2305;

// Init websocket server
const wss = new WSServer({
    server: server
});

// Set http request to express ap
server.on('request', app);

wss.on('connection', function connection (ws, req) {
  console.log(`Websocket connected on [${req.url}]`);
  ws.on('message', function incoming (event) {
    if (req.url === '/home') {
      homeWebSocket(ws, event);
    } else if (req.url === '/room/host') {
      hostRoomWebSocket(ws, event);
    } else if (req.url === '/room/client') {
      clientRoomWebSocket(ws, event);
    }
  });
});

// Startup
server.listen(port, () => {
  console.log(`App running at http://localhost:${port}`);
});
