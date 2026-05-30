require('dotenv').config();
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const redis = require('redis');  
const { promisify } = require('util');  


// Configuration
const isDevelopment = process.env.NODE_ENV === 'development';
const db = isDevelopment ? null : require('./db');
const PORT = process.env.PORT || 4000;
const MAX_RECENT_MESSAGES = 50;
const JWT_SECRET = process.env.JWT_SECRET;
const TEMP_JWT_SECRET = process.env.TEMP_JWT_SECRET || JWT_SECRET; // Use a separate secret for temp users or fall back to main secret
const CACHE_EXPIRATION = 3600; // Cache expiration for redis
const MAX_REQUESTS_PER_MINUTE = 60; // Rate limit for Redis
const SKIN_UPDATE_INTERVAL = 1000; // 10 seconds

// ─── Handlers ─────────────────────────────────────────────────────────────────
const { authMiddleware }       = require('./middleware/auth');
const { registerAuthHandlers } = require('./handlers/authHandler');
const { registerChatHandlers } = require('./handlers/chatHandler');
const { registerGameHandlers } = require('./handlers/gameHandler');
const { registerTeamHandlers } = require('./handlers/teamHandler');
const { registerAccountHandlers }  = require('./handlers/accountHandler');
const { registerDisconnectHandler } = require('./handlers/disconnectHandler');
const { onlineUsers }          = require('./services/userService');

// Server express setup
const app = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: process.env.CLIENT_ORIGIN ?? '*', methods: ['GET', 'POST'] },
  // Recommended for prod: pingTimeout, pingInterval, maxHttpBufferSize
  pingTimeout:       20_000,
  pingInterval:      25_000,
  maxHttpBufferSize: 1e6, // 1 MB max payload
});

app.use(express.json());

// Redis client setup
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
});

// Add event listeners for connection status
redisClient.on('error', (err) => {
  console.error('Redis error:', err);
});

redisClient.on('connect', () => {
  console.log('Connected to Redis server');
});

// Promisify Redis commands for Redis 3.0.x
const getAsync = promisify(redisClient.get).bind(redisClient);
const setexAsync = promisify(redisClient.setEx).bind(redisClient);
const incrAsync = promisify(redisClient.incr).bind(redisClient);
const expireAsync = promisify(redisClient.expire).bind(redisClient);


// ─── Shared mutable state ─────────────────────────────────────────────────────
// In production, move clickCount and recentMessages to Redis.
// For now they live in process memory and are passed by reference.
 
/** @type {Object[]} */
const recentMessages = [];
let clickCount       = 0;
 
/** @type {Map<string, { members: string[] }>} */
const teams = new Map();
 
/** @param {Object} msg */
const addRecentMessage = (msg) => {
  recentMessages.push(msg);
  if (recentMessages.length > 50) recentMessages.shift(); // cap at 50
};
 

/** Broadcasts updated user list to all connected sockets. */
const updateAllUsers = () => {
  io.emit('users:online', Array.from(onlineUsers.values()));
};
 
/**
 * The single shared state object passed into every handler.
 * Handlers read and mutate this — no global variables scattered around.
 */
const sharedState = {
  recentMessages,
  addRecentMessage,
  get clickCount()        { return clickCount; },
  set clickCount(v)       { clickCount = v; },
  teams,
  db,
  isDevelopment,
  updateAllUsers,
};




// ─── Global Socket.IO middleware ──────────────────────────────────────────────
// Runs once per connection, before any event. Verifies token, attaches user.
io.use(authMiddleware);

// ─── Connection handler ───────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[connect] ${socket.id}`);
 
  registerAuthHandlers(socket, io, sharedState);
  registerChatHandlers(socket, io, sharedState);
  registerGameHandlers(socket, io, sharedState);
  registerTeamHandlers(socket, io, sharedState);
  registerAccountHandlers(socket, io, sharedState);
  registerDisconnectHandler(socket, io, sharedState);
});



// function updateGlobalCPS() {
//     const now = Date.now();
//     clicks = clicks.filter(click => now - click < 1010);
//     const globalCPS = clicks.length;
//     io.emit('updateGlobalCPS', globalCPS);
// }



// function generateUniqueUsername() {
//   let username;
//   do {
//     const randomString = crypto.randomBytes(4).toString('hex');
//     username = `User_${randomString}`;
//   } while (isUsernameTaken(username));
//   return username;
// }

// function isUsernameTaken(username) {
//   return Array.from(onlineUsers.values()).some(user => user.username === username);
// }

// // clean up inactive users
// function cleanupInactiveUsers() {
//   const now = Date.now();
//   for (const [userId, user] of onlineUsers.entries()) {
//     if (!user.lastActivity || now - user.lastActivity > 30000) { // 30 seconds of inactivity
//       console.log(`Removing inactive user: ${user.username}`);
//       onlineUsers.delete(userId);
//       delete cursors[user.username];
//     }
//   }
//   updateAllUsers();
// }



