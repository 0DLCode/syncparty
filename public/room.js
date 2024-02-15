const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('id');
const userId = urlParams.get('userId');

const video = document.getElementById("room-name");
const videoSource = document.getElementById('video-source');

let localUser;
let localRoom;

console.log("LOADING");

function fetchAll() {
    Promise.all([
        // Get the room by id
        () => {
            return fetch(`/get/room`, {
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ roomId: roomId })
            })
            .then(response => response.json())
            .then(data => {
                console.log(data)
            })
            .catch(error => {
                console.error('Error fetching data:', error);
            });
        },
    
        // Get user by id
        () => {
            return fetch(`/get/user`, {
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ userId: userId })
            })
            .then(response => response.json())
            .then(data => {
                console.log(data)
            })
            .catch(error => {
                console.error('Error fetching data:', error);
            });
        }
    ])
    .then(([room, user]) => {
        localRoom = room
        localUser = user
    })    
}

fetchAll();