import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

export async function GET() {
    try {
        // Create documents table
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS "documents" (
                "id" serial PRIMARY KEY,
                "user_id" integer NOT NULL,
                "filename" varchar(500) NOT NULL,
                "content" text NOT NULL,
                "file_size" integer NOT NULL,
                "created_at" timestamp DEFAULT now() NOT NULL
            )
        `);

        // Verify
        const result = await db.execute(sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'documents' 
            ORDER BY ordinal_position
        `);

        return NextResponse.json({
            success: true,
            message: 'Documents table created successfully!',
            columns: result.rows
        });
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
