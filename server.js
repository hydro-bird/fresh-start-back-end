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
//Superagent call to Teleport API to receive city information.
//TODO: check against SQL db?
app.get('/user', getUserAlias);
app.put('/addfavorites', addCity);
// app.put('/removefavorites', removeCity)

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
                console.log(cityObject); //TEST
                res.send(cityObject);
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
        insertUser(username).then(id =>{
          res.send({user_id:id,username:username,faveCities:[]});
        }) .catch(error => console.log('---------------------- NO',error));
      } else {
        //Query for user's favorites
        const user_id = result.rows[0].id;
        getFavorites(result.rows[0].id).then(favResult =>{
          res.send({user_id:user_id,username:username,faveCities:favResult});
        });
        console.log('return val',favCities);
        //Add to favCities Object
      }

    })
    .catch(error => console.log('----------------------',error));

}

function insertUser(username){
  const SQL = 'INSERT INTO users (user_email) VALUES ($1) RETURNING id;';
  const values = [username];
  return client.query(SQL, values)
    .then(result => {
      const user_id = result.rows[0];
      return user_id.id;
    }).catch(error => console.log('-------------insertUser',error));
}
function getFavorites(user_id){
  const SQL = 'SELECT * FROM cities INNER JOIN favorites ON user_id=$1; ';
  const values = [user_id];
  return client.query(SQL, values)
    .then(result => {
      console.log('looking at favorites',result.rows);
      return result.rows;
    }).catch(error => console.log('-------------favorites',error));
}

function addCity(req, res) {
  const user_id = req.query.user_id;
  const city_name = req.query.city_name;
  const geoname_id = req.query.geoname_id;
  const SQL = 'INSERT INTO cities (city_name,city_geocode_id) VALUES($1,$2) RETURNING id;';
  let values = [city_name, geoname_id];
  const favSQL = 'INSERT INTO favorites (user_id,city_id) VALUES ($1,$2);';
  return client.query(SQL, values)
    .then(id => {
      values = [user_id,id];
      console.log('looking at adding Favorites',id);
      res.send({city_id:id,city_name:city_name});
      return id;
    }).then(client.query(favSQL,values).then(result =>{
      res.send(result.body);
      return result.body;
    })).catch(error => console.log('-------------favorites',error));

}


function removeCity(req, res) {

}

// Make sure the server is listening for request
app.listen(PORT, () => console.log(`Listening on ${PORT}`));

