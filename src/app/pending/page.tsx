'use client';

import { useRouter } from 'next/navigation';

export default function PendingApprovalPage() {
    const router = useRouter();

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
    };

    return (
        <div className="pending-container">
            <div className="card fade-in" style={{ maxWidth: '480px', textAlign: 'center' }}>
                <div className="pending-icon">⏳</div>
                <h1 className="pending-title">Awaiting Approval</h1>
                <p className="pending-message">
                    Your account has been created successfully! An administrator will review and approve your
                    access shortly. You&apos;ll be able to access the dashboard once approved.
                </p>
                <button
                    onClick={handleLogout}
                    className="btn btn-outline"
                    style={{ marginTop: '1.5rem' }}
                >
                    Back to Login
                </button>
            </div>
        </div>
    );
}
