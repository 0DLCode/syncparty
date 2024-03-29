import { createUser, getRooms, getFiles, setCookie, checkUserCookie, webJsonDecode, getWsString} from '/utils.js';
const wsString = getWsString();

let globalRooms = {};
let globalFiles = [];
let localUser = {};

let mediasExt = ["mp4", "webm", "mkv", "mov", "avi", "mp3", "wav", "ogg", "flac"];

const cookie = document.cookie;
const formUsername = document.getElementById('username');
const roomForm = document.getElementById('roomForm');
const fileUrl = document.getElementById('filename');
const roomButton = document.getElementById('room-submit');
const userInfo = document.getElementById('userInfo');
const fileInput = document.getElementById('fileInput');
const btnFileInput = document.getElementById('file-upload-btn');

function uploadFile() {
  const file = fileInput.files[0];
  if (!file) {
      console.log("No file selected");
      return;
  }

  const formData = new FormData();
  formData.append('file', file);

  const xhr = new XMLHttpRequest();
  const totalSize = file.size;
  let uploaded = 0;
  console.log(`Uploading file ${file.name} (${Math.round(totalSize/1024/1024)} Mo)`);
  xhr.open('POST', '/upload', true);
  xhr.onload = function() {
      if (xhr.status === 200) {
          console.log(`File ${file.name} uploaded successfully (${Math.round(uploaded/1024/1024)} Mo)`);
          fileInput.value = '';
      } else {
          alert(`Error uploading file. Status code: ${xhr.status}`);
      }
  };
  xhr.upload.addEventListener('progress', (event) => {
      const loaded = event.loaded;
      const percent = (loaded / totalSize * 100).toFixed(2);
      const uploadedSize = Math.round((loaded / 1024 / 1024) * 100) / 100;
      const totalSizeMo = Math.round(totalSize / 1024 / 1024 * 100) / 100;
      console.log(`Upload progress: ${percent}%. Uploaded ${uploadedSize} Mo sur ${totalSizeMo} Mo`);
      uploaded = event.loaded;
  }, false);
  xhr.send(formData);
}


function showUserInfo() {
  userInfo.innerHTML = `<p id="username">${localUser.username}</p>` +
  `<p id="uuid">${localUser.uuid}</p>`
}

// Create a new room
function createRoom(name, fileUrl) {
  console.log("Create room", name, fileUrl);
  fetch('/create/room', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ name: name, user: localUser, fileUrl: fileUrl.toString() })
  }).then(response => response.json())
  .then((data) => {
    if (data) {
      console.log('Room created successfully!', data);
      window.location = encodeURI(`/room?id=${data.roomId}&userId=${localUser.uuid}`)
    } else {
      throw new Error('Failed to create room')
    }
  }).catch((err) => {
    console.error(err)
  })
}

// Show the list of rooms
function showRooms() {
  let roomList = document.getElementById('list-rooms');
  roomList.innerHTML = '';
  for (let room in globalRooms) {
    room = globalRooms[room]; // get room
    let roomElement = document.createElement('li');
    roomElement.id = 'room-element';
    roomElement.innerHTML = `<h3>${room.name}</h3>` +
    `<p>==>  [HOST] ${room.host.username}</p>` +
    `<a href="/room?id=${room.id}&userId=${localUser.uuid}">${room.fileUrl.split("/").pop()}</a>`;
    roomList.appendChild(roomElement);
  }
}

// Show the list of files
function showFiles() {
  let fileList = document.getElementById('list-files');
  fileList.innerHTML = '';
  for (let file in globalFiles) {
    file = globalFiles[file]; // get file
    if (!mediasExt.includes(file.split('.').pop())) continue;
    let fileElement = document.createElement('li');
    fileElement.id = 'file-element';
    fileElement.innerHTML = `<h3>${file.split("/").pop()}</h3>`;
    fileList.appendChild(fileElement);
    fileElement.addEventListener('click', () => {
      fileUrl.value = file.toString();
    })
  }
}

function reload() {
  Promise.all([getFiles(), getRooms()])
    .then(([files, rooms]) => {
      globalFiles = files;
      globalRooms = rooms;
      showRooms();
      showFiles();
    })
    .catch(error => {
      console.error('Error occurred', error);
    })
    .finally(() => {
      console.log("Reloaded", globalFiles, globalRooms)
    });
}

// LISTENERS
roomButton.addEventListener('click', function(event) {
  event.preventDefault();
  console.log(roomForm.value);
  const name = document.getElementById('roomName').value.trim();
  let file = fileUrl.value.trim();
  console.log("Create room", name, file);
  createRoom(name, file);
});

document.getElementById('userForm').addEventListener('submit', function(event) {
  event.preventDefault();
  Promise.resolve(createUser(formUsername.value.trim())).then((newUser) => {
    localUser = newUser;
    showUserInfo();
    setCookie('user', JSON.stringify(localUser), 1);
    console.log("Check user", localUser);
    reload();
  })
});

document.addEventListener('DOMContentLoaded', () => {
  let check = checkUserCookie();
  if (check) {
    check.then((checkUser) => {
      if (checkUser) {
        localUser = checkUser;
        showUserInfo();
      }
    })
  }

  reload();
  btnFileInput.addEventListener('click', uploadFile);


  // WebSocket
  const socket = new WebSocket(`${wsString}${window.location.host}/home`);

  socket.onopen = function() {
    console.log('Connection WebSocket active');
  };

  socket.onmessage = function(event) {
    let decodedMessage = webJsonDecode(event);
    if (decodedMessage.error) {
      console.error('WEBSOCKET Error:', decodedMessage.error);
    } else if (decodedMessage.rooms) {
      globalRooms = decodedMessage.rooms;
      showRooms();
    } else if (decodedMessage.files) {
      globalFiles = decodedMessage.files;
      showFiles();
    }
  }

  socket.onerror = function(error) {
    console.error('WebSocket Error:', error);
  };

  // start loop
  setInterval(() => {
    socket.send(JSON.stringify({action: "getRooms"}));
    socket.send(JSON.stringify({action: "getFiles"}));
  }, 1000);
})
