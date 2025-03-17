require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

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
    // First, drop existing tables if they exist (in reverse order of dependencies)
    await dbClient.query(`
      DROP TABLE IF EXISTS progress;
      DROP TABLE IF EXISTS temp_users;
      DROP TABLE IF EXISTS users;
    `);
    console.log('Dropped existing tables');
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'database.sql');
    let sqlScript = fs.readFileSync(sqlFilePath, 'utf8');

    // Remove the first line that contains \c webclicker_db since we're already connected
    sqlScript = sqlScript.replace(/^\s*\\c\s+webclicker_db\s*;?\s*$/m, '');

    // Split the script into individual statements
    const statements = sqlScript
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);

    // Execute each statement separately
    for (const statement of statements) {
      await dbClient.query(statement);
    }
    console.log('Database schema initialized successfully from database.sql');

  } catch (err) {
    console.error('Error initializing database schema:', err);
    console.error(err.stack);
  } finally {
    await dbClient.end();
  }
};

initDb();
