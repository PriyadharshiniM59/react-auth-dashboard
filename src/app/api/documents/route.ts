import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { documents } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

// GET: List documents for the authenticated user, optionally filtered by workspace
export async function GET(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const workspaceId = searchParams.get('workspaceId');

        let whereClause;
        if (workspaceId) {
            whereClause = and(
                eq(documents.userId, session.userId),
                eq(documents.workspaceId, parseInt(workspaceId, 10))
            );
        } else {
            // Show only docs without a workspace (legacy behavior)
            whereClause = and(
                eq(documents.userId, session.userId),
                isNull(documents.workspaceId)
            );
        }

        const userDocs = await db
            .select({
                id: documents.id,
                filename: documents.filename,
                fileSize: documents.fileSize,
                createdAt: documents.createdAt,
                workspaceId: documents.workspaceId,
            })
            .from(documents)
            .where(whereClause)
            .orderBy(documents.createdAt);

        return NextResponse.json({ documents: userDocs });
    } catch (error) {
        console.error('List documents error:', error);
        return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }
}

// DELETE: Remove a document by ID (must be owned by the user)
export async function DELETE(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { documentId } = await request.json();

        if (!documentId) {
            return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
        }

        const deleted = await db
            .delete(documents)
            .where(and(eq(documents.id, documentId), eq(documents.userId, session.userId)))
            .returning();

        if (deleted.length === 0) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete document error:', error);
        return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
    }
}
