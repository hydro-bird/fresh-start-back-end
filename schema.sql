DROP TABLE IF EXISTS citys;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  user_email VARCHAR(20)
);

CREATE TABLE citys(
  id SERIAL PRIMARY KEY,
  city_name VARCHAR(255),
  city_geocode_id VARCHAR(255),
  user_id INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users (id)
);