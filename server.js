const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const { v4: uuidV4 } = require('uuid')
const net = require('net');
require("dotenv").config();

const peerConfig = {
  host: process.env.PEER_JS_HOST,
  port: process.env.PEER_JS_PORT,
  path: process.env.PEER_JS_PATH
}

var socket = net.createServer(function(socket) {
	socket.pipe(socket);
});

socket.listen(8080);

socket.on('connection', (tcpSocket) => {
    tcpSocket.on('data', function(chunk) {

        coordinates = JSON.parse(chunk.toString())
        console.log(coordinates);
        pushCoordinates(coordinates, 'mo');
    });

    tcpSocket.on('error', (err) => {
        console.log(err.message);
    })

})

app.use(express.json());       // to support JSON-encoded bodies
app.use(express.urlencoded({extended: true})); // to support URL-encoded bodies

app.set('view engine', 'ejs')
app.use(express.static('public'))

app.get('/', (req, res) => {
  res.render('preroom')
})

/*app.get('/joinroom', (req, res) => {
  res.redirect(`/${uuidV4()}`)
})*/

app.post("/room/create", (req, res) => {
  res.redirect(`/room/${uuidV4()}?username=${req.body.username.toLowerCase()}`)
})

app.post("/room/join", (req, res) => {
  res.redirect(`/room/${req.body.uuid}?username=${req.body.username.toLowerCase()}`)
})

app.get('/room/:room', (req, res) => {
  res.render('room', { roomId: req.params.room, username: req.query.username, peerSettings: peerConfig })
})

app.post('/api/distances', (req, res) => {
  coordinates = JSON.parse(req.body.coordinates)
  pushCoordinates(coordinates, req.body.roomId);
})

io.on('connection', socket => {
  socket.on('join-room', (roomId, userId) => {

    socket.join(roomId)
    socket.to(roomId).emit('user-connected', userId)
    socket.username = userId;
    
    updateUserlist(socket, roomId)

    socket.on('disconnect', () => {
      updateUserlist(socket, roomId)
      socket.to(roomId).emit('user-disconnected', userId)
    })

  })
})

function pushCoordinates(coordinates, roomId){
  console.log(roomId)
  io.to(roomId).emit('coordinates-update', coordinates);
}

function updateUserlist(socket, roomId){
  clientNames = []

      io.in(roomId).fetchSockets().then(clients => {
        for(const client of clients){
            clientNames.push(client.username)
        }

        socket.to(roomId).emit('user-list-update', clientNames);
        io.to(roomId).emit('user-list-update', clientNames);
      });
}

server.listen(process.env.PORT || 80)
