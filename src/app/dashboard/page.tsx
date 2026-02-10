'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function UserDashboard() {
    const router = useRouter();
    const [userName, setUserName] = useState('User');

    useEffect(() => {
        // In a real app, you'd fetch user data here
        const checkAuth = async () => {
            // Simple auth check - in production use middleware
        };
        checkAuth();
    }, []);

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
    };

    return (
        <div className="dashboard-layout">
            <aside className="sidebar">
                <div className="sidebar-logo">📊 Dashboard</div>
                <nav className="sidebar-nav">
                    <a href="/dashboard" className="sidebar-link active">
                        🏠 Home
                    </a>
                    <a href="/dashboard/ai-notes" className="sidebar-link">
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
                    <h1 className="page-title">Welcome, {userName}!</h1>
                    <p className="page-subtitle">Your personal dashboard</p>
                </header>

                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-label">Tasks Completed</div>
                        <div className="stat-value success">12</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Projects Active</div>
                        <div className="stat-value primary">3</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Notifications</div>
                        <div className="stat-value warning">5</div>
                    </div>
                </div>

                <div className="card fade-in" style={{ marginTop: '1rem' }}>
                    <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>🎉 Account Approved!</h2>
                    <p style={{ color: 'var(--muted)', lineHeight: '1.6' }}>
                        Congratulations! Your account has been approved by an administrator.
                        You now have full access to the dashboard and all its features.
                    </p>
                    <div className="alert alert-success" style={{ marginTop: '1rem' }}>
                        Your account is active and in good standing.
                    </div>
                </div>

                <div className="card fade-in" style={{ marginTop: '1.5rem' }}>
                    <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>📋 Quick Actions</h2>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <button className="btn btn-primary">Create New Project</button>
                        <button className="btn btn-outline">View Reports</button>
                        <button className="btn btn-outline">Team Settings</button>
                    </div>
                </div>
            </main>
        </div>
    );
}
