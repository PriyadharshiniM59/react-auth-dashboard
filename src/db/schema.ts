import { pgTable, serial, varchar, boolean, timestamp, text, integer } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    role: varchar('role', { length: 20 }).notNull().default('user'), // 'admin' or 'user'
    isApproved: boolean('is_approved').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const documents = pgTable('documents', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull(),
    filename: varchar('filename', { length: 500 }).notNull(),
    content: text('content').notNull(),
    fileSize: integer('file_size').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
