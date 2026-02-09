import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { pgTable, serial, varchar, boolean, timestamp } from 'drizzle-orm/pg-core';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

// Define schema inline to avoid import issues
const users = pgTable('users', {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    role: varchar('role', { length: 20 }).notNull().default('user'),
    isApproved: boolean('is_approved').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

async function seedAdmin() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        console.error('❌ DATABASE_URL is not set in .env.local');
        process.exit(1);
    }

    console.log('🔗 Connecting to database...');
    const sql = neon(databaseUrl);
    const db = drizzle(sql);

    // Admin credentials - CHANGE THESE!
    const adminEmail = 'admin@example.com';
    const adminPassword = 'admin123';
    const adminName = 'Admin User';

    console.log('🔐 Creating admin user...');
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    try {
        const [admin] = await db.insert(users).values({
            email: adminEmail,
            passwordHash,
            name: adminName,
            role: 'admin',
            isApproved: true,
        }).returning();

        console.log('✅ Admin user created successfully!');
        console.log('');
        console.log('   Email:', adminEmail);
        console.log('   Password:', adminPassword);
        console.log('');
        console.log('⚠️  IMPORTANT: Change these credentials after first login!');
    } catch (error: unknown) {
        if (error instanceof Error && error.message.includes('duplicate')) {
            console.log('ℹ️  Admin user already exists');
        } else {
            throw error;
        }
    }
}

seedAdmin().catch(console.error);