// async function updateUserClicksInDB(userId, isTemporary, naturalClicks, totalClicks, bestCPS) {
//   if (isDevelopment) {
//     console.log('Development mode: Skipping user clicks update');
//     return;
//   }

//   try {
//     // Determine which ID field to use based on whether the user is temporary
//     const idField = isTemporary ? 'temp_user_id' : 'user_id';

//     // Check if user already has a progress record
//     const checkResult = await db.query(
//       `SELECT id FROM progress WHERE ${idField} = $1`,
//       [userId]
//     );

//     if (checkResult.rows.length > 0) {
//       // Update existing record
//       await db.query(
//         `UPDATE progress 
//          SET natural_clicks = natural_clicks + $1, 
//              total_clicks = $2,
//              best_cps = GREATEST(best_cps, $3),
//              last_updated = CURRENT_TIMESTAMP
//          WHERE ${idField} = $4`,
//         [naturalClicks, totalClicks, bestCPS, userId]
//       );
//     } else {
//       console.log(`error creating new progress record for user ${userId}`);
//       return; // Don't create a new record if the user doesn't exist
      
//       // await db.query(
//       //   `INSERT INTO progress (${idField}, natural_clicks, total_clicks, best_cps)
//       //    VALUES ($1, $2, $3, $4)`,
//       //   [userId, naturalClicks, totalClicks, bestCPS]
//       // );
//     }

//     console.log(`Updated clicks for user ${userId}: +${naturalClicks} natural, ${totalClicks} total`);
//   } catch (error) {
//     console.error(`Error updating clicks for user ${userId}:`, error);
//   }
// }

// async function syncUserClicksWithDB() {
//   if (isDevelopment) {
//     console.log('Development mode: Skipping user clicks sync');
//     return;
//   }

//   const now = Date.now();

//   // Iterate through all users with click data
//   for (const [userId, userData] of userClicks.entries()) {
//     // Only sync if there are new clicks or it's been more than 30 seconds since last sync
//     if (userData.naturalClicks > 0 || now - userData.lastSync > 30000) {
//       const user = onlineUsers.get(userId);

//       if (user) {
//         try {
//           // Determine which ID field to use based on whether the user is temporary
//           const idField = user.isTemporary ? 'temp_user_id' : 'user_id';

//           // Check if user already has a progress record
//           const checkResult = await db.query(
//             `SELECT id FROM progress WHERE ${idField} = $1`,
//             [userId]
//           );

//           if (checkResult.rows.length > 0) {
//             // Update existing record
//             await db.query(
//               `UPDATE progress 
//                SET natural_clicks = natural_clicks + $1, 
//                    total_clicks = $2,
//                    last_updated = CURRENT_TIMESTAMP
//                WHERE ${idField} = $3`,
//               [userData.naturalClicks, userData.totalClicks, userId]
//             );
//           } else {
//             // Create new record
//             await db.query(
//               `INSERT INTO progress (${idField}, natural_clicks, total_clicks)
//                VALUES ($1, $2, $3)`,
//               [userId, userData.naturalClicks, userData.totalClicks]
//             );
//           }

//           // Reset natural clicks counter and update last sync time
//           userData.naturalClicks = 0;
//           userData.lastSync = now;
//           userClicks.set(userId, userData);

//           console.log(`Synced clicks for user ${userId}: ${userData.naturalClicks} natural, ${userData.totalClicks} total`);
//         } catch (error) {
//           console.error(`Error syncing clicks for user ${userId}:`, error);
//         }
//       }
//     }
//   }
// }





// // Data persistence functions
// function saveServerData() {
//   const data = {
//     clickCount: clickCount,
//     timestamp: new Date().toISOString()
//   };

//   const filePath = path.join(__dirname, 'serverData.json');

//   fs.writeFile(filePath, JSON.stringify(data, null, 2), (err) => {
//     if (err) {
//       console.error('Error saving server data:', err);
//     } else {
//       console.log('Server data saved successfully');
//     }
//   });
// }



// function loadServerData() {
//   const filePath = path.join(__dirname, 'serverData.json');

//   fs.readFile(filePath, 'utf8', (err, data) => {
//     if (err) {
//       if (err.code === 'ENOENT') {
//         console.log('No saved data found. Starting with initial values.');
//       } else {
//         console.error('Error reading server data:', err);
//       }
//     } else {
//       try {
//         const parsedData = JSON.parse(data);
//         clickCount = parsedData.clickCount;
//         console.log('Server data loaded successfully');
//       } catch (parseErr) {
//         console.error('Error parsing server data:', parseErr);
//       }
//     }
//   });
// }


// async function loadUserProgress(socket, userId, isTemporary) {
//   if (isDevelopment) {
//     console.log('Development mode: Skipping user progress load');
//     return;
//   }

//   try {
//     // Determine which ID field to use
//     const idField = isTemporary ? 'temp_user_id' : 'user_id';

