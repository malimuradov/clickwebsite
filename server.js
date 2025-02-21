require('dotenv').config();
const http = require('http');
const express = require('express');
const socketIo = require('socket.io');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration
const isDevelopment = process.env.NODE_ENV === 'development';
const db = isDevelopment ? null : require('./db');
const PORT = process.env.PORT || 4000;
const MAX_RECENT_MESSAGES = 50;
const JWT_SECRET = process.env.JWT_SECRET;

// Server setup
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: isDevelopment ? "http://localhost:3000" : "http://52.59.228.62:8080",
    methods: ["GET", "POST"]
  }
});

// Global variables
let clickCount = 0;
let clicks = [];
let onlineUsers = new Map();
let teams = new Map();
let userClicks = new Map();
let recentMessages = [];
let cursors = {};

// Middleware
app.use(express.json());

// Helper functions
function updateGlobalCPS() {
    const now = Date.now();
    clicks = clicks.filter(click => now - click < 1010);
    const globalCPS = clicks.length;
    io.emit('updateGlobalCPS', globalCPS);
}

function updateAllUsers() {
  io.emit('updateOnlineUsers', Array.from(onlineUsers.values()));
  io.emit('updateRecentMessages', recentMessages);
  io.emit('updateCursors', cursors);
  const oneMinuteAgo = Date.now() - 60000;
  recentMessages = recentMessages.filter(msg => msg.timestamp > oneMinuteAgo);
}

// Add this function to generate a unique username
function generateUniqueUsername() {
  let username;
  do {
    const randomString = crypto.randomBytes(4).toString('hex');
    username = `User_${randomString}`;
  } while (isUsernameTaken(username));
  return username;
}

// Add this function to check if a username already exists
function isUsernameTaken(username) {
  return Array.from(onlineUsers.values()).some(user => user.username === username);
}

// clean up inactive users
function cleanupInactiveUsers() {
  const now = Date.now();
  for (const [socketId, user] of onlineUsers.entries()) {
    if (now - user.lastActivity > 30000) { // 10 seconds of inactivity
      onlineUsers.delete(socketId);
      delete cursors[socketId];
    }
  }
  updateAllUsers();
}

function addRecentMessage(message) {
  recentMessages.push(message);
  if (recentMessages.length > MAX_RECENT_MESSAGES) {
    recentMessages.shift();
  }
}

async function syncTotalClicksWithDB() {
  if (isDevelopment) {
    console.log('Development mode: Skipping database sync');
    return;
  }
  try {
    const result = await db.query('SELECT SUM(total_clicks) as total_clicks FROM progress');
    clickCount = parseInt(result.rows[0].total_clicks) || 0;
    console.log('Total clicks synced with database:', clickCount);
    io.emit('updateCount', clickCount);
  } catch (error) {
    console.error('Error syncing total clicks with database:', error);
  }
}

async function syncUserClicksWithDB(userId, clicks) {
  if (isDevelopment) {
    console.log('Development mode: Skipping user clicks sync');
    return;
  }
  if (clicks > 0) {
    try {
      await db.query('UPDATE progress SET total_clicks = total_clicks + $1 WHERE user_id = $2', [clicks, userId]);
    } catch (error) {
      console.error(`Error syncing clicks for user ${userId}:`, error);
    }
  }
}

