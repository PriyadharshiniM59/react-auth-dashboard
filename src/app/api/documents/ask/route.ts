import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { documents } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Split text into overlapping chunks for RAG
function chunkText(text: string, chunkSize = 500, overlap = 100): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];

    for (let i = 0; i < words.length; i += chunkSize - overlap) {
        const chunk = words.slice(i, i + chunkSize).join(' ');
        if (chunk.trim().length > 0) {
            chunks.push(chunk);
        }
        if (i + chunkSize >= words.length) break;
    }

    return chunks;
}

// Simple TF-based relevance scoring
function scoreChunk(chunk: string, question: string): number {
    const chunkLower = chunk.toLowerCase();
    const questionWords = question
        .toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 2)
        .filter(w => !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'has', 'how', 'who', 'what', 'when', 'where', 'which', 'why', 'this', 'that', 'with', 'from', 'have', 'will', 'does', 'about'].includes(w));

    if (questionWords.length === 0) return 0;

    let score = 0;
    for (const word of questionWords) {
        const regex = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const matches = chunkLower.match(regex);
        if (matches) {
            score += matches.length;
        }
    }

    return score / Math.sqrt(chunk.split(/\s+/).length);
}

interface ScoredChunk {
    chunk: string;
    score: number;
    index: number;
    filename: string;
    documentId: number;
}

// Get the most relevant chunks across multiple documents
function getRelevantChunksMultiDoc(
    docs: { id: number; filename: string; content: string }[],
    question: string,
    topK = 8
): ScoredChunk[] {
    const allScored: ScoredChunk[] = [];

    for (const doc of docs) {
        const chunks = chunkText(doc.content);
        for (let i = 0; i < chunks.length; i++) {
            allScored.push({
                chunk: chunks[i],
                score: scoreChunk(chunks[i], question),
                index: i,
                filename: doc.filename,
                documentId: doc.id,
            });
        }
    }

    // Sort by score descending, take top K
    allScored.sort((a, b) => b.score - a.score);
    return allScored.slice(0, topK);
}

async function answerWithGemini(
    question: string,
    context: string,
    sourceInfo: string
): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];

    const prompt = `You are a helpful multi-document Q&A assistant. You answer questions based ONLY on the provided document context. If the answer cannot be found in the context, say so clearly.

**Documents in workspace:** ${sourceInfo}

**Relevant sections from the documents:**
${context}

---

**User's Question:** ${question}

---

Please provide a clear, well-structured answer based on the document content above. When citing information, mention which document it came from. If the documents don't contain enough information to fully answer the question, mention what you found and note what's missing. Format your answer with markdown for readability.`;

    for (const modelName of models) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (err) {
            const message = err instanceof Error ? err.message : '';
            if (message.includes('429') || message.includes('quota')) {
                console.log(`Model ${modelName} rate limited, trying next...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                continue;
            }
            throw err;
        }
    }

    throw new Error('All AI models are currently rate-limited. Please try again in a minute.');
}

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { workspaceId, documentId, question } = await request.json();

        if (!question || question.trim().length < 3) {
            return NextResponse.json(
                { error: 'Please ask a more specific question.' },
                { status: 400 }
            );
        }

        let docsToSearch: { id: number; filename: string; content: string }[] = [];

        if (workspaceId) {
            // Cross-document: fetch ALL documents in the workspace
            docsToSearch = await db
                .select({ id: documents.id, filename: documents.filename, content: documents.content })
                .from(documents)
                .where(and(eq(documents.workspaceId, workspaceId), eq(documents.userId, session.userId)));
        } else if (documentId) {
            // Single document mode (backwards compatible)
            const [doc] = await db
                .select({ id: documents.id, filename: documents.filename, content: documents.content })
                .from(documents)
                .where(and(eq(documents.id, documentId), eq(documents.userId, session.userId)))
                .limit(1);

            if (doc) docsToSearch = [doc];
        }

        if (docsToSearch.length === 0) {
            return NextResponse.json({ error: 'No documents found' }, { status: 404 });
        }

        // RAG: get relevant chunks across all documents
        const relevantChunks = getRelevantChunksMultiDoc(docsToSearch, question);

        const context = relevantChunks
            .map((c, i) => `[Section ${i + 1} from "${c.filename}"]\n${c.chunk}`)
            .join('\n\n');

        const sourceInfo = docsToSearch.map(d => d.filename).join(', ');

        // Generate answer with Gemini
        const answer = await answerWithGemini(question, context, sourceInfo);

        // Group chunks by source document
        const sourceMap = new Map<string, { filename: string; chunks: { index: number; preview: string }[] }>();
        for (const chunk of relevantChunks) {
            if (!sourceMap.has(chunk.filename)) {
                sourceMap.set(chunk.filename, { filename: chunk.filename, chunks: [] });
            }
            sourceMap.get(chunk.filename)!.chunks.push({
                index: chunk.index + 1,
                preview: chunk.chunk.substring(0, 200) + (chunk.chunk.length > 200 ? '...' : ''),
            });
        }

        return NextResponse.json({
            answer,
            sources: Array.from(sourceMap.values()),
            totalDocuments: docsToSearch.length,
        });
    } catch (error) {
        console.error('Document Q&A error:', error);
        const message = error instanceof Error ? error.message : 'Failed to answer question';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
