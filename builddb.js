const express = require('express');
const superagent = require('superagent');
const pg = require('pg');
const cors = require('cors');

// Load environment variables from .env file
require('dotenv').config();

// Application Setup
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Database Setup
const client = new pg.Client(process.env.DATABASE_URL);
client.connect();
client.on('error', err => console.error(err));

function start(){
  client.query(`
  DROP TABLE IF EXISTS favorites;
  DROP TABLE IF EXISTS cities;
  DROP TABLE IF EXISTS users;
  
  CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(20)
  );

  CREATE TABLE cities(
    id SERIAL PRIMARY KEY,
    city_name VARCHAR(255),
    city_geocode_id VARCHAR(255)
  );

  CREATE TABLE favorites (
    join_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    city_id INTEGER NOT NULL,
    FOREIGN KEY (city_id) REFERENCES cities (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
  )
  `);
  console.log('Build complete');
}

start();
