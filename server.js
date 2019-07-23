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
app.get('/user', getUserAlias)
// app.put('/favorites', addFavoritesDb)

//Superagent call to Teleport API to receive city information.
//TODO: check against SQL db? 
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
          cityObject.urbanAreaUrl = result.body._links['city:urban_area'].href;
          cityObject.geoNameId = result.body.geoname_id;
          cityObject.name = result.body.name;
          cityObject.population = result.body.population;
          cityObject.latitude = result.body.location.latlon.latitude;
          cityObject.longitude = result.body.location.latlon.longitude;

          //third API call to get Urban Area details for city and add to cityObject
          superagent.get(cityObject.urbanAreaUrl + 'scores')
            .then(result => {
              cityObject.categories = result.body.categories;
              console.log(cityObject); //TEST
              //res.send(result.body);
              res.send(cityObject);
            })
        })
    });
}

//TODO: Add user to SQL db User table
function getUserAlias(req, res) {
  //use SQL query to insert/add/update User table with current user. 
}

// Make sure the server is listening for request
app.listen(PORT, () => console.log(`Listening on ${PORT}`));

