DROP TABLE IF EXISTS favorites;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS cities;

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