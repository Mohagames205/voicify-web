const socket = io('/')
const audioGrid = document.getElementById('audio-grid')
const userElement = document.getElementById("user-list")
const audioSources = {};

var peerOptions = {
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
  ]}, debug: false
}

var myPeer = new Peer(USERNAME, peerOptions);
//const myAudio = document.createElement('audio')
//myAudio.muted = true
const peers = {}

// tijdelijke hack
const username = USERNAME;

navigator.mediaDevices.getUserMedia({
  video: false,
  audio: true
}).then(stream => {
  //addAudioStream(myAudio, stream)
 
  myPeer.on('call', call => {
    
    call.answer(stream)
    console.log("ANSWERED CALL AND CREATED ELEMENT FROM:", call.peer)
    const audio = document.createElement('audio')
    audio.id = call.peer

    call.on('stream', userAudioStream => {
      peers[call.peer] = call
      console.log("SENDING AUDIO STREAM TO:", call.peer)
      addAudioStream(audio, userAudioStream)
    })
  })

  socket.on('user-connected', (userId) => {
    //setTimeout(connectToNewUser,1000,userId,stream)
    connectToNewUser(userId, stream)
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
  delete peers[userId]
  console.log("User has disconnected", userId)
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
  console.log("CALLING NEW USER", userId)
  const call = myPeer.call(userId, stream)

  // set audio id if user connects
  const audio = document.createElement('audio')
  audio.id = userId;

  call.on('stream', userAudioStream => {
    console.log("SENDING AUDIO STREAM TO:", call.peer)
    addAudioStream(audio, userAudioStream)
  })
  call.on('close', () => {
    console.log("CLOSING:", call.peer)
    audio.remove()
  })

  console.log("ADDING TO PEERS LIST")
  peers[userId] = call
}

function addAudioStream(audio, stream) {
  audio.srcObject = stream
  audio.addEventListener('loadedmetadata', () => {
    audio.play()
  })
  audioGrid.append(audio)
}
