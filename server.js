const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const { v4: uuidV4 } = require('uuid')

app.set('view engine', 'ejs')
app.use(express.static('public'))

app.get('/', (req, res) => {
  res.redirect(`/${uuidV4()}`)
})

app.get('/:room', (req, res) => {
  res.render('room', { roomId: req.params.room})
})

io.on('connection', socket => {
  socket.on('join-room', (roomId, userId) => {

    

    socket.join(roomId)
    socket.to(roomId).emit('user-connected', userId)
    socket.username = userId
    socket.roomId = roomId

    clientNames = []

    io.in(roomId).fetchSockets().then(clients => {
      for(const client of clients){
          clientNames.push(client.username)
      }

      socket.to(roomId).emit('user-list-update', clientNames);
      io.sockets.in(roomId).emit('user-list-update', clientNames);
    });

    socket.on('disconnect', () => {
      clientNames = []

    io.in(roomId).fetchSockets().then(clients => {
      for(const client of clients){
          clientNames.push(client.username)
      }

      socket.to(roomId).emit('user-list-update', clientNames);
      io.to(roomId).emit('user-list-update', clientNames);
    });

      socket.to(roomId).emit('user-disconnected', userId)
    })

  })
})

server.listen(process.env.PORT || 80)
