const socket = io('/')
const audioGrid = document.getElementById('audio-grid')
const userElement = document.getElementById("user-list")
const audioSources = {};

var myPeer = new Peer(USERNAME, {
    host: 'voicify-web.herokuapp.com',
    path: '/peerjs',
    config: { 'iceServers': [
    { url: 'stun:stun.l.google.com:19302' },
    { url: 'stun:stun1.l.google.com:19302' },
{ url: 'stun:stun2.l.google.com:19302' },
{ url: 'stun:stun3.l.google.com:19302' },
{ url: 'stun:stun4.l.google.com:19302' },
{ url: 'stun:stun.voipbuster.com' },
{ url: 'stun:stun.voipstunt.com' },
{ url: 'stun:stun.voxgratia.org' }
  ]
   },

debug: 3
});
const myAudio = document.createElement('audio')
myAudio.muted = true
const peers = {}

// tijdelijke hack
const username = USERNAME;

navigator.mediaDevices.getUserMedia({
  video: false,
  audio: true
}).then(stream => {
  addAudioStream(myAudio, stream)

  myPeer.on('call', call => {
    call.answer(stream)

    const audio = document.createElement('audio')
    audio.id = call.peer

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

socket.on('coordinates-update', coordinates => {

  const primaryUser = Object.keys(coordinates)[0]
  const volumes = JSON.parse(coordinates[primaryUser])
  
  for (var username in volumes) {
    userAudio = document.getElementById(username)
    userDistance = volumes[username] 
    if(userDistance <= 30){
      if(userAudio !== null) {
        const userVolume = userDistance / 30
        userAudio.volume = userVolume;
        console.log(userAudio.volume)
      }
    }
  }
})

myPeer.on('open', id => {
  socket.emit('join-room', ROOM_ID, id)
})

function connectToNewUser(userId, stream) {
  const call = myPeer.call(userId, stream)

  // set audio id if user connects
  const audio = document.createElement('audio')
  audio.id = userId;

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
