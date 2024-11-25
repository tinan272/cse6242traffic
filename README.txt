CSE 6242 Traffic Route Safety Visualization
Christian Lee, Charles (Charlie) Liu, My Duyen (Tina) Nguyen, Borun (Patrick) Song

1. Description
    Current routing systems prioritize travel time without adequately considering safety metrics such 
as historical collision data and traffic patterns, limiting users’ ability to make informed, risk-aware route 
choices. This gap in explainability often leads to increased frustration for commuters, and prevents traffic 
planners from addressing critical safety concerns effectively. The objective of this project is to develop an 
interactive application that integrates real-time and historical data on traffic, collisions, and routing 
patterns to model, analyze, and visualize safety and speed statistics for routes in Georgia. We aim to 
calculate how traffic patterns are affected by various types of accidents and how it affects commute, and 
visualize concrete safety and speed statistics of different routes from origin to destination.
    The application combines vital information from both the collision dataset from Georgia 
Department of Transportation (GDOT) with TomTom’s routing patterns. Using Javascript and D3.js, we 
will retrieve the top 3 or 5 routes between any two locations from the interactive map of metro Atlanta. 
Many similar applications usually only focus on the top route at a time.
    Statistics will be generated and historical trends on traffic flow, collisions, and overall safety will 
be visualized for each of the routes, providing a more holistic approach for commuters to determine the 
best route. Manap et. al has shown that using buffer analysis we can locate accidents and accident 
hotspots that happen along a route. In our implementation, each route will have a 24-hour distribution of 
the safety of that route and the speed of that route. Rakha & Van Aerde and Borucka et. al shows that 
there are significant differences in accident frequency between both time-of-day and day of the week. 
Stretch goals are to give advanced safety statistics of these routes. Crash visualizations will be 
proportional to traffic volume to normalize roads.
    This can have real impact - state and federal departments of transportation could use our statistics 
to put real-time specific warning signs along the part of the road that was identified as “dangerous” for 
drivers’ safety. It could also be used to find specific pockets of time where certain roads are performing 
poorly, helping design roads better. Of course, this can also be used by drivers themselves, to understand 
their commute better, reducing frustration and increasing driver awareness.

2. Installation and Setup
Importing data and setting up PostgresSQL and PostgresGIS:
We need PostGIS to load the accident dataset so we can efficiently query accidents per route.
 - Use the truncated (100000 rows) dataset "/CODE/Collisions Dataset.csv" already in the repository, or download your own Numetric collisions data as csv from AASHTOWare.
 - If applicable, rename downloaded file to "Collisions Dataset.csv" and move to the /CODE directory
 - To set up PostGIS, watch this video: https://www.youtube.com/watch?v=tTUM9XfDvqk (NOTE: Name the database you create "accidents")
 - Open pgAdmin4
 - Create table for collisions data with the following SQL statement:
CREATE TABLE IF NOT EXISTS public.collisions
(
    "Collision ID" bigint NOT NULL,
    "Agency Name (Crash Level) " text COLLATE pg_catalog."default",
    "Date and Time" timestamp without time zone,
    "Roadway (From Crash Report)" text COLLATE pg_catalog."default",
    "Intersecting Roadway" text COLLATE pg_catalog."default",
    "KABCO Severity" text COLLATE pg_catalog."default",
    "Manner of Collision (Crash Level) " text COLLATE pg_catalog."default",
    "Location at Impact (Crash Level) " text COLLATE pg_catalog."default",
    "# of Vehicles per crash " smallint,
    "Light Conditions (Crash Level)" text COLLATE pg_catalog."default",
    "Surface Condition (Crash Level) " text COLLATE pg_catalog."default",
    "Safety Equipment (Crash Level) " text COLLATE pg_catalog."default",
    "Roadway Contributing Factors" text COLLATE pg_catalog."default",
    "Lat" numeric(12,10),
    "Long" numeric(12,10),
    "Functional Class (Crash Level) " text COLLATE pg_catalog."default",
    "Roadway Ownership/Maintenance Agency" text COLLATE pg_catalog."default",
    "Area: County" text COLLATE pg_catalog."default",
    "Area: City" text COLLATE pg_catalog."default",
    "# Serious Injuries" smallint,
    "# Visible Injuries" smallint,
    CONSTRAINT collisions_pkey PRIMARY KEY ("Collision ID")
)
 - Run /CODE/import_csv.py to import csv file into created table
 - If you run into issues with the import script, you can alternatively run /CODE/Collisions Dataset.sql to load a smaller subset of data into the created table
 - In pgAdmin4 again, create table for segmented collisions data with the following SQL statement:
CREATE TABLE IF NOT EXISTS public.accidents_by_segment_hourly
(
    ogc_fid integer,
    hour_0 bigint, hour_1 bigint, hour_2 bigint, hour_3 bigint, hour_4 bigint, hour_5 bigint,
    hour_6 bigint, hour_7 bigint, hour_8 bigint, hour_9 bigint, hour_10 bigint, hour_11 bigint,
    hour_12 bigint, hour_13 bigint, hour_14 bigint, hour_15 bigint, hour_16 bigint, hour_17 bigint,
    hour_18 bigint, hour_19 bigint, hour_20 bigint, hour_21 bigint, hour_22 bigint, hour_23 bigint,
    geom geometry,
    aadt text COLLATE pg_catalog."default",
    route_id text COLLATE pg_catalog."default",
    total_accidents text COLLATE pg_catalog."default"
)
 - Run /CODE/accidents_by_segment_hourly.sql to load data into created table

3. Execution
From the /CODE directory, run:
 - npm install -g http-server
 - npm install
 - npm install esbuild
 - npx esbuild main.js --bundle --outfile=bundle.js --platform=browser
 - run front-end with: http-server
 - run express server on separate terminal: node server.js
 - navigate to http://localhost:8080/map.html on browser

Notes:
Using the library @turf/turf, we use the library browserify to use npm functions like require() in the browser.