import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Innertube } from 'youtubei.js';

function extractVideoId(url: string): string | null {
    const patterns = [
        /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
        /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

interface CaptionTrack {
    language_code: string;
    base_url: string;
    name?: { text?: string };
}

async function getTranscript(videoId: string): Promise<{ title: string; transcript: string }> {
    // Use Innertube to get video info and caption track URLs
    const yt = await Innertube.create({ generate_session_locally: true });
    const info = await yt.getInfo(videoId);
    const title = info.basic_info.title || 'Untitled Video';

    // Get caption tracks from player response
    const captions = info.captions;
    if (!captions || !captions.caption_tracks || captions.caption_tracks.length === 0) {
        throw new Error('No captions/subtitles available for this video');
    }

    const tracks = captions.caption_tracks as CaptionTrack[];

    // Prefer English, fall back to first available
    const enTrack = tracks.find(t => t.language_code === 'en')
        || tracks.find(t => t.language_code?.startsWith('en'))
        || tracks[0];

    if (!enTrack?.base_url) {
        throw new Error('No caption URL found');
    }

    // Fetch the actual transcript XML from the caption URL
    const captionResponse = await fetch(enTrack.base_url);
    if (!captionResponse.ok) {
        throw new Error('Failed to fetch captions');
    }

    const xml = await captionResponse.text();
    if (!xml || xml.length === 0) {
        throw new Error('Caption data is empty');
    }

    // Parse XML to extract text segments
    const textMatches = xml.match(/<text[^>]*>([^<]*)<\/text>/g);
    if (!textMatches || textMatches.length === 0) {
        throw new Error('No text found in captions');
    }

    const transcript = textMatches
        .map(segment => {
            const match = segment.match(/<text[^>]*>([^<]*)<\/text>/);
            if (!match) return '';
            return match[1]
                .replace(/&amp;#39;/g, "'")
                .replace(/&amp;quot;/g, '"')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/\n/g, ' ')
                .trim();
        })
        .filter(text => text !== '')
        .join(' ');

    if (!transcript.trim()) {
        throw new Error('Transcript is empty');
    }

    return { title, transcript };
}

async function summarizeWithGemini(title: string, transcript: string): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];

    const prompt = `You are an expert study notes generator. Analyze the following YouTube video transcript and create comprehensive, well-structured study notes.

**Video Title:** ${title}

**Transcript:**
${transcript.substring(0, 30000)}

---

Generate the output in the following format (use plain text with markdown-like formatting):

## 📌 Video Summary
Write a concise 3-4 sentence summary of the video's main message.

## 🎯 Key Takeaways
- List 5-8 key points from the video
- Each point should be clear and actionable

## 📝 Detailed Study Notes

### Topic 1: [Name]
- Detailed explanation
- Sub-points with examples

### Topic 2: [Name]
- Continue for all major topics covered

## 💡 Important Quotes or Facts
- List any notable quotes, statistics, or facts mentioned

## 🔗 Related Topics to Explore
- Suggest 3-5 related topics the viewer might want to study next

Make the notes clear, concise, and student-friendly. Use bullet points for readability.`;

    for (const modelName of models) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(prompt);
            const response = result.response;
            return response.text();
        } catch (err) {
            const message = err instanceof Error ? err.message : '';
            if (message.includes('429') || message.includes('quota')) {
                console.log(`Model ${modelName} rate limited, trying next...`);
                // Wait 2 seconds before trying next model
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
        const { url } = await request.json();

        if (!url) {
            return NextResponse.json(
                { error: 'YouTube URL is required' },
                { status: 400 }
            );
        }

        const videoId = extractVideoId(url);
        if (!videoId) {
            return NextResponse.json(
                { error: 'Invalid YouTube URL. Please paste a valid YouTube video link.' },
                { status: 400 }
            );
        }

        // Extract transcript
        let videoData;
        try {
            videoData = await getTranscript(videoId);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            return NextResponse.json(
                { error: `Could not extract transcript: ${message}` },
                { status: 422 }
            );
        }

        // Generate study notes with AI
        const notes = await summarizeWithGemini(videoData.title, videoData.transcript);

        return NextResponse.json({
            title: videoData.title,
            videoId,
            notes,
        });
    } catch (error) {
        console.error('AI Summarize error:', error);
        const message = error instanceof Error ? error.message : 'Failed to generate notes';
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
