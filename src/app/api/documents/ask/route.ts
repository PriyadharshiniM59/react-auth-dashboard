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
        .filter(w => w.length > 2) // skip short words like "a", "is", "to"
        .filter(w => !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'has', 'how', 'who', 'what', 'when', 'where', 'which', 'why', 'this', 'that', 'with', 'from', 'have', 'will', 'does', 'about'].includes(w));

    if (questionWords.length === 0) return 0;

    let score = 0;
    for (const word of questionWords) {
        // Count occurrences
        const regex = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const matches = chunkLower.match(regex);
        if (matches) {
            score += matches.length;
        }
    }

    // Normalize by chunk length to avoid bias toward longer chunks
    return score / Math.sqrt(chunk.split(/\s+/).length);
}

// Get the most relevant chunks for a question
function getRelevantChunks(content: string, question: string, topK = 5): string[] {
    const chunks = chunkText(content);

    const scored = chunks.map((chunk, index) => ({
        chunk,
        score: scoreChunk(chunk, question),
        index,
    }));

    // Sort by score descending, take top K
    scored.sort((a, b) => b.score - a.score);
    const topChunks = scored.slice(0, topK);

    // Re-order by original position for coherent context
    topChunks.sort((a, b) => a.index - b.index);

    return topChunks.map(c => c.chunk);
}

async function answerWithGemini(question: string, context: string, filename: string): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];

    const prompt = `You are a helpful document Q&A assistant. You answer questions based ONLY on the provided document context. If the answer cannot be found in the context, say so clearly.

**Document:** ${filename}

**Relevant sections from the document:**
${context}

---

**User's Question:** ${question}

---

Please provide a clear, well-structured answer based on the document content above. If the document doesn't contain enough information to fully answer the question, mention what you found and note what's missing. Format your answer with markdown for readability.`;

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

        const { documentId, question } = await request.json();

        if (!documentId || !question) {
            return NextResponse.json(
                { error: 'Document ID and question are required' },
                { status: 400 }
            );
        }

        if (question.trim().length < 3) {
            return NextResponse.json(
                { error: 'Question is too short. Please ask a more specific question.' },
                { status: 400 }
            );
        }

        // Fetch the document (only if owned by user)
        const [doc] = await db
            .select()
            .from(documents)
            .where(and(eq(documents.id, documentId), eq(documents.userId, session.userId)))
            .limit(1);

        if (!doc) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        // RAG: get relevant chunks
        const relevantChunks = getRelevantChunks(doc.content, question);
        const context = relevantChunks.map((c, i) => `[Section ${i + 1}]\n${c}`).join('\n\n');

        // Generate answer with Gemini
        const answer = await answerWithGemini(question, context, doc.filename);

        return NextResponse.json({
            answer,
            chunks: relevantChunks.map((chunk, i) => ({
                index: i + 1,
                preview: chunk.substring(0, 200) + (chunk.length > 200 ? '...' : ''),
            })),
        });
    } catch (error) {
        console.error('Document Q&A error:', error);
        const message = error instanceof Error ? error.message : 'Failed to answer question';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
