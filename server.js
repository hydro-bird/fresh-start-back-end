'use strict';

//Application Dependencies
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

// API Routes
app.get('/search', getCityData);
app.get('/user', getUserAlias);
app.get('/map', getMap);
// app.put('/addfavorites', addCity)
// app.put('/removefavorites', removeCity)

function getMap(req, res) {
  const latitude = req.query.latitude;
  const longitude = req.query.longitude;
}

//Superagent call to Teleport API to receive city information.
function getCityData(req, res) {
  let cityObject = {};
  let city = req.query.city.toUpperCase();
  console.log(city); //test user's city query
  //first API call to search for city with user's query input.
  superagent.get(`https://api.teleport.org/api/cities/?search=${city}`)
    .then(result => {
      //add geonameid API url to cityObject
      cityObject.cityUrl = result.body._embedded['city:search-results'][0]._links['city:item'].href;

      //TESTING
      // console.log('This is the results: ', result.body._embedded['city:search-results'][0]._links['city:item'].href);
      // console.log(cityObject);

      //second API call using geonameid to get city details and add to cityObject
      superagent.get(cityObject.cityUrl)
        .then(result => {

          if (result.body._links['city:urban_area']) {
            cityObject.urbanAreaUrl = result.body._links['city:urban_area'].href;
            // console.log('i am in urban area');
            // superagent.get(cityObject.)
            // cityObject.webImage = cityObject.urbanAreaUrl + 'images.photos.image.web';
          }
          cityObject.geoNameId = result.body.geoname_id;
          cityObject.name = result.body.name;
          cityObject.population = result.body.population;
          cityObject.latitude = result.body.location.latlon.latitude;
          cityObject.longitude = result.body.location.latlon.longitude;


          //third API call to get Urban Area details for city and add to cityObject
          if (cityObject.urbanAreaUrl) {
            superagent.get(cityObject.urbanAreaUrl + 'scores')
              .then(result => {
                cityObject.categories = result.body.categories;

                res.send(cityObject);
              });
            console.log(cityObject.urbanAreaUrl + 'images');
            superagent.get(cityObject.urbanAreaUrl + 'images')
              .then(result => {
                cityObject.webImage = result.body.photos[0].image.web;
                // console.log(result.body.photos[0].image.web);
                console.log(cityObject); //TEST
              });
          } else {
            res.send(cityObject);
          }
        });
    });
}

//TODO: Check if user exists in SQL db User table,
// IF EXISTS -> send back favorites city data
// ELSE IF !EXIST -> Add user to User table
function getUserAlias(req, res) {
  const username = req.query.email;
  const SQL = 'SELECT id FROM users WHERE user_email=$1;';
  const values = [username];
  let favCities = [];
  client.query(SQL, values)
    .then(result => {

      if (result.rowCount === 0) { //User does not exist in table
        //Insert user into table.
        insertUser(username).then(id => {

          console.log('-------------------------------this is the id I want', id);
          res.send({ user_id: id, username: username, faveCities: [] });
        }).catch(error => console.log('---------------------- NO', error));
      } else {
        //Query for user's favorites
        const user_id = result.rows[0].id;
        getFavorites(result.rows[0].id).then(favResult => {
          res.send({ user_id: user_id, username: username, faveCities: favResult });
        });
        console.log('return val', favCities);
        //Add to favCities Object
      }

    })
    .catch(error => console.log('----------------------', error));

}

function insertUser(username) {
  const SQL = 'INSERT INTO users (user_email) VALUES ($1) RETURNING id;';
  const values = [username];
  return client.query(SQL, values)
    .then(result => {
      const user_id = result.rows[0];
      console.log('----------------------------------userid', user_id);
      return user_id.id;
    }).catch(error => console.log('-------------insertUser', error));
}
function getFavorites(user_id) {
  const SQL = 'SELECT * FROM cities INNER JOIN favorites ON user_id=$1; ';
  const values = [user_id];
  return client.query(SQL, values)
    .then(result => {
      console.log('looking at favorites', result.rows);
      return result.rows;
    }).catch(error => console.log('-------------favorites', error));
}

function addCity(req, res) {
  const city_name = req.body.city_name;
  const geoname_id = req.body.geoname_id;
  const SQL = 'INSERT INTO cities (city_name,city_geocode_id) VALUES($1,$2);';
  const values = [city_name, geoname_id];

  return client.query(SQL, values)
    .then(result => {
      console.log('looking at adding Favorites', result.rows);
      return result.rows;
    }).catch(error => console.log('-------------favorites', error));
}


function removeCity(req, res) {

}

// Make sure the server is listening for request
app.listen(PORT, () => console.log(`Listening on ${PORT}`));

