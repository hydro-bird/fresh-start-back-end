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
// app.put('/addfavorites', addCity)
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
              })
          } else {
            res.send(cityObject);
          }
        })
    });
}

//TODO: Check if user exists in SQL db User table, 
// IF EXISTS -> send back favorites city data 
// ELSE IF !EXIST -> Add user to User table 
function getUserAlias(req, res) {
  //const SQL = `INSERT QUERY HERE`;
  //const username = req.query;
  //let favCities = {}

  client.query(SQL, username)
    .then(result => {
      if (result.rowCount > 0) { //User does not exist in table
        //Insert user into table.
      } else {
        //Query for user's favorites
        //Add to favCities Object
      }
    })
    .catch(error => handleError(error));
  res.send(favCities);
}

function addCity(req, res) {
  const SQL = `INSERT QUERY HERE`;
  const values = req.query;


}

function removeCity(req, res) {

}

// Make sure the server is listening for request
app.listen(PORT, () => console.log(`Listening on ${PORT}`));

