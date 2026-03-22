import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';

const CrossExaminerDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('exams');
    const [exams, setExams] = useState([]);
    const [recordings, setRecordings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [approvalComments, setApprovalComments] = useState({});
    const [approvingId, setApprovingId] = useState(null);

    // Password change state
    const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
    const [pwLoading, setPwLoading] = useState(false);
    const [pwMsg, setPwMsg] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [examsRes, recordingsRes] = await Promise.all([
                api.get('/cross-examiner/exams'),
                api.get('/cross-examiner/recordings')
            ]);
            setExams(examsRes.data.exams || []);
            setRecordings(recordingsRes.data.recordings || []);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApproval = async (examId, approval) => {
        const comment = approvalComments[examId] || '';
        if (!comment.trim()) {
            alert('Please add a comment before submitting your review.');
            return;
        }
        setApprovingId(examId);
        try {
            await api.post(`/cross-examiner/exams/${examId}/approve`, { approval, comment });
            alert(`Exam ${approval === 'approved' ? 'approved' : 'flagged'} successfully!`);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to submit approval.');
        } finally {
            setApprovingId(null);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (pwForm.next !== pwForm.confirm) {
            setPwMsg({ type: 'error', text: 'New passwords do not match.' });
            return;
        }
        if (pwForm.next.length < 6) {
            setPwMsg({ type: 'error', text: 'New password must be at least 6 characters.' });
            return;
        }
        setPwLoading(true);
        setPwMsg({ type: '', text: '' });
        try {
            // Reusing student endpoint since it just checks current user ID in auth middleware
            await api.put('/student/change-password', {
                currentPassword: pwForm.current,
                newPassword: pwForm.next
            });
            setPwMsg({ type: 'success', text: 'Password updated successfully! Please use your new password next time you log in.' });
            setPwForm({ current: '', next: '', confirm: '' });
        } catch (err) {
            setPwMsg({ type: 'error', text: err.response?.data?.error || 'Failed to update password.' });
        } finally {
            setPwLoading(false);
        }
    };

    return (
        <div className="container" style={{ minHeight: '100vh', paddingTop: '2rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1>Cross Examiner Dashboard</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                        Welcome, {user?.name}!
                    </p>
                </div>
                <button onClick={logout} className="btn-secondary">
                    Logout
                </button>
            </div>

            {/* Tabs */}
            <div style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '2rem',
                background: 'var(--bg-secondary)',
                padding: '0.5rem',
                borderRadius: '12px',
                overflowX: 'auto'
            }}>
                <button
                    onClick={() => setActiveTab('exams')}
                    className={activeTab === 'exams' ? 'btn-primary' : 'btn-secondary'}
                    style={{ flex: 1, minWidth: '120px' }}
                >
                    📋 My Exams
                </button>
                <button
                    onClick={() => setActiveTab('recordings')}
                    className={activeTab === 'recordings' ? 'btn-primary' : 'btn-secondary'}
                    style={{ flex: 1, minWidth: '120px' }}
                >
                    🎥 Recordings
                </button>
                <button
                    onClick={() => setActiveTab('password')}
                    className={activeTab === 'password' ? 'btn-primary' : 'btn-secondary'}
                    style={{ flex: 1, minWidth: '120px' }}
                >
                    🔒 Password
                </button>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
                </div>
            ) : (
                <>
                    {/* Exams Tab */}
                    {activeTab === 'exams' && (
                        <div>
                            {exams.length === 0 ? (
                                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                                    <p style={{ color: 'var(--text-muted)' }}>No exams available</p>
                                </div>
                            ) : (
                                <div className="grid">
                                    {exams.map(exam => {
                                        const isCompleted = ['completed', 'published'].includes(exam.status);
                                        const alreadyReviewed = exam.cross_examiner_approval && exam.cross_examiner_approval !== 'pending';

                                        return (
                                        <div key={exam._id} className="card">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                                <div>
                                                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{exam.name}</h3>
                                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                                        Student: {exam.student_name}
                                                    </p>
                                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                                        Evaluator: {exam.evaluator_name}
                                                    </p>
                                                </div>
                                                <span className={`badge badge-${exam.status === 'completed' ? 'success' : exam.status === 'in_progress' ? 'warning' : 'info'}`}>
                                                    {exam.status}
                                                </span>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                                                <div>
                                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Date</p>
                                                    <p style={{ fontWeight: '500' }}>{new Date(exam.date).toLocaleDateString()}</p>
                                                </div>
                                                <div>
                                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Time</p>
                                                    <p style={{ fontWeight: '500' }}>{exam.time} ({exam.duration_minutes || 60} min)</p>
                                                </div>
                                            </div>

                                            {/* Join Exam button - for scheduled/in-progress exams */}
                                            {!isCompleted && (
                                                <button
                                                    className="btn-primary"
                                                    style={{ width: '100%' }}
                                                    onClick={() => navigate(`/exam/${exam._id}`)}
                                                >
                                                    Join Exam Call
                                                </button>
                                            )}

                                            {/* Approval Section - for completed exams */}
                                            {isCompleted && (
                                                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                                                    {alreadyReviewed ? (
                                                        /* Already reviewed - show read-only status */
                                                        <div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                                                <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Your Review:</span>
                                                                <span className={`badge badge-${exam.cross_examiner_approval === 'approved' ? 'success' : 'error'}`}>
                                                                    {exam.cross_examiner_approval === 'approved' ? '✅ Approved' : '⚠️ Flagged'}
                                                                </span>
                                                            </div>
                                                            {exam.cross_examiner_comment && (
                                                                <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem 1rem', borderRadius: '8px', borderLeft: `3px solid ${exam.cross_examiner_approval === 'approved' ? 'var(--success)' : 'var(--error)'}` }}>
                                                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>"{exam.cross_examiner_comment}"</p>
                                                                </div>
                                                            )}
                                                            {exam.cross_examiner_approved_at && (
                                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                                                    Reviewed on {new Date(exam.cross_examiner_approved_at).toLocaleString()}
                                                                </p>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        /* Not yet reviewed - show approval form */
                                                        <div>
                                                            <p style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
                                                                📋 Review This Exam
                                                            </p>
                                                            <textarea
                                                                placeholder="Add your comment about the exam fairness, conduct, and observations..."
                                                                value={approvalComments[exam._id] || ''}
                                                                onChange={(e) => setApprovalComments(prev => ({ ...prev, [exam._id]: e.target.value }))}
                                                                rows={3}
                                                                style={{ width: '100%', marginBottom: '0.75rem', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', resize: 'vertical', fontFamily: 'inherit', fontSize: '0.85rem' }}
                                                            />
                                                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                                                <button
                                                                    className="btn-primary"
                                                                    style={{ flex: 1 }}
                                                                    disabled={approvingId === exam._id}
                                                                    onClick={() => handleApproval(exam._id, 'approved')}
                                                                >
                                                                    {approvingId === exam._id ? 'Submitting...' : '✅ Approve'}
                                                                </button>
                                                                <button
                                                                    className="btn-secondary"
                                                                    style={{ flex: 1, borderColor: 'var(--error)', color: 'var(--error)' }}
                                                                    disabled={approvingId === exam._id}
                                                                    onClick={() => handleApproval(exam._id, 'flagged')}
                                                                >
                                                                    {approvingId === exam._id ? 'Submitting...' : '⚠️ Flag Concern'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Recordings Tab */}
                    {activeTab === 'recordings' && (
                        <div>
                            {recordings.length === 0 ? (
                                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                                    <p style={{ color: 'var(--text-muted)' }}>No recordings available yet</p>
                                </div>
                            ) : (
                                <div className="grid grid-2">
                                    {recordings.map(rec => (
                                        <div key={rec._id} className="card">
                                            <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>{rec.exam_name}</h3>
                                            <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                                Student: {rec.student_name}
                                            </p>
                                            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                                                Date: {new Date(rec.date).toLocaleDateString()}
                                            </p>
                                            {rec.video_url ? (
                                                <a
                                                    href={rec.video_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="btn-primary"
                                                    style={{ textDecoration: 'none', width: '100%', display: 'block', textAlign: 'center' }}
                                                >
                                                    🎥 View Recording
                                                </a>
                                            ) : (
                                                <button className="btn-secondary" disabled style={{ width: '100%' }}>
                                                    Recording not available
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Password Management Tab */}
                    {activeTab === 'password' && (
                        <section>
                            <h2 style={{ marginBottom: '0.5rem' }}>🔒 Password Management</h2>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                                Change your account password. You'll need your current password to confirm.
                            </p>

                            <div className="card" style={{ maxWidth: '480px' }}>
                                {pwMsg.text && (
                                    <div style={{
                                        background: pwMsg.type === 'success' ? 'rgba(5,150,105,0.1)' : 'rgba(220,38,38,0.08)',
                                        border: `1px solid ${pwMsg.type === 'success' ? 'var(--success)' : 'var(--error)'}`,
                                        borderRadius: '8px',
                                        padding: '0.85rem 1rem',
                                        marginBottom: '1.5rem',
                                        color: pwMsg.type === 'success' ? 'var(--success)' : 'var(--error)',
                                        fontWeight: '600',
                                        fontSize: '0.9rem'
                                    }}>
                                        {pwMsg.type === 'success' ? '✅' : '❌'} {pwMsg.text}
                                    </div>
                                )}

                                <form onSubmit={handleChangePassword}>
                                    <div className="form-group">
                                        <label>Current Password</label>
                                        <input
                                            type="password"
                                            value={pwForm.current}
                                            onChange={(e) => setPwForm(f => ({ ...f, current: e.target.value }))}
                                            placeholder="Enter your current password"
                                            required
                                        />
                                    </div>

                                    <div style={{ height: '1px', background: 'var(--border)', margin: '1.25rem 0' }} />

                                    <div className="form-group">
                                        <label>New Password</label>
                                        <input
                                            type="password"
                                            value={pwForm.next}
                                            onChange={(e) => setPwForm(f => ({ ...f, next: e.target.value }))}
                                            placeholder="Min. 6 characters"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Confirm New Password</label>
                                        <input
                                            type="password"
                                            value={pwForm.confirm}
                                            onChange={(e) => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                                            placeholder="Re-enter new password"
                                            required
                                        />
                                        {pwForm.confirm && pwForm.next !== pwForm.confirm && (
                                            <p style={{ color: 'var(--error)', fontSize: '0.8rem', marginTop: '0.3rem' }}>Passwords do not match</p>
                                        )}
                                    </div>

                                    <button
                                        type="submit"
                                        className="btn-primary"
                                        style={{ width: '100%', marginTop: '0.5rem' }}
                                        disabled={pwLoading || (pwForm.confirm && pwForm.next !== pwForm.confirm)}
                                    >
                                        {pwLoading ? 'Updating...' : '🔒 Update Password'}
                                    </button>
                                </form>

                                <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                                        💡 <strong>Tips:</strong> Use a mix of letters, numbers, and symbols. Avoid reusing passwords from other sites.
                                    </p>
                                </div>
                            </div>
                        </section>
                    )}
                </>
            )}
        </div>
    );
};

export default CrossExaminerDashboard;
