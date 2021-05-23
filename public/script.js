const socket = io('/')
const audioGrid = document.getElementById('audio-grid')
const userElement = document.getElementById("user-list")
// const myPeer = new Peer()

const myPeer = new Peer(undefined, {
  host: 'https://fuchsia-zebra-7wea4mjt.ws-eu07.gitpod.io/',
  port: '9000'
})

const myAudio = document.createElement('audio')
myAudio.muted = true
const peers = {}

var username;

navigator.mediaDevices.getUserMedia({
  video: false,
  audio: true
}).then(stream => {
  addAudioStream(myAudio, stream)

  myPeer.on('call', call => {
    call.answer(stream)
    const audio = document.createElement('audio')
    call.on('stream', userAudioStream => {
      addAudioStream(audio, userAudioStream)
    })
  })

  socket.on('user-connected', (userId) => {
    setTimeout(connectToNewUser,1000,userId,stream)
  })
})

socket.on("user-list-update", (userList) => {
  userElement.innerHTML = '';
  for(const user of userList){
    var li = document.createElement("li");

    if(username == user){
      li.style.color = "green";
      li.style.fontWeight = "bold";
    }

    li.appendChild(document.createTextNode(user));
    
    userElement.appendChild(li);
  }
})

socket.on('user-disconnected', userId => {
  if (peers[userId]) peers[userId].close()
})

myPeer.on('open', id => {
  username = id;
  socket.emit('join-room', ROOM_ID, id)
})

function connectToNewUser(userId, stream) {
  const call = myPeer.call(userId, stream)
  const audio = document.createElement('audio')
  call.on('stream', userAudioStream => {
    addAudioStream(audio, userAudioStream)
  })
  call.on('close', () => {
    audio.remove()
  })

  peers[userId] = call
}

function addAudioStream(audio, stream) {
  audio.srcObject = stream
  audio.addEventListener('loadedmetadata', () => {
    audio.play()
  })
  audioGrid.append(audio)
}
