require('dotenv').config();
const http = require('http');
const express = require('express');
const socketIo = require('socket.io');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// DEVELOPMENT MODE
const isDevelopment = process.env.NODE_ENV === 'development';
// Only require db if not in development mode
const db = isDevelopment ? null : require('./db');

const fs = require('fs');
const path = require('path');


const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: isDevelopment ? "http://localhost:3000" : "http://52.59.228.62:8080",
    methods: ["GET", "POST"]
  }
});

const MAX_RECENT_MESSAGES = 50;
let clickCount = 0;
let clicks = [];
let uniqueUsers = new Set();
// let lastPingTimes = new Map();
let onlineUsers = new Map();
let teams = new Map();
let userClicks = new Map(); // Store user clicks in memory
let recentMessages = [];
let cursors = {};

function updateGlobalCPS() {
    const now = Date.now();
    clicks = clicks.filter(click => now - click < 1010);
    const globalCPS = clicks.length;
    io.emit('updateGlobalCPS', globalCPS);
}

setInterval(updateGlobalCPS, 100);

// Function to update all users with online count and recent messages
function updateAllUsers() {
  io.emit('updateOnlineUsers', uniqueUsers.size);
  io.emit('updateRecentMessages', recentMessages);
  // io.emit('updateCursors', cursors);
  // Remove old messages older than 1 minute
  const oneMinuteAgo = Date.now() - 60000; // 1 minute ago
  recentMessages = recentMessages.filter(msg => msg.timestamp > oneMinuteAgo);
}
// Set interval to update all users every 5 seconds
setInterval(updateAllUsers, 5000);

function addRecentMessage(message) {
  recentMessages.push(message);
  if (recentMessages.length > MAX_RECENT_MESSAGES) {
    recentMessages.shift(); // Remove the oldest message if we exceed the limit
  }
}


// Function to sync total clicks with the database
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

// Function to sync user clicks with the database
async function syncUserClicksWithDB() {
  if (isDevelopment) {
    console.log('Development mode: Skipping user clicks sync');
    return;
  }
  for (const [userId, clicks] of userClicks.entries()) {
    if (clicks > 0) {
      try {
        await db.query('UPDATE progress SET total_clicks = total_clicks + $1 WHERE user_id = $2', [clicks, userId]);
        userClicks.set(userId, 0); // Reset clicks after syncing
      } catch (error) {
        console.error(`Error syncing clicks for user ${userId}:`, error);
      }
    }
  }
}

// Sync total clicks with DB every 30 seconds
setInterval(syncTotalClicksWithDB, 30000);

// Sync user clicks with DB every 10 seconds
setInterval(syncUserClicksWithDB, 10000);

io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('setUsername', (username) => {
    onlineUsers.set(socket.id, { id: socket.id, username });
    io.emit('updateOnlineUsers', Array.from(onlineUsers.values()));
  });

  socket.on('cursorMove', ({ x, y, username }) => {
    cursors[socket.id] = { x, y, username };
    io.emit('updateCursors', cursors);
  });

  socket.on('inviteToTeam', (inviteeId) => {
    io.to(inviteeId).emit('teamInvite', socket.id);
  });

  socket.on('acceptTeamInvite', (inviterId) => {
    let team;
    if (teams.has(inviterId)) {
      team = teams.get(inviterId);
      team.members.push(socket.id);
    } else {
      team = { members: [inviterId, socket.id] };
      teams.set(inviterId, team);
    }
    team.members.forEach(memberId => {
      io.to(memberId).emit('teamUpdate', team);
    });
  });

  
  socket.emit('updateRecentMessages', recentMessages);

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
      const index = team.members.indexOf(socket.id);
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
    clickCount += clickValue;
    clicks.push(Date.now());
    uniqueUsers.add(socket.id);

    // Share clicks with team members
    for (let [teamId, team] of teams) {
      if (team.members.includes(socket.id)) {
        const sharedClickValue = clickValue * 0.1; // 10% of clicks shared with each team member
        team.members.forEach(memberId => {
          if (memberId !== socket.id) {
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
    delete cursors[socket.id];
    onlineUsers.delete(socket.id);
    uniqueUsers.delete(socket.id);
    io.emit('updateCursors', cursors);
    io.emit('updateOnlineUsers', Array.from(onlineUsers.values()));

    // Handle team disconnection
    for (let [teamId, team] of teams) {
      const index = team.members.indexOf(socket.id);
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



// function checkDisconnectedUsers() {
//   const now = Date.now();
//   for (const [socketId, lastPingTime] of lastPingTimes.entries()) {
//     console.log(`Checking if user ${socketId} is still connected...`);
//     console.log(`Difference: ${now - lastPingTime} ms`);
//     if (now - lastPingTime > 19000) { // 19 seconds timeout
//       const socket = io.sockets.sockets.get(socketId);
//       if (socket) {
//         console.log(`Disconnecting inactive user: ${socketId}`);
//         socket.disconnect(true);
//       }
//       lastPingTimes.delete(socketId);
//       uniqueUsers.delete(socketId);
//       delete cursors[socketId];
//     }
//   }
//   io.emit('updateOnlineUsers', uniqueUsers.size);
//   io.emit('updateCursors', cursors);
// }

// // Run the check every 5 seconds
// setInterval(checkDisconnectedUsers, 5000);

// Function to save server data
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
// Function to load server data
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

// Load saved data when the server starts
loadServerData();

// Set up hourly save
setInterval(saveServerData, 60 * 60 * 1000); // 60 minutes * 60 seconds * 1000 milliseconds




const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));