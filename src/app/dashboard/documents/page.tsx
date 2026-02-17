'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Doc {
    id: number;
    filename: string;
    fileSize: number;
    createdAt: string;
}

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    chunks?: { index: number; preview: string }[];
}

export default function DocumentsPage() {
    const router = useRouter();
    const [docs, setDocs] = useState<Doc[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState<Doc | null>(null);
    const [question, setQuestion] = useState('');
    const [chat, setChat] = useState<ChatMessage[]>([]);
    const [asking, setAsking] = useState(false);
    const [error, setError] = useState('');
    const [uploadSuccess, setUploadSuccess] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const fetchDocs = useCallback(async () => {
        try {
            const res = await fetch('/api/documents');
            if (res.status === 401) {
                router.push('/login');
                return;
            }
            const data = await res.json();
            setDocs(data.documents || []);
        } catch (err) {
            console.error('Error fetching documents:', err);
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        fetchDocs();
    }, [fetchDocs]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chat]);

    const handleUpload = async (file: File) => {
        setError('');
        setUploadSuccess('');
        setUploading(true);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/documents/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Upload failed');
                return;
            }

            setUploadSuccess(`"${file.name}" uploaded successfully!`);
            setTimeout(() => setUploadSuccess(''), 4000);
            fetchDocs();
        } catch {
            setError('Failed to upload file');
        } finally {
            setUploading(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleUpload(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleUpload(file);
    };

    const handleDelete = async (docId: number) => {
        try {
            const res = await fetch('/api/documents', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentId: docId }),
            });

            if (res.ok) {
                setDocs(docs.filter(d => d.id !== docId));
                if (selectedDoc?.id === docId) {
                    setSelectedDoc(null);
                    setChat([]);
                }
            }
        } catch (err) {
            console.error('Delete failed:', err);
        }
    };

    const handleAsk = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDoc || !question.trim() || asking) return;

        const userQ = question.trim();
        setQuestion('');
        setChat(prev => [...prev, { role: 'user', content: userQ }]);
        setAsking(true);

        try {
            const res = await fetch('/api/documents/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentId: selectedDoc.id, question: userQ }),
            });

            const data = await res.json();

            if (!res.ok) {
                setChat(prev => [...prev, { role: 'assistant', content: `⚠️ ${data.error || 'Failed to get answer'}` }]);
            } else {
                setChat(prev => [...prev, { role: 'assistant', content: data.answer, chunks: data.chunks }]);
            }
        } catch {
            setChat(prev => [...prev, { role: 'assistant', content: '⚠️ Network error. Please try again.' }]);
        } finally {
            setAsking(false);
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
    };

    // Simple markdown-like rendering for AI answers
    const renderAnswer = (text: string) => {
        const lines = text.split('\n');
        return lines.map((line, i) => {
            if (line.startsWith('### ')) return <h4 key={i} className="doc-answer-h4">{line.slice(4)}</h4>;
            if (line.startsWith('## ')) return <h3 key={i} className="doc-answer-h3">{line.slice(3)}</h3>;
            if (line.startsWith('# ')) return <h2 key={i} className="doc-answer-h2">{line.slice(2)}</h2>;
            if (line.startsWith('- **') || line.startsWith('* **')) {
                const parts = line.slice(2).split('**');
                return (
                    <li key={i} className="doc-answer-li">
                        {parts.map((part, j) =>
                            j % 2 === 1 ? <strong key={j}>{part}</strong> : part
                        )}
                    </li>
                );
            }
            if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="doc-answer-li">{line.slice(2)}</li>;
            if (line.trim() === '') return <div key={i} className="doc-spacer" />;
            // Bold text within paragraphs
            const boldParts = line.split(/\*\*(.*?)\*\*/g);
            return (
                <p key={i} className="doc-answer-p">
                    {boldParts.map((part, j) =>
                        j % 2 === 1 ? <strong key={j}>{part}</strong> : part
                    )}
                </p>
            );
        });
    };

    if (loading) {
        return (
            <div className="pending-container">
                <div className="spinner" style={{ width: '40px', height: '40px' }}></div>
            </div>
        );
    }

    return (
        <div className="dashboard-layout">
            <aside className="sidebar">
                <div className="sidebar-logo">📄 Doc Q&A</div>
                <nav className="sidebar-nav">
                    <a href="/dashboard" className="sidebar-link">
                        🏠 Home
                    </a>
                    <a href="/dashboard/ai-notes" className="sidebar-link">
                        🤖 AI Notes
                    </a>
                    <a href="/dashboard/documents" className="sidebar-link active">
                        📄 Doc Q&A
                    </a>
                </nav>
                <button onClick={handleLogout} className="btn btn-outline" style={{ marginTop: 'auto' }}>
                    Logout
                </button>
            </aside>

            <main className="main-content">
                <header className="page-header">
                    <h1 className="page-title">📄 Document Q&A</h1>
                    <p className="page-subtitle">Upload documents and ask questions — powered by AI</p>
                </header>

                {/* Upload Section */}
                <div className="card fade-in" style={{ marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>📤 Upload Document</h2>

                    <div
                        className={`doc-dropzone ${dragOver ? 'doc-dropzone-active' : ''}`}
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.txt"
                            onChange={handleFileSelect}
                            style={{ display: 'none' }}
                        />
                        {uploading ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div className="spinner"></div>
                                <span>Uploading & extracting text...</span>
                            </div>
                        ) : (
                            <>
                                <div className="doc-dropzone-icon">📁</div>
                                <p className="doc-dropzone-text">
                                    Drag & drop a <strong>PDF</strong> or <strong>TXT</strong> file here, or click to browse
                                </p>
                                <p className="doc-dropzone-hint">Max file size: 10MB</p>
                            </>
                        )}
                    </div>

                    {error && <div className="alert alert-error" style={{ marginTop: '1rem', marginBottom: 0 }}>{error}</div>}
                    {uploadSuccess && <div className="alert alert-success" style={{ marginTop: '1rem', marginBottom: 0 }}>{uploadSuccess}</div>}
                </div>

                {/* Document List + Q&A Section */}
                <div className="doc-layout">
                    {/* Document List */}
                    <div className="doc-list-section">
                        <div className="card fade-in">
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
                                📚 Your Documents ({docs.length})
                            </h2>

                            {docs.length === 0 ? (
                                <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '2rem 0' }}>
                                    No documents yet. Upload a PDF or TXT file to get started!
                                </p>
                            ) : (
                                <div className="doc-list">
                                    {docs.map(doc => (
                                        <div
                                            key={doc.id}
                                            className={`doc-item ${selectedDoc?.id === doc.id ? 'doc-item-selected' : ''}`}
                                            onClick={() => {
                                                setSelectedDoc(doc);
                                                setChat([]);
                                            }}
                                        >
                                            <div className="doc-item-icon">
                                                {doc.filename.endsWith('.pdf') ? '📕' : '📝'}
                                            </div>
                                            <div className="doc-item-info">
                                                <div className="doc-item-name" title={doc.filename}>
                                                    {doc.filename}
                                                </div>
                                                <div className="doc-item-meta">
                                                    {formatSize(doc.fileSize)} • {new Date(doc.createdAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                            <button
                                                className="doc-delete-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(doc.id);
                                                }}
                                                title="Delete document"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Q&A Chat */}
                    <div className="doc-chat-section">
                        <div className="card fade-in doc-chat-card">
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
                                💬 Ask Questions
                                {selectedDoc && (
                                    <span className="doc-chat-filename"> — {selectedDoc.filename}</span>
                                )}
                            </h2>

                            {!selectedDoc ? (
                                <div className="doc-chat-empty">
                                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👈</div>
                                    <p>Select a document from the list to start asking questions</p>
                                </div>
                            ) : (
                                <>
                                    <div className="doc-chat-messages">
                                        {chat.length === 0 && (
                                            <div className="doc-chat-welcome">
                                                <p>🎯 Ask anything about <strong>{selectedDoc.filename}</strong></p>
                                                <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.5rem' }}>
                                                    The AI will find relevant sections and generate an answer.
                                                </p>
                                            </div>
                                        )}
                                        {chat.map((msg, i) => (
                                            <div key={i} className={`doc-chat-msg doc-chat-msg-${msg.role}`}>
                                                <div className="doc-chat-msg-icon">
                                                    {msg.role === 'user' ? '👤' : '🤖'}
                                                </div>
                                                <div className="doc-chat-msg-content">
                                                    {msg.role === 'user' ? (
                                                        <p>{msg.content}</p>
                                                    ) : (
                                                        <div className="doc-answer-body">
                                                            {renderAnswer(msg.content)}
                                                        </div>
                                                    )}
                                                    {msg.chunks && msg.chunks.length > 0 && (
                                                        <details className="doc-sources">
                                                            <summary>📎 Source sections ({msg.chunks.length})</summary>
                                                            <div className="doc-sources-list">
                                                                {msg.chunks.map(c => (
                                                                    <div key={c.index} className="doc-source-item">
                                                                        <span className="doc-source-label">Section {c.index}</span>
                                                                        <p>{c.preview}</p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </details>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {asking && (
                                            <div className="doc-chat-msg doc-chat-msg-assistant">
                                                <div className="doc-chat-msg-icon">🤖</div>
                                                <div className="doc-chat-msg-content">
                                                    <div className="doc-thinking">
                                                        <div className="spinner"></div>
                                                        <span>Analyzing document & generating answer...</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        <div ref={chatEndRef} />
                                    </div>

                                    <form onSubmit={handleAsk} className="doc-chat-input-form">
                                        <input
                                            type="text"
                                            className="input doc-chat-input"
                                            placeholder="Ask a question about this document..."
                                            value={question}
                                            onChange={(e) => setQuestion(e.target.value)}
                                            disabled={asking}
                                        />
                                        <button
                                            type="submit"
                                            className="btn btn-primary doc-ask-btn"
                                            disabled={asking || !question.trim()}
                                        >
                                            {asking ? '...' : '🔍 Ask'}
                                        </button>
                                    </form>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
