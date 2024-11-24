const express = require('express');
const { Client } = require('pg');
const cors = require('cors');

// Database setup
const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'accidents',
    password: 'ace109182',
    port: 5432,
});

// Connect to database
client.connect()
    .then(() => console.log('Connected to PostgreSQL'))
    .catch(err => console.error('PostgreSQL connection error:', err));

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Add this to parse JSON bodies

// POST endpoint for collisions
app.post('/collisions', async (req, res) => {
    const geom = req.body;
    
    if (!geom) {
        console.log("No geom request")
        return res.status(400).send('Missing required "geom" in request body');
    }

    try {
        // Fixed query with proper parameterization and correct coordinate order
        const query = `
            SELECT "Collision ID", "Lat", "Long", "Date and Time", "KABCO Severity"
            FROM collisions
            WHERE ST_Intersects(
                ST_SetSRID(ST_GeomFromGeoJSON($1), 4326),
                ST_SetSRID(ST_MakePoint("Lat", "Long"), 4326)
            );
        `;
        // queryString = `
        //     SELECT "Collision ID", "Lat", "Long", "Date and Time", "KABCO Severity"
        //     FROM collisions
        //     WHERE ST_Intersects(
        //         ST_SetSRID(ST_GeomFromGeoJSON('${JSON.stringify(geom)}'), 4326),
        //         ST_SetSRID(ST_MakePoint("Lat", "Long"), 4326)
        //     );
        // `
        // console.log(queryString)
        const result = await client.query(query, [JSON.stringify(geom)]);
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('X-Total-Count', result.rows.length);
        
        res.json(result.rows);

    } catch (err) {
        console.error('Error querying the database:', err);
        
        // More detailed error handling
        if (err.code === '22P02' || err.code === '22023') {
            return res.status(400).send('Invalid geometry format');
        }
        
        res.status(500).send('Internal Server Error');
    }
});

// POST endpoint for collisions grouped by Hour.
// Returns hour, accident_count
app.post('/collisionsByHour', async (req, res) => {
    const geom = req.body;
    
    if (!geom) {
        console.log("No geom request")
        return res.status(400).send('Missing required "geom" in request body');
    }

    try {
        const query = `
        WITH hour_counts as (
            SELECT EXTRACT(HOUR FROM "Date and Time") AS hour, count(*) as accident_count
            FROM collisions
            WHERE ST_Intersects(
                ST_SetSRID(ST_GeomFromGeoJSON($1), 4326),
                ST_SetSRID(ST_MakePoint("Lat", "Long"), 4326)
            )
            GROUP BY hour
        ),
        total_count as (
            SELECT SUM(accident_count) as total_accidents
            FROM hour_counts
        )
        SELECT hour, accident_count, ROUND(accident_count / (SELECT total_accidents FROM total_count), 4) as accident_prop
        from hour_counts;
        `;
        const result = await client.query(query, [JSON.stringify(geom)]);
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('X-Total-Count', result.rows.length);
        
        res.json(result.rows);

    } catch (err) {
        console.error('Error querying the database:', err);
        
        // More detailed error handling
        if (err.code === '22P02' || err.code === '22023') {
            return res.status(400).send('Invalid geometry format');
        }
        
        res.status(500).send('Internal Server Error');
    }
});

