import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Database connection configuration
const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/backend_db';

// Create postgres client
const client = postgres(connectionString, {
    max: 10, // Maximum number of connections
    idle_timeout: 20, // Close idle connections after 20 seconds
    connect_timeout: 10, // Connection timeout in seconds
});

// Create drizzle instance
export const db = drizzle(client);

// Export the client for direct access if needed
export { client };

// Graceful shutdown function
export const closeConnection = async () => {
    await client.end();
};
