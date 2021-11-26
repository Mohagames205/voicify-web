const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const { v4: uuidV4 } = require('uuid');
const net = require('net');
const redis = require('redis');
const crypto = require('crypto');
var session = require('express-session');


require("dotenv").config();

const peerConfig = {
  host: process.env.PEER_JS_HOST,
  port: process.env.PEER_JS_PORT,
  path: process.env.PEER_JS_PATH
};

const redisConfig = {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD
}


const socket = net.createServer(function(socket) {
	socket.pipe(socket);
});

const client = new redis.createClient(redisConfig);

const playerHeadCache = [];
const commandMap = []

registerCommands();

socket.listen(8080);

socket.on('connection', (tcpSocket) => {
    let chunk = "";
    tcpSocket.on('data', function(data) {
      chunk += data.toString();
      let dIndex = chunk.indexOf(';');
      while (dIndex > -1) {         
          try {
              const string = chunk.substring(0, dIndex);
              const socketData = JSON.parse(string);

              const inboundData = socketData["data"];
              const command = socketData["command"];
              const __auth = socketData["auth"];

              handleCommand(command, inboundData);
          }
          catch(e){
            console.error(e);
          }
          chunk = chunk.substring(dIndex+1);
          dIndex = chunk.indexOf(';');
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
app.set('trust proxy', 1) // trust first proxy
app.use(session({
  secret: process.env.COOKIES_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: false,
    maxAge: 2592e5
  },
}))

app.get('/', (req, res) => {
  res.render('preroom', {user: req.session.user});
})

app.post("/room/create", (req, res) => {
  res.redirect(`/room/${uuidV4()}?username=${req.body.username.toLowerCase()}`);
})

app.post("/room/join", (req, res) => {
  res.redirect(`/room/${req.body.uuid}?username=${req.body.username.toLowerCase()}`);
})

app.get('/room/:room', (req, res) => {
  if(req.session.user){
    res.render('room', { roomId: req.params.room, username: req.session.user, peerSettings: peerConfig });
    return;
  }
  res.render('authenticate', {roomId: req.params.room, username: null});
})

app.get('/auth', (req, res) => {
  if(!req.session.user){
    res.render('authenticate', {username: req.query.username, roomId: req.query.roomuuid});
    return; 
  }
  username = req.session.user;
  res.redirect(`/room/${req.query.roomuuid}`);
})

app.get('/askcode', (req, res) => {
    if(req.query.auth && req.query.username){
        auth = req.query.auth;
        username = req.query.username;
        if(auth == process.env.API_SECRET){
          client.get(req.query.username.toLowerCase(), (err, reply) => {
            res.json({code: reply})
          });
          return;
        }
    }
    res.json({error: 'Authentication failed!'});
})

app.post('/createcode', (req, res) => {
  client.set(req.body.username.toLowerCase(), crypto.randomInt(10e3, 99999), "EX", 60 * 2);
  res.status(200);
})

app.get('/verifycode', (req, res) => {
  client.get(req.query.username.toLowerCase(), (err, reply) => {
    res.json({is_correct: (reply == req.query.code)})
  });
})

app.get('/authenticate', (req, res) => {
  client.get(req.query.username.toLowerCase(), (err, reply) => {
    if(reply == req.query.code){
      req.session.user = req.query.username.toLowerCase();
      username = req.query.username.toLowerCase();
      roomId = req.query.roomId;

      res.redirect(`/room/${roomId}/`);
      return;
    }
    res.json({error: 'Authentication code is incorrect.'})
  });
})

app.get('/api/playerheads', (__req, res) => {
  const obj = { }
  for (const key in playerHeadCache) {
    obj[key] = playerHeadCache[key]
  }
  res.json(obj);
});

app.post('/api/playerheads/upload', (req, __res) => {
  const playerHeadData = JSON.parse(req.body.data);
  const roomId = req.body.roomId;
  
  pushPlayerHeads(playerHeadData, roomId);
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

  socket.on('other-user-talking', (roomId, userId) => {
      socket.to(roomId).emit('other-user-talking', userId);
  })

  socket.on('other-user-not-talking', (roomId, userId) => {
    socket.to(roomId).emit('other-user-not-talking', userId);
})
})

function getAllRooms(){
  const rooms = io.of("/").adapter.rooms;
  rooms.array.forEach(element => {
    console.log(element);
  });
}

function pushCoordinates(coordinates, roomId){
  io.to(roomId).emit('coordinates-update', coordinates);
}

function pushPlayerHeads(headData, roomId){
  playerHeadCache[headData.player] = headData.skindata;
  io.to(roomId).emit('playerheads-update', headData);
}

function registerCommands() {
  commandMap["update-coordinates"] = pushCoordinates;
}

function handleCommand(command, data, roomId = "mo"){
  commandMap[command](data, roomId);
}

server.listen(process.env.PORT || 80);
