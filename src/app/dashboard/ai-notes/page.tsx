'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AiNotesPage() {
    const router = useRouter();
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<{
        title: string;
        videoId: string;
        notes: string;
    } | null>(null);
    const [copied, setCopied] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setResult(null);
        setLoading(true);

        try {
            const res = await fetch('/api/ai/summarize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Something went wrong');
                return;
            }

            setResult(data);
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async () => {
        if (result?.notes) {
            await navigator.clipboard.writeText(result.notes);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
    };

    const renderNotes = (text: string) => {
        const lines = text.split('\n');
        return lines.map((line, i) => {
            // Headers
            if (line.startsWith('## ')) {
                return <h2 key={i} className="notes-h2">{line.replace('## ', '')}</h2>;
            }
            if (line.startsWith('### ')) {
                return <h3 key={i} className="notes-h3">{line.replace('### ', '')}</h3>;
            }
            // Bold text in bullets
            if (line.startsWith('- **')) {
                const match = line.match(/^- \*\*(.+?)\*\*:?\s*(.*)/);
                if (match) {
                    return (
                        <li key={i} className="notes-li">
                            <strong>{match[1]}</strong>{match[2] ? `: ${match[2]}` : ''}
                        </li>
                    );
                }
            }
            // Regular bullets
            if (line.startsWith('- ')) {
                return <li key={i} className="notes-li">{line.replace('- ', '')}</li>;
            }
            // Empty lines
            if (line.trim() === '') {
                return <div key={i} className="notes-spacer" />;
            }
            // Regular text
            return <p key={i} className="notes-p">{line}</p>;
        });
    };

    return (
        <div className="dashboard-layout">
            <aside className="sidebar">
                <div className="sidebar-logo">📊 Dashboard</div>
                <nav className="sidebar-nav">
                    <a href="/dashboard" className="sidebar-link">
                        🏠 Home
                    </a>
                    <a href="/dashboard/ai-notes" className="sidebar-link active">
                        🤖 AI Notes
                    </a>
                    <a href="/dashboard" className="sidebar-link">
                        📈 Analytics
                    </a>
                    <a href="/dashboard" className="sidebar-link">
                        ⚙️ Settings
                    </a>
                </nav>
                <button onClick={handleLogout} className="btn btn-outline" style={{ marginTop: 'auto' }}>
                    Logout
                </button>
            </aside>

            <main className="main-content">
                <header className="page-header">
                    <h1 className="page-title">🤖 AI Study Notes</h1>
                    <p className="page-subtitle">Paste a YouTube link to generate comprehensive study notes</p>
                </header>

                {/* Input Section */}
                <div className="card fade-in ai-input-card">
                    <form onSubmit={handleSubmit} className="ai-form">
                        <div className="ai-input-wrapper">
                            <span className="ai-input-icon">🎬</span>
                            <input
                                type="text"
                                className="input ai-url-input"
                                placeholder="Paste YouTube video URL here..."
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                        <button
                            type="submit"
                            className="btn btn-primary ai-generate-btn"
                            disabled={loading || !url.trim()}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner" style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                                    Generating...
                                </>
                            ) : (
                                '✨ Generate Notes'
                            )}
                        </button>
                    </form>
                </div>

                {/* Error */}
                {error && (
                    <div className="alert alert-error fade-in" style={{ marginTop: '1rem' }}>
                        ❌ {error}
                    </div>
                )}

                {/* Loading Skeleton */}
                {loading && (
                    <div className="card fade-in ai-skeleton-card" style={{ marginTop: '1.5rem' }}>
                        <div className="ai-skeleton-header">
                            <div className="skeleton skeleton-title" />
                            <div className="skeleton skeleton-subtitle" />
                        </div>
                        <div className="ai-skeleton-body">
                            <div className="skeleton skeleton-line" />
                            <div className="skeleton skeleton-line short" />
                            <div className="skeleton skeleton-line" />
                            <div className="skeleton skeleton-line medium" />
                            <div className="skeleton skeleton-line" />
                            <div className="skeleton skeleton-line short" />
                        </div>
                        <p style={{ color: 'var(--muted)', textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem' }}>
                            ⏳ Extracting transcript and generating notes... This may take 15-30 seconds.
                        </p>
                    </div>
                )}

                {/* Results */}
                {result && (
                    <div className="fade-in" style={{ marginTop: '1.5rem' }}>
                        {/* Video Info */}
                        <div className="card ai-video-card">
                            <div className="ai-video-info">
                                <div className="ai-video-thumbnail">
                                    <img
                                        src={`https://img.youtube.com/vi/${result.videoId}/mqdefault.jpg`}
                                        alt={result.title}
                                        style={{ width: '100%', borderRadius: '10px' }}
                                    />
                                </div>
                                <div>
                                    <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{result.title}</h2>
                                    <span className="badge badge-success">✅ Notes Generated</span>
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="card ai-notes-card" style={{ marginTop: '1rem' }}>
                            <div className="ai-notes-header">
                                <h2 style={{ fontSize: '1.25rem' }}>📝 Study Notes</h2>
                                <button onClick={handleCopy} className="btn btn-outline ai-copy-btn">
                                    {copied ? '✅ Copied!' : '📋 Copy Notes'}
                                </button>
                            </div>
                            <div className="ai-notes-content">
                                {renderNotes(result.notes)}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
