import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { getSession } from '@/lib/auth';
import { eq } from 'drizzle-orm';

// GET all users (for admin)
export async function GET() {
    try {
        const session = await getSession();

        if (!session || session.role !== 'admin') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403 }
            );
        }

        const allUsers = await db.select({
            id: users.id,
            email: users.email,
            name: users.name,
            role: users.role,
            isApproved: users.isApproved,
            createdAt: users.createdAt,
        }).from(users);

        return NextResponse.json({ users: allUsers });
    } catch (error) {
        console.error('Get users error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// PATCH to approve/reject user
export async function PATCH(request: Request) {
    try {
        const session = await getSession();

        if (!session || session.role !== 'admin') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403 }
            );
        }

        const { userId, isApproved } = await request.json();

        if (typeof userId !== 'number' || typeof isApproved !== 'boolean') {
            return NextResponse.json(
                { error: 'Invalid request body' },
                { status: 400 }
            );
        }

        const [updatedUser] = await db.update(users)
            .set({ isApproved, updatedAt: new Date() })
            .where(eq(users.id, userId))
            .returning();

        if (!updatedUser) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            message: `User ${isApproved ? 'approved' : 'rejected'} successfully`,
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                name: updatedUser.name,
                isApproved: updatedUser.isApproved,
            },
        });
    } catch (error) {
        console.error('Update user error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
