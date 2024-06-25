import {Pool, PoolClient, QueryResult} from 'pg';

function dateFromDb(dbDate: string): Date {
    const t = dbDate.split(/[- :]/).map(str => parseInt(str));
    return new Date(t[0], t[1] - 1, t[2], t[3] || 0, t[4] || 0, t[5] || 0);
}




// Get the connection details from the Railway environment variables
const dbHost = process.env.PGHOST || "";
const dbPort = process.env.PGPORT || "";
const dbUser = process.env.PGUSER || "";
const dbPassword = process.env.PGPASSWORD || "";
const dbName = process.env.PGDATABASE || "";

// Create a connection pool
const pool = new Pool({
    host: dbHost,
    port: +dbPort,
    user: dbUser,
    password: dbPassword,
    database: dbName,
});

// Test the connection
pool.connect((err: Error | undefined, client: PoolClient | undefined, release?: any) => {
    if (err) {
        console.error('Error acquiring client', err.stack);
        return;
    }

    if (typeof client === "undefined") {
        console.error('Client is undefined')
        return;
    }

    // Use the client for executing queries
    client.query('SELECT NOW()', (err: Error, result: QueryResult<any>) => {
        release(); // Release the client back to the pool

        if (err) {
            console.error('Error executing query', err.stack);
            return;
        }

        console.log('Connected to the database:', result.rows[0]);
    });
});

// Query function that returns a Promise
const query = async (text: string, params?: any[]): Promise<QueryResult> => {
    const client = await pool.connect();
    try {
        return client.query(text, params);
    } finally {
        client.release();
    }
};


// Test the query function
query('SELECT NOW()')
    .then((res) => console.log('Current time:', res.rows[0]))
    .catch((err) => console.error('Error executing query', err.stack));

// Export the query function and the pool
export { query, pool, dateFromDb };