// POST endpoint for collisions groupbed by Day of week
app.post('/collisionsByDayOfWeek', async (req, res) => {
    const geom = req.body;
    
    if (!geom) {
        console.log("No geom request")
        return res.status(400).send('Missing required "geom" in request body');
    }

    try {
        // Fixed query with proper parameterization and correct coordinate order
        const query = `
            WITH day_counts as (
                SELECT EXTRACT(DOW FROM "Date and Time") AS day_of_week, count(*) as accident_count
                FROM collisions
                WHERE ST_Intersects(
                    ST_SetSRID(ST_GeomFromGeoJSON($1), 4326),
                    ST_SetSRID(ST_MakePoint("Lat", "Long"), 4326)
                )
                group by day_of_week
            ),
            total_count as (
                SELECT SUM(accident_count) as total_accidents
                FROM day_counts
            )
            SELECT day_of_week, accident_count, ROUND(accident_count / (SELECT total_accidents FROM total_count), 4) as accident_prop
            from day_counts;
        `;
        const result = await client.query(query, [JSON.stringify(geom)]);
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('X-Total-Count', result.rows.length);
        
        res.json(result.rows);

    } catch (err) {
        console.error('Error querying the database:', err);
        
        // More detailed error handling
        if (err.code === '22P02' || err.code === '22023') {
            return res.status(400).send('Invalid geometry format');
        }
        
        res.status(500).send('Internal Server Error');
    }
});

// POST endpoint for collisions grouped by route segment
app.post('/collisionsByRouteSegment', async (req, res) => {
    const geom = req.body;
    
    if (!geom) {
        console.log("No geom request")
        return res.status(400).send('Missing required "geom" in request body');
    }

    try {
        // Fixed query with proper parameterization and correct coordinate order
        const query = `
            SELECT 	hour_0, hour_1, hour_2, hour_3, hour_4, hour_5,
                    hour_6, hour_7, hour_8, hour_9, hour_10, hour_11,
                    hour_12, hour_13, hour_14, hour_15, hour_16, hour_17,
                    hour_18, hour_19, hour_20, hour_21, hour_22, hour_23,
                    route_id, ST_AsGeoJSON(geom) as geojson, total_accidents
            FROM accidents_by_segment_hourly
            WHERE ST_Intersects(
                ST_SetSRID(ST_GeomFromGeoJSON($1), 4326),
                ST_FlipCoordinates(geom)
            )
        `;
        const result = await client.query(query, [JSON.stringify(geom)]);
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('X-Total-Count', result.rows.length);
        
        res.json(result.rows);

    } catch (err) {
        console.error('Error querying the database:', err);
        
        // More detailed error handling
        if (err.code === '22P02' || err.code === '22023') {
            return res.status(400).send('Invalid geometry format');
        }
        
        res.status(500).send('Internal Server Error');
    }
});

// POST endpoint for getting aggregate accident statistics
app.post('/collisionsAggAADT', async (req, res) => {  
  try {
      // Fixed query with proper parameterization and correct coordinate order
      const query = `
          select avg(hour_0 + hour_1 + hour_2 + hour_3 + hour_4 + hour_5 
          + hour_6 + hour_7 + hour_8 + hour_9 + hour_10 + hour_11 + hour_12 
          + hour_13 + hour_14 + hour_15 + hour_16 + hour_17 + hour_18 
          + hour_19 + hour_20 + hour_21 + hour_22 + hour_23) as avg_acc,
          avg(aadt::int) as avg_aadt from accidents_by_segment_hourly
      `;
      const result = await client.query(query);
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('X-Total-Count', result.rows.length);
      
      res.json(result.rows);

  } catch (err) {
      console.error('Error querying the database:', err);
      
      // More detailed error handling
      if (err.code === '22P02' || err.code === '22023') {
          return res.status(400).send('Invalid geometry format');
      }
      
      res.status(500).send('Internal Server Error');
  }
});

// Add a simple test endpoint
app.get('/test', (req, res) => {
    res.json({ message: 'Server is running!' });
});

// Error handler for undefined routes
app.use((req, res) => {
    console.log(`404: ${req.method} ${req.url} not found`);
    res.status(404).send('Route not found');
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Available routes:');
    console.log('  POST /collisions');
    console.log('  POST /collisionsByHour');
    console.log('  POST /collisionsByDayOfWeek');
    console.log('  POST /collisionsByRouteSegment');
    console.log('  GET /test');
});

// Handle process termination
process.on('SIGINT', () => {
    client.end()
        .then(() => {
            console.log('Database connection closed.');
            process.exit(0);
        })
        .catch(err => {
            console.error('Error closing database connection:', err);
            process.exit(1);
        });
});