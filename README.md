# cse6242traffic

## Setup

npm install -g http-server

npm install

run front-end with: http-server

run express server on separate terminal: node server.js

## Notes
Using the library @turf/turf, we use the library browserify to use npm functions like require() in the browser.

### IMPORTANT WHEN MAKING CHANGES 

Run in incognito (doesn't cache)

After editing the main function (currently getRoute.js): run browserify getRoute.js -o bundle.js

After, refresh http://localhost:8080/bundle.js

Then, refresh http://localhost:8080/map.html to run functions


## Setting up PostgresSQL and PostgresGIS
- We need PostGIS to load the accident dataset so we can efficiently query accidents per route.

1. Add Collisions Dataset.csv to this directory
2. PostGIS Setup: Watch this video. (https://www.youtube.com/watch?v=tTUM9XfDvqk)
   1. Name the database you create "accidents"
3. Open pgAdmin4
4. Create a table (name "collisions") and add column headers and their datatypes by hand IMPORTANT
   1. Collision ID
      1. bigint, primary key
   2. Date and Time
      1. Timestamp
   3. "# of vehicles", "# of serious..", "# visible injuries"
      1. smallint
   4. lat, long
      1. numeric(12, 10)
   5. EVERYTHING ELSE
      1. Text
5. Run import_csv.py to import or use pgAdmin's create table functionality (you get more debugging info with the python script though)


## add api key
