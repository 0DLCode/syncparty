import * as utils from '/utils.js';
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('id');
let userId = urlParams.get('userId');

const roomName = document.getElementById("room-name");
const formUsername = document.getElementById('username');
const formButton = document.getElementById('form-button');
const userForm = document.getElementById("userForm");
const videoSource = document.getElementById('video-source');
const listUsersElement = document.getElementById('list-users');
const mimeCodec = 'video/mp4; codecs="avc1.42E01E"';

let localUser;
let localRoom;
let roomUsers = {};

let latence = 0.285;
const userLatence = document.getElementById('user-latence');
const userLatenceLabel = document.getElementById('latence-label');

console.log(window.location.origin);

let STOP = false;
let hostPaused = true;
let IsRoomDeleted = false;

// Get the room by id
async function fetchRoom() {
  return fetch(`/get/room`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ roomId: roomId })
  })
  .then(response => response.json())
  .then(data => {
    return data
  })
  .catch(error => {
    console.error('Error fetching data:', error);
  });
}

function webFetchRoom(socket) {
  socket.send(JSON.stringify({ action: "getRoom", roomId: roomId, noLog: true }));
}

// Get user by id
async function fetchUser() {
  return fetch(`/get/user`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ userId: userId })
  })
  .then(response => response.json())
  .then(data => {
    return data
  })
  .catch(error => {
    console.error('Error fetching data:', error);
  });
}

function fetchAll() {
  console.log("Fetching all...");
  return Promise.all([fetchRoom(), fetchUser()])
  .then(([room, user]) => {
    localRoom = room
    console.log("Check room", localRoom);
    localUser = user
    console.log("Check user", localUser);
    return room, user
  })  
}

function fetchRoomTimecode() {
  return fetch(`/room/timecode`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ roomId: roomId, timestamp: new Date().getTime() })
  }).then((response) => {
    response = response.json();
    if (response) {
      return response
    } else {
      throw new Error('Failed to fetch timecode ')
    }
  }).catch((err) => {
    console.error(err)
  })
}

// Fetch subtitles .srt or .ass
async function fetchSubtitleFiles(selectedFile) {
  const basename = (givenFile) => givenFile.split('/').pop();
  const response = await fetch('/get/files');
  const files = await response.json();
  let subtitleFiles = [];

  return new Promise((resolve) => {
    setTimeout(() => {
      for (let file of files) {
        const fileNameWithoutExtension = basename(file).split('.').slice(0, -1).join('.');
        const fileExtension = basename(file).split('.').pop();
        if ((fileExtension === 'srt' || fileExtension === 'ass') && file.startsWith(basename(fileNameWithoutExtension))) {
          subtitleFiles.push(file);
        }
      }
      resolve(subtitleFiles);
    }, 100);
  });
}

async function updateSubtitleSelect(selectedSubtitle) {
  // Remove all existing track elements
  for (let i = 0; i < videoSource.textTracks.length; i++) {
    videoSource.textTracks[i].remove();
  }
  const track = document.createElement('track');
  track.src = `/files/${selectedSubtitle}`;
  track.kind = 'subtitles';
  track.srclang = 'fr'; // Subtitle language
  track.label = 'French'; // Subtitle label
  track.default = true;
  videoSource.appendChild(track); // Add new track
  videoSource.textTracks[0].mode = 'showing';
  videoSource.load();
  videoSource.play();
}


function showUsers(room) {
  listUsersElement.innerHTML = "";
  for (let user in room.users) {
    user = room.users[user];
    if (user.uuid === room.host.uuid) {
      listUsersElement.innerHTML += `<li><strong>[HOST]</strong> ${user.username}</li>`;
    } else if (user.uuid === userId) {
      listUsersElement.innerHTML += `<li>${user.username}  <em>(You)</em></li>`;
    } else {
      
      listUsersElement.innerHTML += `<li>${user.username}</li>`; 
    }
  }
}

function webUpdateRoom(socket) {
  socket.send(JSON.stringify({ action: "updateRoom", user: localUser, roomId: roomId,
    timecode: videoSource.currentTime, timestamp: new Date().getTime(), pause: hostPaused , noLog: true}));
}

