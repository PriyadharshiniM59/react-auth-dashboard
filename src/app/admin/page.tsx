'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
    id: number;
    email: string;
    name: string;
    role: string;
    isApproved: boolean;
    createdAt: string;
}

export default function AdminDashboard() {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/admin/users');
            if (res.status === 403) {
                router.push('/login');
                return;
            }
            const data = await res.json();
            setUsers(data.users || []);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApproval = async (userId: number, approve: boolean) => {
        setActionLoading(userId);
        try {
            const res = await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, isApproved: approve }),
            });

            if (res.ok) {
                setUsers(users.map(user =>
                    user.id === userId ? { ...user, isApproved: approve } : user
                ));
            }
        } catch (error) {
            console.error('Error updating user:', error);
        } finally {
            setActionLoading(null);
        }
    };

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
    };

    const pendingUsers = users.filter(u => !u.isApproved && u.role !== 'admin');
    const approvedUsers = users.filter(u => u.isApproved || u.role === 'admin');

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
                <div className="sidebar-logo">🛡️ Admin Panel</div>
                <nav className="sidebar-nav">
                    <a href="/admin" className="sidebar-link active">
                        📊 Dashboard
                    </a>
                    <a href="/dashboard/ai-notes" className="sidebar-link">
                        🤖 AI Notes
                    </a>
                    <a href="/admin" className="sidebar-link">
                        👥 Users
                    </a>
                </nav>
                <button onClick={handleLogout} className="btn btn-outline" style={{ marginTop: 'auto' }}>
                    Logout
                </button>
            </aside>

            <main className="main-content">
                <header className="page-header">
                    <h1 className="page-title">Admin Dashboard</h1>
                    <p className="page-subtitle">Manage users and approve access requests</p>
                </header>

                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-label">Total Users</div>
                        <div className="stat-value primary">{users.length}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Pending Approval</div>
                        <div className="stat-value warning">{pendingUsers.length}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Approved Users</div>
                        <div className="stat-value success">{approvedUsers.length}</div>
                    </div>
                </div>

                {pendingUsers.length > 0 && (
                    <>
                        <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>⏳ Pending Approvals</h2>
                        <div className="table-container" style={{ marginBottom: '2rem' }}>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Registered</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendingUsers.map((user) => (
                                        <tr key={user.id}>
                                            <td>{user.name}</td>
                                            <td>{user.email}</td>
                                            <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button
                                                        onClick={() => handleApproval(user.id, true)}
                                                        className="btn btn-success"
                                                        style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                                                        disabled={actionLoading === user.id}
                                                    >
                                                        {actionLoading === user.id ? '...' : 'Approve'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleApproval(user.id, false)}
                                                        className="btn btn-danger"
                                                        style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                                                        disabled={actionLoading === user.id}
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>👥 All Users</h2>
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id}>
                                    <td>{user.name}</td>
                                    <td>{user.email}</td>
                                    <td>
                                        <span className={`badge ${user.role === 'admin' ? 'badge-primary' : 'badge-success'}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`badge ${user.isApproved ? 'badge-success' : 'badge-warning'}`}>
                                            {user.isApproved ? 'Approved' : 'Pending'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
}