//     // Get user progress
//     const progressResult = await db.query(
//       `SELECT * FROM progress WHERE ${idField} = $1`,
//       [userId]
//     );

//     if (progressResult.rows.length > 0) {
//       const progress = progressResult.rows[0];

//       // Initialize user clicks tracking
//       userClicks.set(userId, {
//         naturalClicks: progress.naturalClicks || 0,
//         totalClicks: progress.total_clicks || 0,
//         clickValue: 1, // Default value, will be updated by client
//         lastSync: Date.now()
//       });

//       // Send progress data to the client
//       socket.emit('loadProgress', {
//         totalClicks: progress.total_clicks || 0,
//         naturalClicks: progress.natural_clicks || 0,
//         bestCPS: progress.best_cps || 0,
//         flatClickBonus: progress.flat_click_bonus || 0,
//         percentageClickBonus: progress.percentage_click_bonus || 1,
//         flatAutoClicker: progress.flat_auto_clicker || 0,
//         percentAutoClicker: progress.percent_auto_clicker || 0,
//         unlockables: progress.unlockables || [0, 0, 0, 0, 0]
//       });

//       console.log(`Loaded progress for user ${userId}`);
//     }
//   } catch (error) {
//     console.error(`Error loading progress for user ${userId}:`, error);
//   }
// }
// // Initialization and intervals
// loadServerData();
// setInterval(updateGlobalCPS, 100);
// setInterval(updateAllUsers, 5000);
// // Set up interval to clean up inactive users
// setInterval(cleanupInactiveUsers, 10000); // Run every 10 seconds
// // setInterval(syncTotalClicksWithDB, 30000);
// setInterval(syncUserClicksWithDB, 10000);
// setInterval(saveServerData, 60 * 60 * 1000);



// // Authentication routes
// // app.post('/api/register', async (req, res) => {
// //   const { tempUserId, username, password, email } = req.body;

// //   try {
// //     // Check if username or email already exists
// //     const userCheck = await db.query('SELECT * FROM users WHERE username = $1 OR email = $2', [username, email]);
// //     if (userCheck.rows.length > 0) {
// //       return res.status(400).json({ error: 'Username or email already exists' });
// //     }

// //     // Hash the password
// //     const hashedPassword = await bcrypt.hash(password, 10);

// //     // Insert the new user into the database
// //     const result = await db.query(
// //       'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
// //       [username, email, hashedPassword]
// //     );

// //     const newUserId = result.rows[0].id;

// //     if (tempUserId) {
// //       await db.query('UPDATE progress SET user_id = $1 WHERE user_id = $2', [newUserId, tempUserId]);
// //     }
// //     // Create a new token for the registered user
// //     const token = jwt.sign({ id: newUserId, username }, JWT_SECRET, { expiresIn: '30d' });

// //     res.json({ token, userId: newUserId, username });
// //     console.log(`User ${username} registered successfully`);
// //   } catch (error) {
// //     console.error('Registration error:', error);
// //     res.status(500).json({ error: 'An error occurred during registration' });
// //   }
// // });



// app.post('/api/register', async (req, res) => {
//   console.log('Received registration request:', req.body);
//   const { tempUserId, username, password, email } = req.body;

//   console.log('Extracted data:', { tempUserId, username, password: password ? '[REDACTED]' : undefined, email });

//   // Check if all required fields are provided
//   if (!username || !password || !email) {
//     console.log('Missing required fields');
//     return res.status(400).json({ error: 'All fields are required' });
//   }

//   // Check if username is not empty
//   if (username.trim() === '') {
//     console.log('Empty username provided');
//     return res.status(400).json({ error: 'Username cannot be empty' });
//   }

//   try {
//     // Check if username or email already exists
//     const userCheck = await db.query('SELECT * FROM users WHERE username = $1 OR email = $2', [username, email]);
//     if (userCheck.rows.length > 0) {
//       console.log('Username or email already exists');
//       return res.status(400).json({ error: 'Username or email already exists' });
//     }

//     // Hash the password
//     const hashedPassword = await bcrypt.hash(password, 10);

//     console.log('Inserting new user into database');
//     // Insert the new user into the database
//     const result = await db.query(
//       'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
//       [username, email, hashedPassword]
//     );

//     const newUserId = result.rows[0].id;
//     console.log('New user created with ID:', newUserId);

//     // Transfer progress from temp user to new user
//     if (tempUserId) {
//       console.log('Transferring progress from temp user:', tempUserId);
//       await db.query('UPDATE progress SET user_id = $1 WHERE user_id = $2', [newUserId, tempUserId]);
//     }

//     // Create a new token for the registered user
//     const token = jwt.sign({ id: newUserId, username }, process.env.JWT_SECRET, { expiresIn: '30d' });

//     console.log('Registration successful');
//     res.json({ token, userId: newUserId, username });
//   } catch (error) {
//     console.error('Registration error:', error);
//     res.status(500).json({ error: 'An error occurred during registration', details: error.message });
//   }
// });









// Start the server

server.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
