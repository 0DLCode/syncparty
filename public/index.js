import { createUser, getRooms, getFiles, setCookie, checkUserCookie } from '/utils.js';

let globalRooms = {};
let globalFiles = [];
let localUser = {};

const cookie = document.cookie;
const formUsername = document.getElementById('username');
const roomForm = document.getElementById('roomForm');
const userInfo = document.getElementById('userInfo');




function showUserInfo() {
  userInfo.innerHTML = `<p id="username">${localUser.username}</p>` +
  `<p id="uuid">${localUser.uuid}</p>`
}

// Create a new room
function createRoom(name, fileUrl) {
  fetch('/create/room', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ name: name, user: localUser, fileUrl: fileUrl })
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

    let fileElement = document.createElement('li');
    fileElement.id = 'file-element';
    fileElement.innerHTML = `<h3>${file.split("/").pop()}</h3>` +
    `<a href="${file}"></a>`;
    fileList.appendChild(fileElement);
  }
}

function reload() {
  console.log("Reloading...")
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

document.addEventListener('DOMContentLoaded', () => {

    // LISTENERS
  document.getElementById('userForm').addEventListener('submit', function(event) {
    event.preventDefault();
    Promise.resolve(createUser(formUsername.value.trim())).then((newUser) => {
      localUser = newUser;
      showUserInfo();
      setCookie('user', JSON.stringify(localUser), 1);
      console.log("Check user", localUser);
      reload();
    })

  roomForm.addEventListener('click', function(event) {
    event.preventDefault();
    console.log(roomForm.value);
    const name = document.getElementById('roomName').value.trim();
    const fileUrl = document.getElementById('filename').value.trim();
    console.log("Create room", name, fileUrl);
    createRoom(name, fileUrl);
    })  
  });

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
})
