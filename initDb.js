require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: 'postgres', // Connect to default postgres database
  password: process.env.DB_PASS,
  port: process.env.DB_PORT,
});

const initDb = async () => {
  const client = await pool.connect();
  try {
    // Create database if it doesn't exist
    await client.query(`
      CREATE DATABASE ${process.env.DB_NAME}
      WITH 
      OWNER = ${process.env.DB_USER}
      ENCODING = 'UTF8'
      CONNECTION LIMIT = -1;
    `);
    console.log(`Database ${process.env.DB_NAME} created successfully`);
  } catch (err) {
    if (err.code === '42P04') {
      console.log(`Database ${process.env.DB_NAME} already exists`);
    } else {
      console.error('Error creating database:', err);
      return;
    }
  } finally {
    client.release();
  }

  // Connect to the new database
  const dbClient = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
  });

  try {
    // Create tables
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS progress (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        total_clicks BIGINT DEFAULT 0,
        best_cps INTEGER DEFAULT 0,
        flat_click_bonus INTEGER DEFAULT 0,
        percentage_click_bonus DECIMAL(5,2) DEFAULT 1.00,
        flat_auto_clicker INTEGER DEFAULT 0,
        percent_auto_clicker INTEGER DEFAULT 0,
        drawing_unlocked BOOLEAN DEFAULT FALSE,
        gambling_unlocked BOOLEAN DEFAULT FALSE,
        last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Tables created successfully');
  } catch (err) {
    console.error('Error creating tables:', err);
  } finally {
    await dbClient.end();
  }
};

initDb();