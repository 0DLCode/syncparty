let globalRooms = {};
let globalFiles = [];
let localUser = {};
let isRequestFileFinished = false;
let isRequestRoomFinished = false;

// Create a new user
function createUser(username) {
  return fetch('/create/user', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ username: username })
  }).then((response) => {
    if (response.ok) {
      let user = response.json();
      console.log('User created successfully!')
      return user
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
  }).then(response => response.json())
  .then((data) => {
    if (data) {
      console.log('Room created successfully!', data);
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
    return fetch(`/get/rooms`)
    .then(response => response.json())
    .then(data => {
      return data
    })
    .catch(error => {
      console.error('Error fetching data:', error);
    });
}

// Get the list of files
function getFiles() {
  return fetch(`/get/files`)
  .then(response => response.json())
  .then(data => {
    return data
  })
  .catch(error => {
    console.error('Error fetching data:', error);
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
    `<a href="/room?id=${room.id}">${room.fileUrl.split("/").pop()}</a>`;
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
  reload();

  // LISTENERS
  document.getElementById('userForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const username = document.getElementById('username').value.trim();
    const roomName = document.getElementById('roomName').value.trim();
    const filename = document.getElementById('filename').value.trim();
    Promise.resolve(createUser(username)).then((newUser) => {
      localUser = newUser;
      console.log("Check user", localUser);
      createRoom(roomName, filename);
      console.log("Check room", localRoom);
    })
    
  });
})
