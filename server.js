const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const { v4: uuidV4 } = require('uuid');
const net = require('net');
require("dotenv").config();

const peerConfig = {
  host: process.env.PEER_JS_HOST,
  port: process.env.PEER_JS_PORT,
  path: process.env.PEER_JS_PATH
};

const socket = net.createServer(function(socket) {
	socket.pipe(socket);
});

const playerHeadCache = [];
const commandMap = []

registerCommands();

socket.listen(8080);

socket.on('connection', (tcpSocket) => {
    let chunk = "";
    tcpSocket.on('data', function(data) {
      chunk += data.toString();
      let d_index = chunk.indexOf(';');
      while (d_index > -1) {         
          try {
              let string = chunk.substring(0, d_index);
              let socketData = JSON.parse(string);

              var inboundData = socketData["data"];
              var command = socketData["command"];
              var auth = socketData["auth"];

              handleCommand(command, inboundData);
          }
          catch(e){
            console.error(e);
          }
          chunk = chunk.substring(d_index+1);
          d_index = chunk.indexOf(';');
      }      
    });

    tcpSocket.on('error', (err) => {
        console.error(err);
    })
})

app.use(express.json());       // to support JSON-encoded bodies
app.use(express.urlencoded({extended: true})); // to support URL-encoded bodies
app.set('view engine', 'ejs');
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.render('preroom');
})

app.post("/room/create", (req, res) => {
  res.redirect(`/room/${uuidV4()}?username=${req.body.username.toLowerCase()}`);
})

app.post("/room/join", (req, res) => {
  res.redirect(`/room/${req.body.uuid}?username=${req.body.username.toLowerCase()}`);
})

app.get('/room/:room', (req, res) => {
  res.render('room', { roomId: req.params.room, username: req.query.username, peerSettings: peerConfig });
})

app.get('/api/playerheads', (req, res) => {
  let obj = { }
  for (var key in playerHeadCache) {
    obj[key] = playerHeadCache[key]
  }
  res.json(obj);
});

io.on('connection', socket => {
  socket.on('join-room', (roomId, userId) => {

    socket.join(roomId);
    socket.to(roomId).emit('user-connected', userId);
    socket.username = userId;

    socket.on('disconnect', () => {
      socket.to(roomId).emit('user-disconnected', userId)
    })

  })
})

function pushCoordinates(coordinates, roomId){
  io.to(roomId).emit('coordinates-update', coordinates);
}

function pushPlayerHeads(headData, roomId){
  // cache the playerheads
  playerHeadCache[headData.player] = headData.skindata;
  console.log("triggered")

  io.to(roomId).emit('playerheads-update', headData);
}

function registerCommands() {
  commandMap["update-coordinates"] = pushCoordinates;
  commandMap["update-playerheads"] = pushPlayerHeads;
}

function handleCommand(command, data, roomId = "mo"){
  commandMap[command](data, roomId);
}

server.listen(process.env.PORT || 80);
