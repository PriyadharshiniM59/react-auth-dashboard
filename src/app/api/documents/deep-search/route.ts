import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { documents } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { GoogleGenerativeAI } from '@google/generative-ai';
import FirecrawlApp from '@mendable/firecrawl-js';

// Split text into overlapping chunks
function chunkText(text: string, chunkSize = 500, overlap = 100): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    for (let i = 0; i < words.length; i += chunkSize - overlap) {
        const chunk = words.slice(i, i + chunkSize).join(' ');
        if (chunk.trim().length > 0) chunks.push(chunk);
        if (i + chunkSize >= words.length) break;
    }
    return chunks;
}

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
        if (matches) score += matches.length;
    }
    return score / Math.sqrt(chunk.split(/\s+/).length);
}

interface WebSource {
    url: string;
    title: string;
    snippet: string;
}

async function searchWithFirecrawl(query: string): Promise<{ webContext: string; webSources: WebSource[] }> {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
        return { webContext: '', webSources: [] };
    }

    try {
        const firecrawl = new FirecrawlApp({ apiKey });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const results: any = await firecrawl.search(query, {
            limit: 5,
            scrapeOptions: {
                formats: ['markdown'],
            },
        });

        if (!results.success || !results.data) {
            return { webContext: '', webSources: [] };
        }

        const webSources: WebSource[] = [];
        let webContext = '';

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const result of results.data as any[]) {
            if (result.url && result.metadata?.title) {
                webSources.push({
                    url: result.url,
                    title: result.metadata.title || 'Untitled',
                    snippet: (result.markdown || result.metadata.description || '').substring(0, 300),
                });
            }

            // Use scraped markdown content if available
            if (result.markdown) {
                const truncated = result.markdown.substring(0, 2000);
                webContext += `\n\n[Web Source: ${result.metadata?.title || result.url}]\n${truncated}`;
            }
        }

        return { webContext, webSources };
    } catch (error) {
        console.error('Firecrawl search error:', error);
        return { webContext: '', webSources: [] };
    }
}

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { question, workspaceId } = await request.json();

        if (!question || question.trim().length < 3) {
            return NextResponse.json(
                { error: 'Please ask a more specific question.' },
                { status: 400 }
            );
        }

        // Step 1: Firecrawl web search
        const { webContext, webSources } = await searchWithFirecrawl(question);

        // Step 2: Get document context (if workspace provided)
        let docContext = '';
        const docSources: { filename: string; chunks: { index: number; preview: string }[] }[] = [];

        if (workspaceId) {
            const workspaceDocs = await db
                .select({ id: documents.id, filename: documents.filename, content: documents.content })
                .from(documents)
                .where(and(eq(documents.workspaceId, workspaceId), eq(documents.userId, session.userId)));

            if (workspaceDocs.length > 0) {
                // Chunk and score across all docs
                interface ScoredChunk { chunk: string; score: number; filename: string; index: number }
                const allScored: ScoredChunk[] = [];

                for (const doc of workspaceDocs) {
                    const chunks = chunkText(doc.content);
                    chunks.forEach((chunk, i) => {
                        allScored.push({
                            chunk,
                            score: scoreChunk(chunk, question),
                            filename: doc.filename,
                            index: i,
                        });
                    });
                }

                allScored.sort((a, b) => b.score - a.score);
                const topChunks = allScored.slice(0, 5);

                docContext = topChunks
                    .map((c, i) => `[Doc Section ${i + 1} from "${c.filename}"]\n${c.chunk}`)
                    .join('\n\n');

                // Group by source document
                const sourceMap = new Map<string, { filename: string; chunks: { index: number; preview: string }[] }>();
                for (const chunk of topChunks) {
                    if (!sourceMap.has(chunk.filename)) {
                        sourceMap.set(chunk.filename, { filename: chunk.filename, chunks: [] });
                    }
                    sourceMap.get(chunk.filename)!.chunks.push({
                        index: chunk.index + 1,
                        preview: chunk.chunk.substring(0, 200) + (chunk.chunk.length > 200 ? '...' : ''),
                    });
                }
                docSources.push(...sourceMap.values());
            }
        }

        // Step 3: Combine and answer with Gemini
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY is not configured');
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];

        let combinedContext = '';
        if (docContext) combinedContext += `**Document Knowledge:**\n${docContext}\n\n`;
        if (webContext) combinedContext += `**Web Search Results:**\n${webContext}\n`;

        if (!combinedContext) {
            return NextResponse.json({
                error: 'No results found from documents or web search.',
            }, { status: 404 });
        }

        const prompt = `You are an intelligent research assistant that combines knowledge from uploaded documents AND web search results to provide comprehensive answers.

${combinedContext}

---

**User's Question:** ${question}

---

Please provide a thorough, well-structured answer combining both document knowledge and web search results where available. Clearly indicate which information comes from uploaded documents vs. web sources. Format your answer with markdown for readability. Be comprehensive but concise.`;

        let answer = '';
        for (const modelName of models) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent(prompt);
                answer = result.response.text();
                break;
            } catch (err) {
                const message = err instanceof Error ? err.message : '';
                if (message.includes('429') || message.includes('quota')) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    continue;
                }
                throw err;
            }
        }

        if (!answer) {
            throw new Error('All AI models are currently rate-limited. Please try again in a minute.');
        }

        return NextResponse.json({
            answer,
            docSources,
            webSources,
            hasDocContext: !!docContext,
            hasWebContext: !!webContext,
        });
    } catch (error) {
        console.error('Deep search error:', error);
        const message = error instanceof Error ? error.message : 'Deep search failed';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
