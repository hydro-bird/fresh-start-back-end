'use strict';

//Application Dependencies
const express = require('express');
const superagent = require('superagent');
const pg = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');

// Load environment variables from .env file
require('dotenv').config();

// Application Setup
const app = express();
const PORT = process.env.PORT || 3000;
// app.use(bodyParser.json());
app.use(cors());

// Database Setup
const client = new pg.Client(process.env.DATABASE_URL);
client.connect();
client.on('error', err => console.error(err));

// API Routes
app.get('/search', getCityData);
app.get('/user', getUserAlias);
app.put('/addfavorites', addCity);
app.put('/removefavorites', removeCity);


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
        insertUser(username).then(id =>{
          res.send({user_id:id,username:username,faveCities:[]});
        }) .catch(error => console.log('---------------------- NO',error));
      } else {
        //Query for user's favorites
        const user_id = result.rows[0].id;
        getFavorites(result.rows[0].id).then(favResult =>{
          console.log(favCities);
          res.send({user_id:user_id,username:username,faveCities:favResult});
        });
        console.log('return val', favCities);
        //Add to favCities Object
      }

    })
    .catch(error => console.log('----------------------',error));
}

//This function will check for user in the database or create user in the database
function insertUser(username){
  const SQL = 'INSERT INTO users (user_email) VALUES ($1) RETURNING id;';
  const values = [username];
  return client.query(SQL, values)
    .then(result => {
      const user_id = result.rows[0];
      return user_id.id;
    }).catch(error => console.log('-------------insertUser', error));
}

//This function will get the favorites for the user
function getFavorites(user_id){
  const SQL = 'SELECT * FROM cities INNER JOIN favorites ON city_id=cities.id where user_id=$1; ';
  const values = [user_id];
  return client.query(SQL, values)
    .then(result => {
      console.log('getFavorites',result.rows);
      return result.rows;
    }).catch(error => console.log('-------------favorites', error));
}

//This function will add a location search to the user's favorites
function addCity(req, res) {
  const user_id = req.query.user_id;
  const city_name = req.query.city_name;
  const geoname_id = req.query.geoname_id;
  let addObject = {};
  let SQL = 'SELECT * FROM cities WHERE city_geocode_id=$1;';
  client.query(SQL, [geoname_id])
    .then(result => {
      if(result.rowCount === 0){
        console.log(result.rows);
        cityNotFoundDB(user_id,city_name,geoname_id,res).then(resultsJoin =>{
          addObject = resultsJoin;
          console.log(addObject);
        }).catch(error => console.log('-------------favorites',error));

      }else{
        citYFoundDB(user_id,result.rows);
        res.send(result.rows);
      }
    }).catch(error => console.log('-------------favorites',error));
}

//This function will remove a locaction search from the user's favorites
function removeCity(req, res) {
  const join_id = req.query.join_id;
  const SQL = 'DELETE FROM favorites WHERE join_id=$1;';
  const values = [join_id];
  return client.query(SQL, values).then(result => {
    console.log('removing city');
    res.send('Success REMOVED');
    return result;
  }).catch(error => console.log('-------------Delete Route',error));

}

//This is function will run if the locaction search is not in the database. It will add the locaction
function cityNotFoundDB(user_id,city_name,geoname_id,res){
  const SQL = 'INSERT INTO cities (city_name,city_geocode_id) VALUES($1,$2) RETURNING id, city_name;';
  let values = [city_name, geoname_id];
  const favSQL = 'INSERT INTO favorites (user_id,city_id) VALUES ($1,$2) RETURNING join_id;';
  return client.query(SQL, values)
    .then(findId => {
      const id = findId.rows[0].id;
      console.log('looking at adding Favorites',id);
      values = [user_id,id];
      client.query(favSQL,values).then(result =>{
        console.log('join_id coming at you--------',result.rows[0].join_id);
        res.send([result.rows[0], findId.rows[0]]);
        return result.rows[0].join_id;
      }).catch(error => console.log('-------------favorites',error));
    }).catch(error => console.log('-------------favorites 1st',error));
}

//This funtion will take a city that has already been added to the database under another user and it will add this search to the favorites of the current user.
function citYFoundDB(user_id,results){
  const SQL = 'INSERT INTO favorites (user_id,city_id) VALUES ($1,$2);';
  const values = [user_id,results[0].id];
  console.log('--------------------------user_id', user_id);
  console.log('--------------------TRYING',results[0]);
  return client.query(SQL, values)
    .then(result => {
      console.log(result);
      return result;
    }).catch(error => console.log('-------------City found 1st',error));
}



// Make sure the server is listening for request
app.listen(PORT, () => console.log(`Listening on ${PORT}`));

