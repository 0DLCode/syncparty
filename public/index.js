let globalRooms = {};
let globalFiles = [];
let localUser = {};
let isRequestFileFinished = false;
let isRequestRoomFinished = false;

// Create a new user
function createUser(username) {
  fetch('/create/user', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ username: username })
  }).then((response) => {
    if (response.ok) {
      let user = response.json();
      console.log(user)
      localUser = user;
      console.log('User created successfully!')
    } else {
      throw new Error('Failed to create user')
    }
  }).catch((err) => {
    console.error(err)
  })
}

// Create a new user
function createRoom(name, fileUrl) {
  fetch('/create/room', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ name: name, user: localUser, fileUrl: fileUrl })
  }).then((response) => {
    if (response.ok) {
      console.log('Room created successfully!', response)
      document.open(response, '_self');
    } else {
      throw new Error('Failed to create room')
    }
  }).catch((err) => {
    console.error(err)
  })
}

// Get the list of rooms
function getRooms() {
    fetch(`/get/rooms`)
    .then(response => response.json())
    .then(data => {
      globalRooms = data;
    })
    .catch(error => {
      console.error('Error fetching data:', error);
    })
    .finally(() => {
      console.log("FINALLY");
      isRequestRoomFinished = true;
    });
}

// Get the list of files
function getFiles() {
  fetch(`/get/files`)
  .then(response => response.json())
  .then(data => {
    globalFiles = data;
  })
  .catch(error => {
    console.error('Error fetching data:', error);
  })
  .finally(() => {
    console.log("FINALLY");
    isRequestFileFinished=true;
  });
}

// Show the list of rooms
function showRooms() {
  let roomList = document.getElementById('list-rooms');
  roomList.innerHTML = '';
  for (let room in globalRooms) {
    let roomElement = document.createElement('li');
    roomElement.id = 'room-element';
    roomElement.innerHTML = `<h3>${room.name}</h3>` +
    `<a href="/room?id=${room.fileUrl.split("/").pop()}">${room.fileUrl.split("/").pop()}</a>`;
    roomList.appendChild(roomElement);
  }
}

// Show the list of files
function showFiles() {
  let fileList = document.getElementById('list-files');
  fileList.innerHTML = '';
  for (let file in globalFiles) {
    file = globalFiles[file]; // get filename

    let fileElement = document.createElement('li');
    fileElement.id = 'file-element';
    fileElement.innerHTML = `<h3>${file.split("/").pop()}</h3>` +
    `<a href="${file}"></a>`;
    fileList.appendChild(fileElement);
  }
}

function reloadData() {
  isRequestRoomFinished = false;
  isRequestFileFinished = false;
  getRooms();
  getFiles();
  while (!globalFiles || !globalRooms){}
  console.log(globalFiles);
}

function reload() {
  console.log('Reloading...');
  reloadData();
  showRooms();
  showFiles();
}

document.addEventListener('DOMContentLoaded', () => {
  reload();
  reload();

  // LISTENERS
  document.getElementById('userForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const username = document.getElementById('username').value.trim();
    const roomName = document.getElementById('roomName').value.trim();
    const filename = document.getElementById('filename').value.trim();
    createUser(username);
    createRoom(roomName, filename);
  });
})