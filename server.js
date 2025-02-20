require('dotenv').config();
const http = require('http');
const express = require('express');
const socketIo = require('socket.io');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Configuration
const isDevelopment = process.env.NODE_ENV === 'development';
const db = isDevelopment ? null : require('./db');
const PORT = process.env.PORT || 4000;
const MAX_RECENT_MESSAGES = 50;

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

async function syncUserClicksWithDB() {
  if (isDevelopment) {
    console.log('Development mode: Skipping user clicks sync');
    return;
  }
  for (const [userId, clicks] of userClicks.entries()) {
    if (clicks > 0) {
      try {
        await db.query('UPDATE progress SET total_clicks = total_clicks + $1 WHERE user_id = $2', [clicks, userId]);
        userClicks.set(userId, 0);
      } catch (error) {
        console.error(`Error syncing clicks for user ${userId}:`, error);
      }
    }
  }
}

// Socket.io event handlers
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

    for (let [teamId, team] of teams) {
      if (team.members.includes(socket.id)) {
        const sharedClickValue = clickValue * 0.1;
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
    onlineUsers.delete(socket.id);
    delete cursors[socket.id];
    updateAllUsers();

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


// Start the server
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
