import type { Config } from 'drizzle-kit';

export default {
    schema: './src/db/schema/*',
    out: './src/db/migrations',
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.DATABASE_URL || 'postgresql://localhost:5432/postgres',
    },
} satisfies Config;
