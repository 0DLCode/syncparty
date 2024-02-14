let globalRooms = {};
let globalFiles = [];
let localUser = {};

// Create a new user
function createUser(username) {
  console.log(username, typeof username)
  fetch('/create/user', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ username: `${username}` })
  }).then((response) => {
    if (response.ok) {
      let user = response.json();
      console.log(user)
      localUser = user;
      alert('User created successfully!')
    } else {
      throw new Error('Failed to create user')
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
    let fileElement = document.createElement('li');
    fileElement.id = 'file-element';
    fileElement.innerHTML = `<h3>${file.name}</h3>` +
    `<a href="${file.url}"></a>`;
    fileList.appendChild(fileElement);
  }
}

function reloadData() {
  getRooms();
  getFiles();
}

function reload() {
  console.log('Reloading...');
  reloadData();
  showRooms();
  showFiles();
}

window.onload = () => {
  reload();

  // LISTENERS
  document.getElementById('userForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    createUser(username);
  });
}