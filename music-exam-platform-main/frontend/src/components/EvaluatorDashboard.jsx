import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';

const EvaluatorDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('exams');
    const [exams, setExams] = useState([]);
    const [crossExams, setCrossExams] = useState([]);
    const [crossRecordings, setCrossRecordings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Password change state
    const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
    const [pwLoading, setPwLoading] = useState(false);
    const [pwMsg, setPwMsg] = useState({ type: '', text: '' });
    const [playingRec, setPlayingRec] = useState(null);

    useEffect(() => {
        fetchExams();
    }, []);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const fetchExams = async () => {
        try {
            // We use Promise.all to fetch evaluator exams and cross-examiner endpoints concurrently
            // Caching errors on cross-examiner routes in case the user doesn't have cross-examiner privileges somehow
            const [evalRes, crossExamsRes, crossRecsRes] = await Promise.all([
                api.get('/evaluator/exams'),
                api.get('/cross-examiner/exams').catch(() => ({ data: { exams: [] } })),
                api.get('/cross-examiner/recordings').catch(() => ({ data: { recordings: [] } }))
            ]);
            setExams(evalRes.data.exams || []);
            setCrossExams(crossExamsRes.data?.exams || []);
            setCrossRecordings(crossRecsRes.data?.recordings || []);
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

    const handleJoinExam = (examId) => {
        navigate(`/exam/${examId}`);
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

    return (
        <div className="container" style={{ minHeight: '100vh', paddingTop: '2rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1>Evaluator Dashboard</h1>
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
                    📋 Assigned Exams
                </button>
                <button
                    onClick={() => setActiveTab('cross_exams')}
                    className={activeTab === 'cross_exams' ? 'btn-primary' : 'btn-secondary'}
                    style={{ flex: 1, minWidth: '120px' }}
                >
                    👀 Cross Examining
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

            {/* Assigned Exams Tab */}
            {activeTab === 'exams' && (
                <section>
                    <h2 style={{ marginBottom: '1.5rem' }}>📋 Assigned Exams</h2>

                    {exams.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                            <p style={{ color: 'var(--text-muted)' }}>No exams assigned to you</p>
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
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                                {exam.student_id?.profilePhoto ? (
                                                    <img
                                                        src={exam.student_id.profilePhoto}
                                                        alt={exam.student_name}
                                                        style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                                                    />
                                                ) : (
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
                                                        👤
                                                    </div>
                                                )}
                                                <div>
                                                    <p style={{ color: 'var(--text-secondary)' }}>Student: {exam.student_name}</p>
                                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{exam.student_email}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {exam.marks_submitted ? (
                                            <div style={{
                                                background: 'rgba(5, 150, 105, 0.1)',
                                                border: '1px solid var(--success)',
                                                borderRadius: '8px',
                                                padding: '0.75rem',
                                                textAlign: 'center',
                                                color: 'var(--success)'
                                            }}>
                                                ✅ Marks Submitted
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => joinable && handleJoinExam(exam._id)}
                                                className={joinable ? 'btn-primary' : 'btn-secondary'}
                                                style={{ width: '100%' }}
                                                disabled={!joinable}
                                                title={joinable ? 'Join the exam room' : 'Exam has not started yet'}
                                            >
                                                {exam.status === 'completed' ? 'Exam Completed' : joinable ? 'Join Exam Room' : '⏰ Not Yet Started'}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            )}

            {/* Cross Examining Tab */}
            {activeTab === 'cross_exams' && (
                <section>
                    <h2 style={{ marginBottom: '1.5rem' }}>👀 Cross Examining</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                        Exams where you act as a cross-examiner.
                    </p>

                    <h3 style={{ marginBottom: '1rem', marginTop: '2rem' }}>📋 Live Exams</h3>
                    {crossExams.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: '3rem', marginBottom: '2rem' }}>
                            <p style={{ color: 'var(--text-muted)' }}>No live exams assigned for cross-examining</p>
                        </div>
                    ) : (
                        <div className="grid grid-2" style={{ marginBottom: '2rem' }}>
                            {crossExams.map(exam => (
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
                                    <button
                                        className="btn-primary"
                                        style={{ width: '100%' }}
                                        onClick={() => navigate(`/exam/${exam._id}`)}
                                        disabled={exam.status === 'completed' || exam.status === 'published'}
                                    >
                                        {(exam.status === 'completed' || exam.status === 'published') ? 'Exam Ended' : 'Join Exam Call'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                </section>
            )}

            {/* Recordings Tab */}
            {activeTab === 'recordings' && (
                <section>
                    {playingRec && (
                        <div style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.85)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', zIndex: 1000
                        }} onClick={() => setPlayingRec(null)}>
                            <div style={{ maxWidth: '900px', width: '95%' }} onClick={e => e.stopPropagation()}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                    <h3 style={{ color: 'white' }}>{playingRec.exam_name}</h3>
                                    <button onClick={() => setPlayingRec(null)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
                                </div>
                                <video src={playingRec.video_url} controls autoPlay style={{ width: '100%', borderRadius: '12px', maxHeight: '70vh', background: '#000' }} />
                                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                                    <a href={playingRec.video_url} download className="btn-primary" style={{ textDecoration: 'none', flex: 1, textAlign: 'center' }}>⬇️ Download</a>
                                    <a href={playingRec.video_url} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ textDecoration: 'none', flex: 1, textAlign: 'center' }}>🔗 Open in New Tab</a>
                                </div>
                            </div>
                        </div>
                    )}

                    <h2 style={{ marginBottom: '1.5rem' }}>🎥 Exam Recordings ({crossRecordings.length})</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                        Recordings of exams where you were assigned as a cross-examiner.
                    </p>

                    {crossRecordings.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎥</div>
                            <p style={{ color: 'var(--text-muted)' }}>No recordings available yet</p>
                        </div>
                    ) : (
                        <div className="grid grid-2">
                            {crossRecordings.map(rec => (
                                <div key={rec._id} className="card">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                        <h3 style={{ fontSize: '1rem', marginBottom: '0' }}>{rec.exam_name || 'Exam Recording'}</h3>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '1rem' }}>
                                        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.85rem' }}>
                                            👤 {rec.student_name || 'Unknown'} &nbsp;|&nbsp;👨‍🏫 {rec.evaluator_name || 'Unknown'}
                                        </p>
                                        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.85rem' }}>
                                            📅 {rec.date ? new Date(rec.date).toLocaleDateString() : 'N/A'}
                                            {rec.duration && <>&nbsp;|&nbsp;⏱️ {rec.duration}</>}
                                        </p>
                                    </div>

                                    {rec.video_url ? (
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button onClick={() => setPlayingRec(rec)} className="btn-primary" style={{ flex: 1, fontSize: '0.85rem' }}>▶️ Watch</button>
                                            <a href={rec.video_url} download className="btn-secondary" style={{ flex: 1, textDecoration: 'none', textAlign: 'center', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⬇️ Download</a>
                                        </div>
                                    ) : (
                                        <button className="btn-secondary" disabled style={{ width: '100%' }}>Recording not available</button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </section>
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
        </div>
    );
};

export default EvaluatorDashboard;