// Socket.io event handlers
io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('authenticate', (clientToken) => {
    let userId, username;

    if (clientToken) {
      // Verify existing token
      try {
        const decoded = jwt.verify(clientToken, JWT_SECRET);
        userId = decoded.userId;
        username = decoded.username;
      } catch (error) {
        console.error('Token verification failed:', error);
        // If token is invalid, we'll create a new one below
      }
    }

    if (!userId) {
      // Generate new temporary user
      userId = crypto.randomBytes(16).toString('hex');
      username = generateUniqueUsername();

      // Create a new token
      clientToken = jwt.sign({ id: userId, username }, JWT_SECRET, { expiresIn: '30d' });
    }

    // Store the userId in the socket object for future reference
    socket.userId = userId;

    // Update the onlineUsers map
    onlineUsers.set(userId, { id: userId, username });
    
    // Send the token back to the client
    socket.emit('authentication', { token: clientToken, userId, username });

    // Emit initial data to the authenticated user
    socket.emit('updateRecentMessages', recentMessages);
    socket.emit('updateCount', clickCount);
    io.emit('updateOnlineUsers', Array.from(onlineUsers.values()));
  });

  socket.on('setUsername', (newUsername) => {
    if (isUsernameTaken(newUsername)) {
      socket.emit('usernameError', 'Username already taken');
    } else {
      const user = onlineUsers.get(socket.userId);
      if (user) {
        user.username = newUsername;
        onlineUsers.set(socket.userId, user);
        
        // Update the token with the new username
        const newToken = jwt.sign({ id: socket.userId, username: newUsername }, JWT_SECRET, { expiresIn: '30d' });
        socket.emit('authentication', { token: newToken, userId: socket.userId, username: newUsername });
        
        io.emit('updateOnlineUsers', Array.from(onlineUsers.values()));
      }
    }
  });

  socket.on('cursorMove', ({ x, y, username }) => {
    cursors[socket.userId] = { x, y, username };
    io.emit('updateCursors', cursors);
  });

  socket.on('inviteToTeam', (inviteeId) => {
    io.to(inviteeId).emit('teamInvite', socket.userId);
  });

  socket.on('acceptTeamInvite', (inviterId) => {
    let team;
    if (teams.has(inviterId)) {
      team = teams.get(inviterId);
      team.members.push(socket.userId);
    } else {
      team = { members: [inviterId, socket.userId] };
      teams.set(inviterId, team);
    }
    team.members.forEach(memberId => {
      io.to(memberId).emit('teamUpdate', team);
    });
  });

  socket.on('chat message', (data) => {
    console.log(`User ${data.username} sent a message: ${data.message}`);
    const message = {
      username: data.username,
      message: data.message,
      timestamp: Date.now()
    };
    addRecentMessage(message);
    io.emit('chat message', message);
  });

  socket.on('leaveTeam', () => {
    for (let [teamId, team] of teams) {
      const index = team.members.indexOf(socket.userId);
      if (index !== -1) {
        team.members.splice(index, 1);
        if (team.members.length === 1) {
          teams.delete(teamId);
          io.to(team.members[0]).emit('teamUpdate', null);
        } else {
          team.members.forEach(memberId => {
            io.to(memberId).emit('teamUpdate', team);
          });
        }
        break;
      }
    }
  });

  socket.on('incrementCount', (clickValue) => {
    clickCount += 1;
    clicks.push(Date.now());

    for (let [teamId, team] of teams) {
      if (team.members.includes(socket.userId)) {
        const sharedClickValue = clickValue * 0.1;
        team.members.forEach(memberId => {
          if (memberId !== socket.userId) {
            io.to(memberId).emit('teamClickBonus', sharedClickValue);
          }
        });
        break;
      }
    }

    io.emit('updateCount', clickCount);
    io.emit('updateOnlineUsers', Array.from(onlineUsers.values()));
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
    onlineUsers.delete(socket.userId);
    delete cursors[socket.userId];
    updateAllUsers();

    for (let [teamId, team] of teams) {
      const index = team.members.indexOf(socket.userId);
      if (index !== -1) {
        team.members.splice(index, 1);
        if (team.members.length === 1) {
          teams.delete(teamId);
          io.to(team.members[0]).emit('teamUpdate', null);
        } else if (team.members.length > 1) {
          team.members.forEach(memberId => {
            io.to(memberId).emit('teamUpdate', team);
          });
        }
        break;
      }
    }
  });
});

// Data persistence functions
function saveServerData() {
  const data = {
    clickCount: clickCount,
    timestamp: new Date().toISOString()
  };

  const filePath = path.join(__dirname, 'serverData.json');

  fs.writeFile(filePath, JSON.stringify(data, null, 2), (err) => {
    if (err) {
      console.error('Error saving server data:', err);
    } else {
      console.log('Server data saved successfully');
    }
  });
}

function loadServerData() {
  const filePath = path.join(__dirname, 'serverData.json');

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        console.log('No saved data found. Starting with initial values.');
      } else {
        console.error('Error reading server data:', err);
      }
    } else {
      try {
        const parsedData = JSON.parse(data);
        clickCount = parsedData.clickCount;
        console.log('Server data loaded successfully');
      } catch (parseErr) {
        console.error('Error parsing server data:', parseErr);
      }
    }
  });
}

// Initialization and intervals
loadServerData();
setInterval(updateGlobalCPS, 100);
setInterval(updateAllUsers, 5000);
setInterval(cleanupInactiveUsers, 5000);
setInterval(syncTotalClicksWithDB, 30000);
setInterval(syncUserClicksWithDB, 10000);
setInterval(saveServerData, 60 * 60 * 1000);



// Authentication routes
app.post('/api/register', async (req, res) => {
  const { tempUserId, username, password, email } = req.body;

  try {
    // Check if username or email already exists
    const userCheck = await db.query('SELECT * FROM users WHERE username = $1 OR email = $2', [username, email]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the new user into the database
    const result = await db.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
      [username, email, hashedPassword]
    );

    const newUserId = result.rows[0].id;

    // Transfer progress from temp user to new user
    await db.query('UPDATE progress SET user_id = $1 WHERE user_id = $2', [newUserId, tempUserId]);

    // Create a new token for the registered user
    const token = jwt.sign({ id: newUserId, username }, JWT_SECRET, { expiresIn: '30d' });

    res.json({ token, userId: newUserId, username });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'An error occurred during registration' });
  }
});



app.post('/api/register', async (req, res) => {
  const { tempUserId, username, password, email } = req.body;

  // Check if username is provided and not empty
  if (!username || username.trim() === '') {
    return res.status(400).json({ error: 'Username is required' });
  }

  try {
    // Check if username or email already exists
    const userCheck = await db.query('SELECT * FROM users WHERE username = $1 OR email = $2', [username, email]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the new user into the database
    const result = await db.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
      [username, email, hashedPassword]
    );

    const newUserId = result.rows[0].id;

    // Transfer progress from temp user to new user
    if (tempUserId) {
      await db.query('UPDATE progress SET user_id = $1 WHERE user_id = $2', [newUserId, tempUserId]);
    }

    // Create a new token for the registered user
    const token = jwt.sign({ id: newUserId, username }, JWT_SECRET, { expiresIn: '30d' });

    res.json({ token, userId: newUserId, username });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'An error occurred during registration' });
  }
});






// Start the server

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
