import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const StudentDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('exams');
    const [exams, setExams] = useState([]);
    const [results, setResults] = useState([]);
    const [certificates, setCertificates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedResult, setExpandedResult] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Password change state
    const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
    const [pwLoading, setPwLoading] = useState(false);
    const [pwMsg, setPwMsg] = useState({ type: '', text: '' });

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const [examsRes, resultsRes, certsRes] = await Promise.all([
                api.get('/student/exams'),
                api.get('/student/results'),
                api.get('/student/certificates')
            ]);
            setExams(examsRes.data.exams || []);
            setResults(resultsRes.data.results || []);
            setCertificates(certsRes.data.certificates || []);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const canJoinExam = (exam) => {
        const examDateTime = new Date(`${exam.date.split('T')[0]}T${exam.time}`);
        const joinWindowEnd = new Date(examDateTime.getTime() + (exam.duration || exam.duration_minutes || 60) * 60 * 1000);
        return currentTime >= examDateTime && currentTime <= joinWindowEnd && exam.status !== 'completed';
    };

    const downloadCertPdf = (certId, candidateName) => {
        const token = localStorage.getItem('token');
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        fetch(`${baseUrl}/certificates/${certId}/pdf`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(r => {
                if (!r.ok) throw new Error('Failed');
                return r.blob();
            })
            .then(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `certificate-${candidateName}.pdf`;
                a.click();
                URL.revokeObjectURL(url);
            })
            .catch(() => alert('Failed to download certificate. Please try again.'));
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

    if (loading) {
        return (
            <div className="container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    const sidebarItems = [
        { key: 'exams',    icon: '📅', label: 'Upcoming Exams',  badge: exams.length },
        { key: 'results',  icon: '📊', label: 'My Results',      badge: results.length },
        { key: 'documents',icon: '📄', label: 'My Documents',    badge: certificates.length },
        { key: 'password', icon: '🔒', label: 'Password',        badge: null },
    ];

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>

            {/* Top Bar */}
            <div style={{
                background: 'var(--bg-card)',
                borderBottom: '1px solid var(--border)',
                padding: '1rem 2rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: 'var(--shadow-sm)',
                position: 'sticky',
                top: 0,
                zIndex: 100
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {user?.profilePhoto ? (
                        <img src={user.profilePhoto} alt="Profile" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-primary)' }} />
                    ) : (
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '700', fontSize: '1rem' }}>
                            {user?.name?.[0]?.toUpperCase() || '?'}
                        </div>
                    )}
                    <div>
                        <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{user?.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Student</div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{currentTime.toLocaleTimeString()}</span>
                    <button onClick={logout} className="btn-secondary" style={{ padding: '0.5rem 1rem' }}>Logout</button>
                </div>
            </div>

            <div style={{ display: 'flex', minHeight: 'calc(100vh - 73px)' }}>

                {/* ─── Sidebar ─────────────────────────────────────────────────── */}
                <aside style={{
                    width: '240px',
                    flexShrink: 0,
                    background: 'var(--bg-card)',
                    borderRight: '1px solid var(--border)',
                    padding: '1.5rem 1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem'
                }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '0 0.5rem', marginBottom: '0.5rem' }}>
                        Navigation
                    </div>
                    {sidebarItems.map(item => (
                        <button
                            key={item.key}
                            onClick={() => setActiveTab(item.key)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '0.75rem',
                                padding: '0.75rem 1rem',
                                borderRadius: '10px',
                                border: 'none',
                                cursor: 'pointer',
                                textAlign: 'left',
                                width: '100%',
                                background: activeTab === item.key ? 'var(--bg-tertiary)' : 'transparent',
                                color: activeTab === item.key ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                fontWeight: activeTab === item.key ? '700' : '500',
                                fontSize: '0.9rem',
                                transition: 'all var(--transition-fast)',
                                borderLeft: activeTab === item.key ? '3px solid var(--accent-primary)' : '3px solid transparent'
                            }}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <span>{item.icon}</span>
                                <span>{item.label}</span>
                            </span>
                            {item.badge !== null && (
                                <span style={{
                                    background: activeTab === item.key ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                                    color: activeTab === item.key ? '#fff' : 'var(--text-muted)',
                                    borderRadius: '20px',
                                    padding: '0.1rem 0.55rem',
                                    fontSize: '0.72rem',
                                    fontWeight: '700'
                                }}>
                                    {item.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </aside>

                {/* ─── Main Content ──────────────────────────────────────────────── */}
                <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>

                    {/* ── Upcoming Exams Tab ── */}
                    {activeTab === 'exams' && (
                        <section>
                            <h2 style={{ marginBottom: '1.5rem' }}>📅 Upcoming Exams</h2>
                            {exams.length === 0 ? (
                                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                                    <p style={{ color: 'var(--text-muted)' }}>No exams scheduled</p>
                                </div>
                            ) : (
                                <div className="grid grid-2">
                                    {exams.map((exam) => {
                                        const examDate = new Date(exam.date);
                                        const joinable = canJoinExam(exam);
                                        return (
                                            <div key={exam._id} className="card">
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{exam.name}</h3>
                                                    <span className={`badge badge-${exam.status === 'completed' ? 'success' : exam.status === 'in_progress' ? 'warning' : 'info'}`}>
                                                        {exam.status.replace('_', ' ')}
                                                    </span>
                                                </div>
                                                <div style={{ marginBottom: '1rem' }}>
                                                    <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                                        📆 {examDate.toLocaleDateString()} at {exam.time}
                                                    </p>
                                                    <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                                        ⏱️ Duration: {exam.duration_minutes} minutes
                                                    </p>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.75rem' }}>
                                                        {exam.evaluator_id?.profilePhoto ? (
                                                            <img src={exam.evaluator_id.profilePhoto} alt={exam.evaluator_name} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                                                        ) : (
                                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👤</div>
                                                        )}
                                                        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Evaluator: {exam.evaluator_name}</p>
                                                    </div>
                                                </div>
                                                {joinable ? (
                                                    <button onClick={() => navigate(`/exam/${exam._id}`)} className="btn-primary" style={{ width: '100%' }}>
                                                        Join Exam Now
                                                    </button>
                                                ) : (
                                                    <button disabled className="btn-secondary" style={{ width: '100%' }}>
                                                        {exam.status === 'completed' ? 'Completed' : 'Not available yet'}
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    )}

                    {/* ── Results Tab ── */}
                    {activeTab === 'results' && (
                        <section>
                            <h2 style={{ marginBottom: '1.5rem' }}>📊 My Results</h2>
                            {results.length === 0 ? (
                                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                                    <p style={{ color: 'var(--text-muted)' }}>No published results yet</p>
                                </div>
                            ) : (
                                <div className="grid">
                                    {results.map((result) => {
                                        const criteria = result.criteria ? (typeof result.criteria === 'string' ? JSON.parse(result.criteria) : result.criteria) : [];
                                        const isExpanded = expandedResult === result.exam_id;
                                        return (
                                            <div key={result.exam_id} className="card">
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                                    <div>
                                                        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{result.exam_name}</h3>
                                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                                            {new Date(result.date).toLocaleDateString()} • Evaluated by {result.evaluator_name}
                                                        </p>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ fontSize: '2rem', fontWeight: '700', background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                                            {result.marks}
                                                        </div>
                                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Total Score</span>
                                                    </div>
                                                </div>
                                                <button onClick={() => setExpandedResult(isExpanded ? null : result.exam_id)} className="btn-secondary" style={{ width: '100%', marginTop: '1rem' }}>
                                                    {isExpanded ? 'Hide Details' : 'View Breakdown'}
                                                </button>
                                                {isExpanded && (
                                                    <div style={{ marginTop: '1.5rem' }}>
                                                        <table>
                                                            <thead><tr><th>Criteria</th><th>Marks</th><th>Comments</th></tr></thead>
                                                            <tbody>
                                                                {criteria.map((c, idx) => (
                                                                    <tr key={idx}>
                                                                        <td style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{c.name}</td>
                                                                        <td style={{ color: 'var(--accent-primary)', fontWeight: '600' }}>{c.marks}</td>
                                                                        <td style={{ fontStyle: 'italic' }}>{c.comments || 'N/A'}</td>
                                                                    </tr>
                                                                ))}
                                                                <tr style={{ background: 'var(--bg-secondary)', fontWeight: '700' }}>
                                                                    <td>TOTAL</td>
                                                                    <td style={{ color: 'var(--accent-primary)' }}>{result.marks}</td>
                                                                    <td></td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    )}

                    {/* ── My Documents Tab ── */}
                    {activeTab === 'documents' && (
                        <section>
                            <h2 style={{ marginBottom: '0.5rem' }}>📄 My Documents</h2>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                                Official certificates issued by the administration for your completed exams.
                            </p>

                            {certificates.length === 0 ? (
                                <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎓</div>
                                    <h3 style={{ marginBottom: '0.5rem' }}>No Certificates Yet</h3>
                                    <p style={{ color: 'var(--text-muted)' }}>
                                        Your certificates will appear here once the admin issues them after your exam results.
                                    </p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {certificates.map(cert => (
                                        <div key={cert._id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                            {/* Certificate icon */}
                                            <div style={{
                                                width: '64px', height: '64px', flexShrink: 0,
                                                borderRadius: '12px',
                                                background: 'linear-gradient(135deg, #c5a028 0%, #f5d470 100%)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '1.8rem',
                                                boxShadow: '0 4px 12px rgba(197,160,40,0.3)'
                                            }}>
                                                🎓
                                            </div>

                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                                                    Official Certificate of Completion
                                                </div>
                                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.2rem' }}>
                                                    <strong>{cert.gradeLevel}</strong>
                                                    {cert.instrument ? ` — ${cert.instrument}` : ''}
                                                </div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '0.4rem' }}>
                                                    {cert.awardedGrade && (
                                                        <span style={{ fontSize: '0.8rem', background: 'rgba(5,150,105,0.1)', color: 'var(--success)', padding: '0.2rem 0.7rem', borderRadius: '20px', fontWeight: '600' }}>
                                                            🏅 {cert.awardedGrade}
                                                        </span>
                                                    )}
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                        📅 {cert.day} {cert.month} {cert.year}
                                                    </span>
                                                    {cert.examCenter && (
                                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                            📍 {cert.examCenter}
                                                        </span>
                                                    )}
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                        Issued: {new Date(cert.issuedAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => downloadCertPdf(cert._id, cert.candidateName)}
                                                className="btn-primary"
                                                style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                            >
                                                ⬇️ Download PDF
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    )}

                    {/* ── Password Management Tab ── */}
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

                </main>
            </div>
        </div>
    );
};

export default StudentDashboard;