function nextRoomTimecode() {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://${window.location.hostname}:2300/`);

    let message = { action: "nextTimecode", timecode: videoSource.currentTime, roomId: roomId, timestamp: new Date().getTime() };
    console.log("Message:", message);

    socket.onopen = function() {
      socket.send(JSON.stringify(message));
      console.log('Connection WebSocket active');
      
    };

    socket.onmessage = function(event) {
      let decodedMessage = utils.webJsonDecode(event);
      if (decodedMessage.error) {
        console.error('WEBSOCKET Error:', decodedMessage.error);
        reject(decodedMessage.error);
      } else {
        console.log('Next timecode:', decodedMessage.timecode);
        resolve(decodedMessage.timecode);
      }
    };

    socket.onerror = function(error) {
      console.error('WebSocket Error:', error);
      reject(error);
    };
  }).catch((error) => {
    reject(error);
});
}

function joinRoom() {
  // add user to room
  fetch(`/room/join`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ roomId: roomId, user: localUser })
  }).then((response) => {
    if (!response.ok) {
      throw new Error('Failed to join room ' + response.status)
    }
  }).catch((err) => {
    console.error(err)
  })
}

function nextRoom() {
  fetch('/get/user', { 
    method: 'POST', 
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ userId: localRoom.host.uuid })
  }).then((response) => {
    if (!response.ok) {
      throw new Error('Failed to get user ' + response.status)
    }
    return response.json();
  }).then((data) => {
    let nextRoom = data.roomHosted;
    window.location = encodeURI(`/room?id=${nextRoom}&userId=${localUser.uuid}`);
  }).catch((err) => {
    console.error(err)
    //goHome();
  })
}

function goHome() {
  window.location.href = encodeURI(`/`)
}

