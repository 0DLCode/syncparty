function setCookie(name, value, days) {
  let expires = "";
  if (days) {
    let date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "") + expires + "; path=/";
}
  
function getCookie(name) {
  let nameEQ = name + "=";
  let ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

function eraseCookie(name) {
  document.cookie = name + '=; Max-Age=-99999999;';
}

// Create a new user
async function createUser(username) {
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

async function getUser(uuid) {
  return fetch(`/get/user`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ userId: uuid })
  })
  .then(response => response.json())
  .then(data => {
    return data
  })
  .catch(error => {
    console.error('Error fetching data:', error);
  });
}

// Get the list of rooms
async function getRooms() {
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
async function getFiles() {
return fetch(`/get/files`)
.then(response => response.json())
.then(data => {
  return data
})
.catch(error => {
  console.error('Error fetching data:', error);
});
}

function checkUserCookie() {
  let tempUser = getCookie('user');
  if (tempUser) {
    tempUser = JSON.parse(tempUser);
    let user = Promise.resolve(getUser(tempUser.uuid));
    if (user) {
      console.log("(cookie auth) Check user", user);
      return user;
    } else {
      console.log("(cookie auth) User not found", tempUser);
      eraseCookie('user');
    }
  }
  return null
}

function webJsonDecode(event) {
  let msgBody;
  try {
    msgBody = JSON.parse(event.data.toString("utf-8"));
  } catch (e) {
    console.error('Error decoding message:', e);
    return null;
  }
  // console.log('Decoded message:', msgBody);
  return msgBody;
}

function getMimeType(fileName) {
  const fileExtension = fileName.split('.').pop();
  const videoTypesByExtension = {
    mp4: 'video/mp4',
    webm: 'video/webm',
    mpeg: 'video/mpeg',
    mkv: 'video/mkv',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
  };

  const videoType = videoTypesByExtension[fileExtension];
  return videoType || 'video/mp4';
}


export { createUser, getRooms, getFiles, setCookie, checkUserCookie, webJsonDecode, getMimeType }