import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

if (!process.env.DATABASE_URL || process.env.DATABASE_URL === 'your_neon_database_url_here') {
    throw new Error(
        'DATABASE_URL is not configured. Please set your Neon database URL in .env.local file.\n' +
        'Get your connection string from: https://console.neon.tech'
    );
}

const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });
