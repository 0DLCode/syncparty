function createUser(username) {
  fetch('/create/user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username })
  })
  .then((response) => {
    if (response.ok) {
      return response.json(); // Ensures JSON parsing with check if response = "ok"
    } else {
      // Improved error handling
      response.json().then(err => {
        console.error('Failed to create user:', err);
        alert(`Error: ${err.message}`);
      });
      throw new Error('Failed to create user');
    }
  })
  .then((user) => {
    console.log(user); // Debugging
    alert('User created successfully!');
    localUser = user; // Update after creation
  })
  .catch((err) => {
    console.error(err); // Error handling
  });
}

function getTimecode(roomUuid) {
  fetch(`/room/timecode?roomUuid=${roomUuid}`)
    .then(response => {
      if (!response.ok) {
        throw new Error('Room not found');
      }
      return response.json();
    })
    .then(data => {
      console.log('Timecode:', data.timecode);
    })
    .catch(error => {
      console.error('Error fetching timecode:', error);
      alert('Could not fetch timecode for the room.');
    });
}

// Implementation of "reloading data"
function reload() {
  console.log('Reloading data...');
}

document.addEventListener('DOMContentLoaded', () => {
  reload();

  document.getElementById('userForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const username = document.getElementById('username').value.trim(); 
    createUser(username);
  });
});

