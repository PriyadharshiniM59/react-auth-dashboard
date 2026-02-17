import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { documents } from '@/db/schema';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buffer);
    return data.text;
}

function extractTextFromTXT(buffer: Buffer): string {
    return buffer.toString('utf-8');
}

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: 'File too large. Maximum size is 10MB.' },
                { status: 400 }
            );
        }

        const filename = file.name.toLowerCase();
        const isPDF = filename.endsWith('.pdf');
        const isTXT = filename.endsWith('.txt');

        if (!isPDF && !isTXT) {
            return NextResponse.json(
                { error: 'Unsupported file type. Please upload a PDF or TXT file.' },
                { status: 400 }
            );
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        let content: string;
        try {
            if (isPDF) {
                content = await extractTextFromPDF(buffer);
            } else {
                content = extractTextFromTXT(buffer);
            }
        } catch {
            return NextResponse.json(
                { error: 'Failed to extract text from the file. The file may be corrupted or password-protected.' },
                { status: 400 }
            );
        }

        if (!content || content.trim().length === 0) {
            return NextResponse.json(
                { error: 'No text content found in the file. The file may be image-based or empty.' },
                { status: 400 }
            );
        }

        const workspaceIdStr = formData.get('workspaceId') as string | null;
        const workspaceId = workspaceIdStr ? parseInt(workspaceIdStr, 10) : null;

        const [doc] = await db.insert(documents).values({
            userId: session.userId,
            workspaceId: workspaceId,
            filename: file.name,
            content: content,
            fileSize: file.size,
        }).returning();

        return NextResponse.json({
            id: doc.id,
            filename: doc.filename,
            fileSize: doc.fileSize,
            createdAt: doc.createdAt,
            contentLength: content.length,
        });
    } catch (error) {
        console.error('Document upload error:', error);
        return NextResponse.json(
            { error: 'Failed to upload document' },
            { status: 500 }
        );
    }
}