document.addEventListener('DOMContentLoaded', () => {
  console.log("id", roomId)
  console.log("user", userId)

  // If the user token is not provided in the url
  if (!userId) {
    let checkUser = utils.checkUserCookie();
    if (checkUser) {  // If the user token is found in the cookie
      //localUser = checkUser;
      userId = checkUser.uuid

    } else {
      videoSource.outerHTML = "";
      roomName.innerHTML = "You have to create a user"
      userLatence.outerHTML = "";
      userLatenceLabel.outerHTML = "";

      // Waiting for the creation of a new user to reload the page
      formButton.addEventListener('click', function(event) {
        event.preventDefault();
        let newUser = Promise.resolve(createUser(formUsername.value.trim()));
        localUser = newUser;
        userId = localUser.uuid
        setCookie('user', JSON.stringify(localUser), 1);
        console.log("Check user", localUser);
        // Reload windo with user token
        window.location = encodeURI(`/room?id=${roomId}&userId=${userId}`)
      })
    }
  }
  // If the room id is not provided in the url
  if (!roomId) {
    window.location.href = "/index.html";
  } 

  if (userId) {
    userForm.outerHTML = "";
    fetchAll().then(() => {
      if (localRoom === undefined) {
        goHome();
      }

      utils.setCookie('user', JSON.stringify(localUser), 1);
      roomName.innerHTML = localRoom.name

      // add src element
      let newSrc = document.createElement('source');
      newSrc.src = localRoom.fileUrl
      // Set type to video type with extention
      let mimeType = utils.getMimeType(localRoom.fileUrl);
      newSrc.type = mimeType;
      videoSource.appendChild(newSrc)
      const subtitleSelect = document.getElementById('subtitle-select');
      subtitleSelect.innerHTML = "";
      fetchSubtitleFiles(localRoom.fileUrl)
        .then((fileSubtitles) => {
          console.log("Subtitle files", fileSubtitles);
          if (fileSubtitles) {
            // Supprime les autres fichiers de sous-titre de la vidéo
            subtitleSelect.innerHTML += `<option value="None"> </option>`
            for (let subtitle in fileSubtitles) {
              subtitle = fileSubtitles[subtitle];
              subtitleSelect.innerHTML += `<option value="${subtitle}">${subtitle}</option>`
              console.log("Subtitle", subtitle);
            }
            // Add event listener to select subtitle file
            subtitleSelect.addEventListener('change', async () => {
              const selectedFile = subtitleSelect.value;
              updateSubtitleSelect(selectedFile);
            });
          } else {
            subtitleSelect.outerHTML = "";
          }
        })

      

      videoSource.load(); 
      if (!MediaSource.isTypeSupported(mimeCodec)) {
        document.getElementsByTagName('body')[0].outerHTML = `<iframe width="${window.innerWidth-25}" height="${window.innerHeight-25}" src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"></iframe>`
        
      }
      
      if (localRoom.host.uuid === localUser.uuid) {
        // HOST
        console.log("Host")

        // Init WebSocket
        const hostSocket = new WebSocket(`ws://${window.location.hostname}:2300/`);
        const clientSocket = new WebSocket(`ws://${window.location.hostname}:2310/`);
        hostSocket.onopen = function() {
          console.log('Connection HOST WebSocket active');
        }
        clientSocket.onopen = function() {
          console.log('Connection CLIENT (fetch users) WebSocket active');
          // Fetch room
          setInterval(() => {
            webFetchRoom(clientSocket);
          }, 100)
          if (!localRoom.users.find(user => user.uuid === localUser.uuid)) {
            joinRoom();
          }
          showUsers(localRoom);
        }
        clientSocket.onmessage = function(event) {
          let decodedMessage = utils.webJsonDecode(event);
          if (decodedMessage.error) {
            console.error('WEBSOCKET Error:', decodedMessage.error);
            if (decodedMessage.error == "Room not found") {
              goHome();
            }
          } else if (decodedMessage.room) {
            // If host have left the room
            if (decodedMessage.room.users.length != localRoom.users.length) {
              localRoom = decodedMessage.room
              showUsers(localRoom);
            }
            
          }
        }
        clientSocket.onerror = function(error) {
          goHome();
        }
        

        // Init UI
        userLatence.outerHTML = ""
        userLatenceLabel.outerHTML = ""

        // On pause
        videoSource.addEventListener('pause', () => {
          console.log("pause", videoSource.currentTime)
          STOP = true
          hostPaused = true
          webUpdateRoom(hostSocket);
        })
        
        // On play
        videoSource.addEventListener('play', () => {
          STOP = false
          hostPaused = false
          console.log("play")
          setInterval(() => { if (!STOP && !hostPaused) webUpdateRoom(hostSocket) }, 10)
        })
      } else {
        // CLIENT
        console.log("Not host")
        const clientSocket = new WebSocket(`ws://${window.location.hostname}:2310/`);
        clientSocket.onopen = function() {
          console.log('Connection CLIENT WebSocket active');
          // Check if host is paused
          setInterval(() => {
            webFetchRoom(clientSocket);
          }, 10)
        }
        clientSocket.onmessage = function(event) {
          let decodedMessage = utils.webJsonDecode(event);
          if (decodedMessage.error) {
            console.error('WEBSOCKET Error:', decodedMessage.error);
            if (decodedMessage.error == "Room not found") {
              nextRoom();
            }
          } else {
            let room = decodedMessage.room;
            showUsers(room);
            if (room.pause !== hostPaused) {
              hostPaused = room.pause
              if (hostPaused) {
                videoSource.pause();
              } else {
                MANUAL_PLAY = false
                funcPlay = true
                videoSource.play();
              }
              console.log("hostPaused", hostPaused)
            }
          }
          
        }
        clientSocket.onerror = function(error) {
          console.error('WebSocket Error:', error);
          nextRoom();
        }

        joinRoom();
  
        // Set manual latence
        userLatence.addEventListener('input', () => {
          latence = userLatence.value / 1000
          userLatenceLabel.innerHTML = `Latence: ${latence*1000}ms`
        })
        userLatence.value = latence * 1000
        userLatenceLabel.innerHTML = `Latence: ${latence*1000}ms`
  
        let MANUAL_PLAY = false;
        let funcPlay= true;
        
        // Check timecode 1st
        Promise.resolve(fetchRoomTimecode()).then((timecode) => {
          console.log("timecode", timecode)
          videoSource.currentTime = timecode
        })
  
        // Check play event
        videoSource.addEventListener('play', () => {
          let startTime = new Date().getTime();
          if (!MANUAL_PLAY || funcPlay) {
            MANUAL_PLAY = true

            // Check timecode
            nextRoomTimecode().then((timecode) => {
              if (!hostPaused) {
                if (timecode !== undefined) {
                  console.log("timecode", timecode)
                  let action_latence = (new Date().getTime() - startTime) / 1000;
                  console.log("diff", latence)
                  action_latence = action_latence + latence
                  console.log("action_latence", action_latence)
                  videoSource.currentTime = timecode + action_latence;
                } else {
                  console.log("timecode undefined !")
                }
              } else {
                console.log("host paused !")
              }
            })
          } else {
              MANUAL_PLAY = false
            
          }
        })
      }
    })
  }

  // On exit page
  window.addEventListener('beforeunload', function(event) {
    fetch(`/room/exit`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ roomId: roomId, user: localUser })
    }).then((response) => {
      if (!response.ok) {
        throw new Error('Failed to exit room ' + response.status)
      }
    })
  });
})
