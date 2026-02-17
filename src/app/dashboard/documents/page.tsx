'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Workspace {
    id: number;
    name: string;
    description: string | null;
    docCount: number;
    createdAt: string;
}

interface Doc {
    id: number;
    filename: string;
    fileSize: number;
    createdAt: string;
    workspaceId: number | null;
}

interface DocSource {
    filename: string;
    chunks: { index: number; preview: string }[];
}

interface WebSource {
    url: string;
    title: string;
    snippet: string;
}

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    docSources?: DocSource[];
    webSources?: WebSource[];
}

export default function DocumentsPage() {
    const router = useRouter();

    // Workspace state
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
    const [showCreateWS, setShowCreateWS] = useState(false);
    const [newWSName, setNewWSName] = useState('');
    const [newWSDesc, setNewWSDesc] = useState('');
    const [creatingWS, setCreatingWS] = useState(false);

    // Document state
    const [docs, setDocs] = useState<Doc[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);

    // Chat state
    const [question, setQuestion] = useState('');
    const [chat, setChat] = useState<ChatMessage[]>([]);
    const [asking, setAsking] = useState(false);
    const [deepSearch, setDeepSearch] = useState(false);

    // UI state
    const [error, setError] = useState('');
    const [uploadSuccess, setUploadSuccess] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Fetch workspaces
    const fetchWorkspaces = useCallback(async () => {
        try {
            const res = await fetch('/api/workspaces');
            if (res.status === 401) { router.push('/login'); return; }
            const data = await res.json();
            setWorkspaces(data.workspaces || []);
        } catch (err) {
            console.error('Error fetching workspaces:', err);
        } finally {
            setLoading(false);
        }
    }, [router]);

    // Fetch docs for selected workspace
    const fetchDocs = useCallback(async () => {
        if (!selectedWorkspace) { setDocs([]); return; }
        try {
            const res = await fetch(`/api/documents?workspaceId=${selectedWorkspace.id}`);
            const data = await res.json();
            setDocs(data.documents || []);
        } catch (err) {
            console.error('Error fetching documents:', err);
        }
    }, [selectedWorkspace]);

    useEffect(() => { fetchWorkspaces(); }, [fetchWorkspaces]);
    useEffect(() => { fetchDocs(); }, [fetchDocs]);
    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat]);

    // Create workspace
    const handleCreateWorkspace = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newWSName.trim() || creatingWS) return;
        setCreatingWS(true);
        try {
            const res = await fetch('/api/workspaces', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newWSName.trim(), description: newWSDesc.trim() || null }),
            });
            if (res.ok) {
                setNewWSName('');
                setNewWSDesc('');
                setShowCreateWS(false);
                fetchWorkspaces();
            }
        } catch { setError('Failed to create workspace'); }
        finally { setCreatingWS(false); }
    };

    // Delete workspace
    const handleDeleteWorkspace = async (wsId: number) => {
        if (!confirm('Delete this workspace and all its documents?')) return;
        try {
            await fetch('/api/workspaces', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workspaceId: wsId }),
            });
            if (selectedWorkspace?.id === wsId) {
                setSelectedWorkspace(null);
                setDocs([]);
                setChat([]);
            }
            fetchWorkspaces();
        } catch { setError('Failed to delete workspace'); }
    };

    // Upload file
    const handleUpload = async (file: File) => {
        if (!selectedWorkspace) { setError('Please select a workspace first'); return; }
        setError('');
        setUploadSuccess('');
        setUploading(true);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('workspaceId', selectedWorkspace.id.toString());

        try {
            const res = await fetch('/api/documents/upload', { method: 'POST', body: formData });
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Upload failed'); return; }
            setUploadSuccess(`"${file.name}" uploaded!`);
            setTimeout(() => setUploadSuccess(''), 4000);
            fetchDocs();
            fetchWorkspaces(); // refresh doc count
        } catch { setError('Failed to upload file'); }
        finally { setUploading(false); }
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

    // Delete document
    const handleDelete = async (docId: number) => {
        try {
            const res = await fetch('/api/documents', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentId: docId }),
            });
            if (res.ok) {
                setDocs(docs.filter(d => d.id !== docId));
                fetchWorkspaces();
            }
        } catch { console.error('Delete failed'); }
    };

    // Ask question
    const handleAsk = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedWorkspace || !question.trim() || asking) return;

        const userQ = question.trim();
        setQuestion('');
        setChat(prev => [...prev, { role: 'user', content: userQ }]);
        setAsking(true);

        try {
            const endpoint = deepSearch ? '/api/documents/deep-search' : '/api/documents/ask';
            const body = deepSearch
                ? { question: userQ, workspaceId: selectedWorkspace.id }
                : { workspaceId: selectedWorkspace.id, question: userQ };

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (!res.ok) {
                setChat(prev => [...prev, { role: 'assistant', content: `⚠️ ${data.error || 'Failed to get answer'}` }]);
            } else {
                setChat(prev => [...prev, {
                    role: 'assistant',
                    content: data.answer,
                    docSources: data.docSources || data.sources || [],
                    webSources: data.webSources || [],
                }]);
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

    // Simple markdown renderer
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
            if (line.match(/^\d+\.\s/)) {
                const numMatch = line.match(/^\d+\.\s(.*)/);
                if (numMatch) {
                    const boldParts = numMatch[1].split(/\*\*(.*?)\*\*/g);
                    return (
                        <li key={i} className="doc-answer-li" style={{ listStyleType: 'decimal' }}>
                            {boldParts.map((part, j) =>
                                j % 2 === 1 ? <strong key={j}>{part}</strong> : part
                            )}
                        </li>
                    );
                }
            }
            if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="doc-answer-li">{line.slice(2)}</li>;
            if (line.trim() === '') return <div key={i} className="doc-spacer" />;
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
                <div className="sidebar-logo">🧠 AI Workspace</div>
                <nav className="sidebar-nav">
                    <a href="/dashboard" className="sidebar-link">🏠 Home</a>
                    <a href="/dashboard/ai-notes" className="sidebar-link">🤖 AI Notes</a>
                    <a href="/dashboard/documents" className="sidebar-link active">📄 Doc Q&A</a>
                </nav>
                <button onClick={handleLogout} className="btn btn-outline" style={{ marginTop: 'auto' }}>
                    Logout
                </button>
            </aside>

            <main className="main-content">
                <header className="page-header">
                    <h1 className="page-title">🧠 Multi-Document AI Workspace</h1>
                    <p className="page-subtitle">
                        Create workspaces, upload documents, and ask questions across all files — with optional deep web search
                    </p>
                </header>

                {/* Workspace Selector */}
                <div className="card fade-in" style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>📂 Workspaces</h2>
                        <button
                            className="btn btn-primary"
                            style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                            onClick={() => setShowCreateWS(!showCreateWS)}
                        >
                            {showCreateWS ? '✕ Cancel' : '+ New Workspace'}
                        </button>
                    </div>

                    {showCreateWS && (
                        <form onSubmit={handleCreateWorkspace} className="ws-create-form">
                            <input
                                type="text"
                                className="input"
                                placeholder="Workspace name..."
                                value={newWSName}
                                onChange={e => setNewWSName(e.target.value)}
                                maxLength={100}
                                autoFocus
                            />
                            <input
                                type="text"
                                className="input"
                                placeholder="Description (optional)..."
                                value={newWSDesc}
                                onChange={e => setNewWSDesc(e.target.value)}
                                style={{ marginTop: '0.5rem' }}
                            />
                            <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }} disabled={creatingWS || !newWSName.trim()}>
                                {creatingWS ? 'Creating...' : '✓ Create'}
                            </button>
                        </form>
                    )}

                    {workspaces.length === 0 && !showCreateWS ? (
                        <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '1.5rem 0' }}>
                            No workspaces yet. Create one to get started!
                        </p>
                    ) : (
                        <div className="ws-grid">
                            {workspaces.map(ws => (
                                <div
                                    key={ws.id}
                                    className={`ws-card ${selectedWorkspace?.id === ws.id ? 'ws-card-selected' : ''}`}
                                    onClick={() => {
                                        setSelectedWorkspace(ws);
                                        setChat([]);
                                    }}
                                >
                                    <div className="ws-card-header">
                                        <span className="ws-card-icon">📁</span>
                                        <span className="ws-card-name">{ws.name}</span>
                                        <button
                                            className="doc-delete-btn"
                                            onClick={(e) => { e.stopPropagation(); handleDeleteWorkspace(ws.id); }}
                                            title="Delete workspace"
                                        >🗑️</button>
                                    </div>
                                    {ws.description && <p className="ws-card-desc">{ws.description}</p>}
                                    <div className="ws-card-meta">
                                        <span>📄 {ws.docCount} doc{ws.docCount !== 1 ? 's' : ''}</span>
                                        <span>{new Date(ws.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Selected Workspace Content */}
                {selectedWorkspace && (
                    <>
                        {/* Upload Section */}
                        <div className="card fade-in" style={{ marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
                                📤 Upload to &quot;{selectedWorkspace.name}&quot;
                            </h2>
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

                        {/* Documents + Q&A */}
                        <div className="doc-layout">
                            {/* Document List */}
                            <div className="doc-list-section">
                                <div className="card fade-in">
                                    <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
                                        📚 Documents ({docs.length})
                                    </h2>
                                    {docs.length === 0 ? (
                                        <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '2rem 0' }}>
                                            No documents in this workspace yet.
                                        </p>
                                    ) : (
                                        <div className="doc-list">
                                            {docs.map(doc => (
                                                <div key={doc.id} className="doc-item">
                                                    <div className="doc-item-icon">
                                                        {doc.filename.endsWith('.pdf') ? '📕' : '📝'}
                                                    </div>
                                                    <div className="doc-item-info">
                                                        <div className="doc-item-name" title={doc.filename}>{doc.filename}</div>
                                                        <div className="doc-item-meta">
                                                            {formatSize(doc.fileSize)} • {new Date(doc.createdAt).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                    <button
                                                        className="doc-delete-btn"
                                                        onClick={() => handleDelete(doc.id)}
                                                        title="Delete document"
                                                    >🗑️</button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Q&A Chat */}
                            <div className="doc-chat-section">
                                <div className="card fade-in doc-chat-card">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                                            💬 Ask Questions
                                            <span className="doc-chat-filename"> — {selectedWorkspace.name}</span>
                                        </h2>
                                        <div className="deep-search-toggle">
                                            <button
                                                className={`toggle-btn ${!deepSearch ? 'toggle-btn-active' : ''}`}
                                                onClick={() => setDeepSearch(false)}
                                            >
                                                📄 Docs Only
                                            </button>
                                            <button
                                                className={`toggle-btn ${deepSearch ? 'toggle-btn-active toggle-btn-deep' : ''}`}
                                                onClick={() => setDeepSearch(true)}
                                            >
                                                🌐 Deep Search
                                            </button>
                                        </div>
                                    </div>

                                    {deepSearch && (
                                        <div className="deep-search-badge">
                                            🌐 Deep Search is ON — AI will search the web + your documents
                                        </div>
                                    )}

                                    <div className="doc-chat-messages">
                                        {chat.length === 0 && (
                                            <div className="doc-chat-welcome">
                                                <p>🎯 Ask anything about <strong>{selectedWorkspace.name}</strong></p>
                                                <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.5rem' }}>
                                                    {deepSearch
                                                        ? 'AI will search the web and combine with your document knowledge.'
                                                        : `AI will search across ${docs.length} document${docs.length !== 1 ? 's' : ''} in this workspace.`
                                                    }
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
                                                        <div className="doc-answer-body">{renderAnswer(msg.content)}</div>
                                                    )}

                                                    {/* Document Sources */}
                                                    {msg.docSources && msg.docSources.length > 0 && (
                                                        <details className="doc-sources">
                                                            <summary>📄 Document sources ({msg.docSources.length} file{msg.docSources.length !== 1 ? 's' : ''})</summary>
                                                            <div className="doc-sources-list">
                                                                {msg.docSources.map((src, si) => (
                                                                    <div key={si} className="doc-source-item">
                                                                        <span className="doc-source-label">📄 {src.filename}</span>
                                                                        {src.chunks.map(c => (
                                                                            <p key={c.index} style={{ fontSize: '0.8rem', opacity: 0.8 }}>{c.preview}</p>
                                                                        ))}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </details>
                                                    )}

                                                    {/* Web Sources */}
                                                    {msg.webSources && msg.webSources.length > 0 && (
                                                        <details className="doc-sources web-sources">
                                                            <summary>🌐 Web sources ({msg.webSources.length})</summary>
                                                            <div className="doc-sources-list">
                                                                {msg.webSources.map((src, si) => (
                                                                    <div key={si} className="doc-source-item web-source-item">
                                                                        <a href={src.url} target="_blank" rel="noopener noreferrer" className="web-source-link">
                                                                            🔗 {src.title}
                                                                        </a>
                                                                        <p style={{ fontSize: '0.8rem', opacity: 0.8 }}>{src.snippet}</p>
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
                                                        <span>
                                                            {deepSearch
                                                                ? 'Searching web & analyzing documents...'
                                                                : 'Analyzing documents & generating answer...'
                                                            }
                                                        </span>
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
                                            placeholder={deepSearch ? 'Ask anything — AI will search the web + docs...' : 'Ask a question across all documents...'}
                                            value={question}
                                            onChange={(e) => setQuestion(e.target.value)}
                                            disabled={asking}
                                        />
                                        <button
                                            type="submit"
                                            className={`btn doc-ask-btn ${deepSearch ? 'btn-deep' : 'btn-primary'}`}
                                            disabled={asking || !question.trim()}
                                        >
                                            {asking ? '...' : deepSearch ? '🌐 Search' : '🔍 Ask'}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {!selectedWorkspace && workspaces.length > 0 && (
                    <div className="card fade-in" style={{ textAlign: 'center', padding: '3rem' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👆</div>
                        <p style={{ color: 'var(--muted)' }}>Select a workspace above to manage documents and ask questions</p>
                    </div>
                )}
            </main>
        </div>
    );
}
