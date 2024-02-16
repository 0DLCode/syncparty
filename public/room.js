const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('id');
const userId = urlParams.get('userId');

const roomName = document.getElementById("room-name");
const videoSource = document.getElementById('video-source');
const mimeCodec = 'video/mp4; codecs="avc1.42E01E"';

let localUser;
let localRoom;

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

function fetchRoomTimecode() {
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

document.addEventListener('DOMContentLoaded', () => {
  console.log("id", roomId)
  console.log("user", userId)


  fetchAll().then(() => {
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

      videoSource.addEventListener('pause', () => {
        console.log("pause", videoSource.currentTime)
        STOP = true
      })

      videoSource.addEventListener('play', () => {
        STOP = false
        hostPaused = false
        console.log("play")
        setInterval(() => { if (!STOP || !hostPaused) updateRoom() }, 500)
      })
      
    } else {
      // NOT HOST
      console.log("Not host")

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
  
})