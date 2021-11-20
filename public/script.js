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
  addUserElement(username);

  var speechEvents = hark(stream, {});

  myPeer.on('call', call => {
    
    call.answer(stream)
    console.log("ANSWERED CALL AND CREATED ELEMENT FROM:", call.peer)
    const audio = document.createElement('audio')
    audio.id = call.peer
    addUserElement(call.peer)

    call.on('stream', userAudioStream => {
      peers[call.peer] = call
      console.log("SENDING AUDIO STREAM TO:", call.peer)
      addAudioStream(audio, userAudioStream)
    })
  })

  socket.on('user-connected', (userId) => {
    addUserElement(userId);
    setTimeout(connectToNewUser,1500,userId,stream)
    //connectToNewUser(userId, stream)
  })

  speechEvents.on("speaking", function(){
    setUserIsTalking(username);
    socket.emit('other-user-talking', ROOM_ID, username);
  })

  speechEvents.on("stopped_speaking", function(){
    setUserIsNotTalking(username);
    socket.emit('other-user-not-talking', ROOM_ID, username);
  })

  
  socket.on('other-user-talking', userId => {
    setUserIsTalking(userId);
  }) 

  socket.on('other-user-not-talking', userId => {
    setUserIsNotTalking(userId);
  })
})


socket.on('user-disconnected', userId => {
  if (peers[userId]) peers[userId].close()
  delete peers[userId]

  var audio = document.getElementById(userId);
  if(audio !== null) {
    audio.remove();
  }

  removeUserElement(userId);

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
              //const userVolume = 1 - (userDistance / 40)
              const userVolume = 0.9990 - 0.1701 * userDistance + 0.01827 * userDistance ^ 2 - 0.001052 * userDistance ^ 3 + 2.915e-005 * userDistance ^ 4 + -3.061e-007 * userDistance ^ 5;
              userAudio.volume = userVolume;
            }
          else {
              userAudio.volume = 0;
          }
        }
      }
});

function displayCachedSkins(cachedPlayerHeads) {
  for(const player in cachedPlayerHeads) {
      const skinData = cachedPlayerHeads[player];

      img = document.getElementById(player.toLowerCase() + "img");
      if(img == null) return;

      img.setAttribute("src", "data:image/png;base64," + skinData);

  }
}

socket.on('playerheads-update', socketData => {
  var player = socketData["player"];
  var skinData = socketData["skindata"];

  if(!skinData || !player) return;
  
  img = document.getElementById(`${player}` + "img");
  if(img == null) return;
  img.setAttribute("src", "data:image/png;base64," + skinData);
});

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
    console.log("SENDING AUDIO STREAM TO:", call.peer);
    addAudioStream(audio, userAudioStream);
  })
  call.on('close', () => {
    console.log("CLOSING:", call.peer);
    audio.remove();
  })

  console.log("ADDING TO PEERS LIST");
  peers[userId] = call;
}


function removeUserElement(user) {
  var userEl = document.getElementById(`${user}-profile`);
  if(userEl !== null) {
      userEl.remove();
  }
}

function addUserElement(user) {
  var div = document.createElement("div");
  div.className = "user";
  div.id = `${user}-profile`
  div.innerHTML = `<div class='skin'><img id=${user}img width='90px' height='90px' src='https://via.placeholder.com/90'/></div><div class='text'>${user}</div>`

  if(username == user){
    div.style.backgroundColor = "#0f3605"
  }
  
  userElement.appendChild(div);

  // load cool things
  fetch("/api/playerheads")
  .then(data => {
    data.json().then((jsonData) => {
      displayCachedSkins(jsonData);
    });
  })
}

function setUserIsTalking(userId) {
  var userProfile = document.getElementById(`${userId}-profile`);
  if(userProfile != null){
    userProfile.style.borderStyle = "solid";
    userProfile.style.borderColor = "green";
  }
}


function setUserIsNotTalking(userId) {
  var userProfile = document.getElementById(`${userId}-profile`);
  if(userProfile != null){
    userProfile.style.border = "unset"
  }
}

function addAudioStream(audio, stream) {
  audio.srcObject = stream
  audio.addEventListener('loadedmetadata', () => {
    audio.play()
  })
  audioGrid.append(audio)
}
