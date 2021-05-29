const socket = io('/')
const audioGrid = document.getElementById('audio-grid')
const userElement = document.getElementById("user-list")

var peerOptions = {
    host: PEER_HOST,
    port: PEER_PORT,
    path: PEER_PATH,
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

console.log(peerOptions)

var myPeer = new Peer(USERNAME.toLowerCase(), peerOptions);
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
    setTimeout(connectToNewUser,1000,userId,stream)
    //connectToNewUser(userId, stream)
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

  var audio = document.getElementById(userId);
  if(audio !== null) {
    audio.remove();
  }

  console.log("User has disconnected", userId)
})



socket.on('coordinates-update', coordinates => {
    var primaryVolumes = coordinates[username]
    if(!primaryVolumes) return;
    for (volumeUser in primaryVolumes){
        userAudio = document.getElementById(volumeUser)
        userDistance = primaryVolumes[volumeUser]

        if(userAudio !== null) {
          if(userDistance <= 40){
              const userVolume = 1 - (userDistance / 40)
              userAudio.volume = userVolume;
            }
          else {
              userAudio.volume = 0;
          }
        }
      }
})

myPeer.on('open', id => {
  socket.emit('join-room', ROOM_ID, id)
})

/* This is called whenever a new user joins the call
 * This function sends the audio stream of the new user to the existing users in the call
 * and adds the audio element for that user.
 */
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
