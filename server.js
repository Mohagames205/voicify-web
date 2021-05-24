const express = require('express')
const app = express()
const { ExpressPeerServer } = require('peer');
const server = require('http').Server(app)
const io = require('socket.io')(server)
const { v4: uuidV4 } = require('uuid')

const peerServer = ExpressPeerServer(server, {
  debug: true
});

app.use(express.json());       // to support JSON-encoded bodies
app.use(express.urlencoded()); // to support URL-encoded bodies

app.use('/peerjs', peerServer);

app.set('view engine', 'ejs')
app.use(express.static('public'))

app.get('/', (req, res) => {
  res.render('preroom')
})

/*app.get('/joinroom', (req, res) => {
  res.redirect(`/${uuidV4()}`)
})*/

app.post("/room/create", (req, res) => {
  res.redirect(`/room/${uuidV4()}?username=${req.body.username}`)
})

app.post("/room/join", (req, res) => {
  res.redirect(`/room/${req.body.uuid}?username=${req.body.username}`)
})

app.get('/room/:room', (req, res) => {
  res.render('room', { roomId: req.params.room, username: req.query.username})
})

app.post('/api/distances', (req, res) => {
  console.log(req.body.coordinates)
  coordinates = JSON.parse(req.body.coordinates)

  pushCoordinates(coordinates, req.body.roomId);

  console.log("COORDINATE API CALLED")
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
