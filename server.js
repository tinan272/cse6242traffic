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
        queryString = `
            SELECT "Collision ID", "Lat", "Long", "Date and Time", "KABCO Severity"
            FROM collisions
            WHERE ST_Intersects(
                ST_SetSRID(ST_GeomFromGeoJSON('${JSON.stringify(geom)}'), 4326),
                ST_SetSRID(ST_MakePoint("Lat", "Long"), 4326)
            );
        `
        console.log(queryString)
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