require('dotenv').config();
const http = require('http');
const express = require('express');
const socketIo = require('socket.io');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db');

const fs = require('fs');
const path = require('path');


const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://52.59.228.62:8080",
    methods: ["GET", "POST"]
  }
});

let clickCount = 0;
let clicks = [];
let uniqueUsers = new Set();
let userClicks = new Map(); // Store user clicks in memory

function updateGlobalCPS() {
    const now = Date.now();
    clicks = clicks.filter(click => now - click < 1010);
    const globalCPS = clicks.length;
    io.emit('updateGlobalCPS', globalCPS);
}

setInterval(updateGlobalCPS, 100);

// Function to sync total clicks with the database
async function syncTotalClicksWithDB() {
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
  uniqueUsers.add(socket.id);
  console.log('Unique users online:', uniqueUsers.size);

  // Send current count to newly connected client
  socket.emit('updateCount', clickCount);

  // Emit the current number of online users to all clients
  io.emit('updateOnlineUsers', uniqueUsers.size);

  socket.on('incrementCount', (userId) => {
    clickCount++;
    clicks.push(Date.now());

    // Update user clicks in memory
    if (userId) {
      const userClickCount = (userClicks.get(userId) || 0) + 1;
      userClicks.set(userId, userClickCount);
    }
    io.emit('updateCount', clickCount);
  });

  socket.on('syncUserClicks', (userId) => {
    if (userId) {
      const userClickCount = userClicks.get(userId) || 0;
      socket.emit('updateUserClicks', userClickCount);
    }
  });
  socket.on('disconnect', () => {
    console.log('Client disconnected');
    uniqueUsers.delete(socket.id);
    console.log('Unique users online:', uniqueUsers.size);
    // Emit the updated number of online users to all clients
    io.emit('updateOnlineUsers', uniqueUsers.size);
  });
});



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