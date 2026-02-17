import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

export async function GET() {
    try {
        // Create workspaces table
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS workspaces (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT NOW() NOT NULL
            )
        `);

        // Add workspace_id column to documents if it doesn't exist
        await db.execute(sql`
            ALTER TABLE documents 
            ADD COLUMN IF NOT EXISTS workspace_id INTEGER
        `);

        // Verify tables
        const wsColumns = await db.execute(sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'workspaces' 
            ORDER BY ordinal_position
        `);

        const docColumns = await db.execute(sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'documents' 
            ORDER BY ordinal_position
        `);

        return NextResponse.json({
            success: true,
            message: 'Migration complete! Workspaces table created and documents table updated.',
            workspaces_columns: wsColumns.rows,
            documents_columns: docColumns.rows,
        });
    } catch (error) {
        console.error('Migration error:', error);
        const message = error instanceof Error ? error.message : 'Migration failed';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
