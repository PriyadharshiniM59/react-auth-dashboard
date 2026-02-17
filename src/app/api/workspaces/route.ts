import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { workspaces, documents } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

// GET: List all workspaces for the authenticated user (with doc count)
export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userWorkspaces = await db
            .select({
                id: workspaces.id,
                name: workspaces.name,
                description: workspaces.description,
                createdAt: workspaces.createdAt,
                docCount: sql<number>`(SELECT COUNT(*) FROM documents WHERE workspace_id = ${workspaces.id})`.as('doc_count'),
            })
            .from(workspaces)
            .where(eq(workspaces.userId, session.userId))
            .orderBy(workspaces.createdAt);

        return NextResponse.json({ workspaces: userWorkspaces });
    } catch (error) {
        console.error('List workspaces error:', error);
        return NextResponse.json({ error: 'Failed to fetch workspaces' }, { status: 500 });
    }
}

// POST: Create a new workspace
export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { name, description } = await request.json();

        if (!name || name.trim().length === 0) {
            return NextResponse.json({ error: 'Workspace name is required' }, { status: 400 });
        }

        if (name.trim().length > 100) {
            return NextResponse.json({ error: 'Name must be under 100 characters' }, { status: 400 });
        }

        const [workspace] = await db.insert(workspaces).values({
            userId: session.userId,
            name: name.trim(),
            description: description?.trim() || null,
        }).returning();

        return NextResponse.json({ workspace }, { status: 201 });
    } catch (error) {
        console.error('Create workspace error:', error);
        return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 });
    }
}

// DELETE: Remove a workspace and all its documents
export async function DELETE(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { workspaceId } = await request.json();

        if (!workspaceId) {
            return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });
        }

        // Delete all documents in the workspace first
        await db.delete(documents).where(
            and(eq(documents.workspaceId, workspaceId), eq(documents.userId, session.userId))
        );

        // Delete the workspace
        const deleted = await db.delete(workspaces).where(
            and(eq(workspaces.id, workspaceId), eq(workspaces.userId, session.userId))
        ).returning();

        if (deleted.length === 0) {
            return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete workspace error:', error);
        return NextResponse.json({ error: 'Failed to delete workspace' }, { status: 500 });
    }
}
