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

let latence = 0.2;
const userLatence = document.getElementById('user-latence');
const userLatenceLabel = document.getElementById('latence-label');

let STOP = false;
let hostPaused = false;

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

function updateRoom() {
  if (STOP) {
    hostPaused = true;
  }
  return fetch(`/update/room`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ user: localUser, roomId: roomId,
      timecode: videoSource.currentTime, timestamp: new Date().getTime(), pause: hostPaused })
  }).then(response => () => {
    if (response.ok) {
      console.log('Room updated successfully!')
    } else {
      throw new Error('Failed to update room ' + response.status)
    }
  }).catch((err) => {
    console.error(err)
  })
}

async function fetchRoomTimecode() {
  return fetch(`/room/timecode`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ roomId: roomId, timestamp: new Date().getTime() })
  }).then((response) => {
    if (response.ok) {
      return response.json()
    } else {
      throw new Error('Failed to fetch timecode ' + response.status)
    }
  }).catch((err) => {
    console.error(err)
  })
}

function showUsers(room) {
  listUsersElement.innerHTML = "";
  for (let user in room.users) {
    user = room.users[user];
    if (user.uuid === room.host.uuid) {
      listUsersElement.innerHTML += `<li class="host">[HOST] ${user.username}</li>`;
    } else {
      listUsersElement.innerHTML += `<li>${user.username}</li>`; 
    }
  }
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
    window.location.search = window.location.search.replace(window.location.search.split("?")[1], '');
    window.location = "/index.html";
  } 

  if (userId) {
    userForm.outerHTML = "";
    fetchAll().then(() => {
      utils.setCookie('user', JSON.stringify(localUser), 1);
      // Remove userId from url to create a share link
  
      roomName.innerHTML = localRoom.name
      videoSource.src = "/files/" + localRoom.fileUrl
      videoSource.load(); 
      if (!MediaSource.isTypeSupported(mimeCodec)) {
        document.getElementsByTagName('body')[0].outerHTML = `<iframe width="${window.innerWidth-25}" height="${window.innerHeight-25}" src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"></iframe>`
        
      }
      
      if (localRoom.host.uuid === localUser.uuid) {
        // HOST
        console.log("Host")
  
        userLatence.outerHTML = ""
        userLatenceLabel.outerHTML = ""
        
        setInterval(() => {
          Promise.resolve(fetchRoom()).then((room) => {
            showUsers(room);
          }) 
        }, 1000)

        // On pause
        videoSource.addEventListener('pause', () => {
          console.log("pause", videoSource.currentTime)
          STOP = true
        })
        
        // On play
        videoSource.addEventListener('play', () => {
          STOP = false
          hostPaused = false
          console.log("play")
          setInterval(() => { if (!STOP || !hostPaused) updateRoom() }, 500)
        })
        
      } else {
        // NOT HOST
        console.log("Not host")

        // add user to room
        fetch(`/join/room`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ roomId: roomId, user: localUser })
        }).then((response) => {
          if (response.ok) {
            return response.json()
          } else {
            throw new Error('Failed to join room ' + response.status)
          }
        })
  
        // Set manual latence
        userLatence.addEventListener('input', () => {
          latence = userLatence.value / 1000
          userLatenceLabel.innerHTML = `Latence: ${latence}ms`
        })
        userLatence.value = latence * 1000
  
        let MANUAL_PLAY = false;
        
        // Check if host is paused
        setInterval(() => {
          Promise.resolve(fetchRoom()).then((room) => {
            console.log("room", room)
            showUsers(room);
            if (room.pause !== hostPaused) {
              hostPaused = room.pause
              if (hostPaused) {
                videoSource.pause();
              } else {
                videoSource.play();
              }
              console.log("hostPaused", hostPaused)
            }
          })
        }, 1000)
  
        // Check timecode 1st
        Promise.resolve(fetchRoomTimecode()).then((timecode) => {
          console.log("timecode", timecode)
          videoSource.currentTime = timecode
        })
  
        // Check play event
        videoSource.addEventListener('play', () => {
          if (!MANUAL_PLAY) {
            MANUAL_PLAY = true
            videoSource.pause(); // Pause client during verification
  
            // Check timecode
            Promise.resolve(fetchRoomTimecode()).then((timecode) => {
              if (!hostPaused) {
                if (timecode !== undefined) {
                  console.log("timecode", timecode)
                  videoSource.currentTime = timecode + latence
                  videoSource.play();
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
 
  
})