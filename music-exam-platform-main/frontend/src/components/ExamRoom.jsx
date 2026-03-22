import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DailyIframe from '@daily-co/daily-js';
import api from '../api/api';

const ExamRoom = () => {
    const { exam_id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [exam, setExam] = useState(null);
    const [loading, setLoading] = useState(true);
    const [callFrame, setCallFrame] = useState(null);
    const callFrameRef = useRef(null);
    const [timeRemaining, setTimeRemaining] = useState(null);
    const [videoEnded, setVideoEnded] = useState(false);
    const [joinError, setJoinError] = useState(null);
    const joiningRef = useRef(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const endTimeRef = useRef(null);
    const clockSkewRef = useRef(0); // server_time - client_time

    // Marks form state (evaluator only)
    const [criteria, setCriteria] = useState([
        { name: 'Tone', marks: 0, comments: '' },
        { name: 'Rhythm', marks: 0, comments: '' },
        { name: 'Technique', marks: 0, comments: '' }
    ]);
    const [submitting, setSubmitting] = useState(false);

    const videoContainerRef = useRef(null);
    const timerRef = useRef(null);

    useEffect(() => {
        fetchExamDetails();
        return () => {
            if (callFrameRef.current) {
                callFrameRef.current.destroy();
                callFrameRef.current = null;
            }
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [exam_id]);

    const fetchExamDetails = async () => {
        if (!exam_id || exam_id === 'undefined') {
            alert('Invalid exam ID.');
            navigate(-1);
            return;
        }
        try {
            const response = await api.get(`/exams/${exam_id}/details`);
            const examData = response.data.exam;
            setExam(examData);

            // Check if exam already has a server-side timer (reload persistence)
            if (examData.end_time) {
                await syncTimerFromServer();
            }
        } catch (error) {
            console.error('Error fetching exam details:', error);
            alert('Failed to load exam details');
            navigate(-1);
        } finally {
            setLoading(false);
        }
    };

    // Fetch server timer state and start local countdown synced to it
    const syncTimerFromServer = async () => {
        try {
            const timerRes = await api.get(`/exams/${exam_id}/timer`);
            const { end_time, server_time, status } = timerRes.data;

            if (!end_time) return false;

            // Compute clock skew: difference between server clock and client clock
            const serverNow = new Date(server_time).getTime();
            clockSkewRef.current = serverNow - Date.now();

            const endMs = new Date(end_time).getTime();
            endTimeRef.current = endMs;

            // Calculate remaining considering clock skew
            const adjustedNow = Date.now() + clockSkewRef.current;
            const remaining = endMs - adjustedNow;

            if (remaining <= 0) {
                // Timer already expired
                setTimeRemaining(0);
                if (status !== 'completed' && status !== 'published') {
                    endVideoCall();
                } else {
                    setVideoEnded(true);
                }
                return true;
            }

            // Start a synced countdown
            setTimeRemaining(remaining);
            startSyncedTimer();
            return true;
        } catch (err) {
            console.error('Error syncing timer:', err);
            return false;
        }
    };

    // Start a timer that counts down using the server's end_time
    const startSyncedTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);

        timerRef.current = setInterval(() => {
            if (!endTimeRef.current) return;

            const adjustedNow = Date.now() + clockSkewRef.current;
            const remaining = endTimeRef.current - adjustedNow;

            if (remaining <= 0) {
                setTimeRemaining(0);
                clearInterval(timerRef.current);
                endVideoCall();
            } else {
                setTimeRemaining(remaining);
            }
        }, 1000);
    };

    useEffect(() => {
        if (!loading && exam && user.role !== 'admin') {
            joinVideoCall();
        }
    }, [loading, exam, user.role]);

    const joinVideoCall = async () => {
        if (joiningRef.current) return;
        joiningRef.current = true;

        try {
            setJoinError(null);

            // Get room token
            const tokenResponse = await api.get(`/exams/${exam_id}/room-token`);
            const { token, room_url } = tokenResponse.data;

            // Cleanup any existing frame first to avoid "white box" stacking
            if (callFrameRef.current) {
                callFrameRef.current.destroy();
                callFrameRef.current = null;
                setCallFrame(null);
            }
            if (videoContainerRef.current) {
                videoContainerRef.current.innerHTML = '';
            }

            // Create Daily call frame
            const frame = DailyIframe.createFrame(videoContainerRef.current, {
                showLeaveButton: false,
                showFullscreenButton: true,
                iframeStyle: {
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    borderRadius: '12px'
                }
            });

            try {
                // If we are in demo mode, 'token' is 'mock-token'. 
                // We should NOT pass a mock token to a real Daily room or it will fail.
                const joinOptions = { url: room_url };
                if (token && token !== 'mock-token' && token !== 'mock-daily-co-token') {
                    joinOptions.token = token;
                }

                await frame.join(joinOptions);
                callFrameRef.current = frame;
                setCallFrame(frame);

                // Start exam (idempotent — returns existing timer if already started)
                const startRes = await api.post(`/exams/${exam_id}/start`);
                const { end_time, server_time } = startRes.data;

                if (end_time) {
                    const serverNow = new Date(server_time).getTime();
                    clockSkewRef.current = serverNow - Date.now();

                    const endMs = new Date(end_time).getTime();
                    endTimeRef.current = endMs;

                    const adjustedNow = Date.now() + clockSkewRef.current;
                    const remaining = endMs - adjustedNow;

                    if (remaining <= 0) {
                        setTimeRemaining(0);
                        endVideoCall();
                    } else {
                        setTimeRemaining(remaining);
                        startSyncedTimer();
                    }
                }

                // Handle events
                frame.on('left-meeting', () => {
                    console.log('User left meeting');
                });

                frame.on('error', (e) => {
                    console.error('Daily.co error event:', e);
                    setJoinError(`Connection error: ${e.errorMsg || 'Check your network'}`);
                });

            } catch (joinErr) {
                console.error('Daily.co join failed:', joinErr);
                const errorMsg = joinErr?.message || joinErr?.errorMsg || 'Unknown error';

                if (errorMsg.includes('not found') || errorMsg.includes('404')) {
                    setJoinError('meeting-not-found');
                } else if (errorMsg.includes('permission') || errorMsg.includes('DevicesError') || errorMsg.includes('NotAllowedError')) {
                    setJoinError('Camera/Mic Permission Denied. Please allow access in browser settings.');
                } else {
                    setJoinError(`Technical Error: ${errorMsg}`);
                }
                if (frame) frame.destroy();
            }

        } catch (error) {
            console.error('Error in joinVideoCall sequence:', error);
            setJoinError('connection-error');
        } finally {
            joiningRef.current = false;
        }
    };

    const endVideoCall = async () => {
        // Stop recording and mark exam as completed on the server
        try {
            await api.post(`/exams/${exam_id}/end`);
        } catch (err) {
            console.error('Error ending exam on server:', err);
        }

        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        if (callFrameRef.current) {
            try {
                await callFrameRef.current.leave();
                callFrameRef.current.destroy();
            } catch (e) {
                console.error('Error leaving call:', e);
            }
            callFrameRef.current = null;
            setCallFrame(null);
        }
        setVideoEnded(true);
        alert('Video call has ended. Evaluator: Please submit marks.');
    };

    const handleExit = () => {
        if (callFrame) {
            callFrame.destroy();
        }
        if (user.role === 'cross_examiner') {
            navigate('/cross-examiner/dashboard');
        } else {
            navigate(user.role === 'admin' ? '/admin/dashboard' : `/${user.role}/dashboard`);
        }
    };

    const addCriterion = () => {
        setCriteria([...criteria, { name: '', marks: 0, comments: '' }]);
    };

    const removeCriterion = (index) => {
        setCriteria(criteria.filter((_, i) => i !== index));
    };

    const updateCriterion = (index, field, value) => {
        const updated = [...criteria];
        updated[index][field] = field === 'marks' ? parseFloat(value) || 0 : value;
        setCriteria(updated);
    };

    const calculateTotal = () => {
        return criteria.reduce((sum, c) => sum + (c.marks || 0), 0);
    };

    const handleSubmitMarks = async () => {
        // Validation
        for (const c of criteria) {
            if (!c.name || c.name.trim() === '') {
                alert('Please fill in all criteria names');
                return;
            }
            if (typeof c.marks !== 'number' || c.marks < 0) {
                alert('Please enter valid marks (positive numbers)');
                return;
            }
        }

        const confirmed = window.confirm(
            'Once submitted, marks cannot be edited. Are you sure you want to submit?'
        );

        if (!confirmed) return;

        setSubmitting(true);
        try {
            await api.post('/evaluator/marks', {
                exam_id: exam_id,
                criteria: criteria.map(c => ({
                    name: c.name,
                    marks: c.marks,
                    comments: c.comments || ''
                }))
            });

            alert('Marks submitted successfully! Email sent to student.');
            navigate('/evaluator/dashboard');
        } catch (error) {
            console.error("Submission error:", error);
            const errorMessage = error?.message || error?.response?.data?.error || JSON.stringify(error) || 'Failed to submit marks';
            alert(`Error submitting marks: ${errorMessage}`);
        } finally {
            setSubmitting(false);
        }
    };

    const formatTime = (ms) => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <div className="container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="container" style={{ minHeight: '100vh', paddingTop: '2rem', paddingBottom: '2rem' }}>

            {/* Student Verification Slider Drawer — Evaluator/Cross-Examiner only */}
            {(user.role === 'evaluator' || user.role === 'cross_examiner') && (
                <>
                    {/* Drawer Backdrop */}
                    {drawerOpen && (
                        <div
                            onClick={() => setDrawerOpen(false)}
                            style={{
                                position: 'fixed',
                                inset: 0,
                                background: 'rgba(0,0,0,0.35)',
                                backdropFilter: 'blur(2px)',
                                zIndex: 1000,
                            }}
                        />
                    )}

                    {/* Floating Tab Trigger */}
                    <button
                        onClick={() => setDrawerOpen(o => !o)}
                        title="Student Verification Info"
                        style={{
                            position: 'fixed',
                            top: '50%',
                            left: drawerOpen ? '320px' : '0px',
                            transform: 'translateY(-50%)',
                            zIndex: 1100,
                            background: 'var(--accent-gradient)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '0 10px 10px 0',
                            padding: '1rem 0.55rem',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.4rem',
                            fontSize: '0.7rem',
                            fontWeight: '700',
                            letterSpacing: '0.5px',
                            boxShadow: '3px 0 12px rgba(124,58,237,0.3)',
                            transition: 'left 0.35s cubic-bezier(0.4,0,0.2,1)',
                            writingMode: 'vertical-rl',
                            textOrientation: 'mixed',
                        }}
                    >
                        {drawerOpen ? '✕' : '👤'}
                        {!drawerOpen && <span style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', fontSize: '0.65rem' }}>VERIFY</span>}
                    </button>

                    {/* Drawer Panel */}
                    <div
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            width: '320px',
                            height: '100vh',
                            background: 'var(--bg-card)',
                            borderRight: '1px solid var(--border)',
                            boxShadow: '6px 0 30px rgba(124,58,237,0.18)',
                            zIndex: 1050,
                            transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
                            transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)',
                            display: 'flex',
                            flexDirection: 'column',
                            overflowY: 'auto',
                        }}
                    >
                        {/* Drawer Header */}
                        <div style={{
                            background: 'var(--accent-gradient)',
                            padding: '1.25rem 1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexShrink: 0,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <span style={{ fontSize: '1.1rem' }}>🔍</span>
                                <span style={{ color: '#fff', fontWeight: '700', fontSize: '0.95rem', letterSpacing: '0.5px' }}>STUDENT VERIFICATION</span>
                            </div>
                            <button
                                onClick={() => setDrawerOpen(false)}
                                style={{
                                    background: 'rgba(255,255,255,0.2)',
                                    border: 'none',
                                    borderRadius: '6px',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    width: '28px',
                                    height: '28px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '1rem',
                                    fontWeight: '700',
                                }}
                            >✕</button>
                        </div>

                        {/* Student Photo — large vertical rectangle */}
                        <div style={{ padding: '1.5rem 1.5rem 1rem', flexShrink: 0 }}>
                            <div style={{
                                width: '100%',
                                aspectRatio: '3 / 4',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                border: '3px solid var(--accent-primary)',
                                boxShadow: 'var(--shadow-lg)',
                                background: 'var(--bg-tertiary)',
                                position: 'relative',
                            }}>
                                {exam?.student_id?.profilePhoto ? (
                                    <img
                                        src={exam.student_id.profilePhoto}
                                        alt="Student Photo"
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                            objectPosition: 'top center',
                                        }}
                                    />
                                ) : (
                                    <div style={{
                                        width: '100%',
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.75rem',
                                        color: 'var(--text-muted)',
                                    }}>
                                        <span style={{ fontSize: '4rem' }}>👤</span>
                                        <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>No Photo</span>
                                    </div>
                                )}
                                {/* Verification badge overlay */}
                                <div style={{
                                    position: 'absolute',
                                    bottom: '10px',
                                    right: '10px',
                                    background: 'rgba(5,150,105,0.9)',
                                    color: '#fff',
                                    fontSize: '0.7rem',
                                    fontWeight: '700',
                                    padding: '0.25rem 0.6rem',
                                    borderRadius: '20px',
                                    letterSpacing: '0.5px',
                                }}>📋 FOR VERIFICATION</div>
                            </div>
                        </div>

                        {/* Basic Student Info */}
                        <div style={{ padding: '0 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>

                            {/* Student Name */}
                            <div style={{
                                background: 'var(--bg-secondary)',
                                borderRadius: '10px',
                                padding: '0.85rem 1rem',
                                border: '1px solid var(--border)',
                            }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '0.3rem' }}>Student Name</div>
                                <div style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                                    {exam?.student_id?.name || exam?.student_name || '—'}
                                </div>
                            </div>

                            {/* Email */}
                            {exam?.student_id?.email && (
                                <div style={{
                                    background: 'var(--bg-secondary)',
                                    borderRadius: '10px',
                                    padding: '0.85rem 1rem',
                                    border: '1px solid var(--border)',
                                }}>
                                    <div style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '0.3rem' }}>Email</div>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                                        {exam.student_id.email}
                                    </div>
                                </div>
                            )}

                            {/* Exam Name */}
                            <div style={{
                                background: 'var(--bg-secondary)',
                                borderRadius: '10px',
                                padding: '0.85rem 1rem',
                                border: '1px solid var(--border)',
                            }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '0.3rem' }}>Exam</div>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                    {exam?.name || exam?.title || '—'}
                                </div>
                            </div>

                            {/* Exam Level / Grade */}
                            {(exam?.level || exam?.grade) && (
                                <div style={{
                                    background: 'var(--bg-secondary)',
                                    borderRadius: '10px',
                                    padding: '0.85rem 1rem',
                                    border: '1px solid var(--border)',
                                }}>
                                    <div style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '0.3rem' }}>Level / Grade</div>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                        {exam?.level || exam?.grade}
                                    </div>
                                </div>
                            )}

                            {/* Instrument / Subject */}
                            {(exam?.instrument || exam?.subject) && (
                                <div style={{
                                    background: 'var(--bg-secondary)',
                                    borderRadius: '10px',
                                    padding: '0.85rem 1rem',
                                    border: '1px solid var(--border)',
                                }}>
                                    <div style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '0.3rem' }}>Instrument / Subject</div>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                        {exam?.instrument || exam?.subject}
                                    </div>
                                </div>
                            )}

                            {/* Scheduled Date */}
                            {exam?.scheduled_date && (
                                <div style={{
                                    background: 'var(--bg-secondary)',
                                    borderRadius: '10px',
                                    padding: '0.85rem 1rem',
                                    border: '1px solid var(--border)',
                                }}>
                                    <div style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '0.3rem' }}>Scheduled Date</div>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                        {new Date(exam.scheduled_date).toLocaleString()}
                                    </div>
                                </div>
                            )}

                            {/* Duration */}
                            {exam?.duration_minutes && (
                                <div style={{
                                    background: 'var(--bg-secondary)',
                                    borderRadius: '10px',
                                    padding: '0.85rem 1rem',
                                    border: '1px solid var(--border)',
                                }}>
                                    <div style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '0.3rem' }}>Duration</div>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                        {exam.duration_minutes} minutes
                                    </div>
                                </div>
                            )}

                            {/* Verification Notice */}
                            <div style={{
                                background: 'rgba(124,58,237,0.07)',
                                borderRadius: '10px',
                                padding: '0.85rem 1rem',
                                border: '1px solid rgba(124,58,237,0.2)',
                                marginTop: '0.25rem',
                            }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: '600', lineHeight: '1.5' }}>
                                    ⚠️ Please verify the student's identity matches the photo before proceeding with the exam.
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
            {/* Header */}
            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <button
                        onClick={handleExit}
                        className="btn-secondary"
                        style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        ⬅️ Exit Room
                    </button>
                    <div>
                        <h2>{exam?.name || exam?.title || 'Exam Room'}</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                            {user.role === 'student' ? (
                                <>
                                    {exam?.evaluator_id?.profilePhoto ? (
                                        <img src={exam.evaluator_id.profilePhoto} alt="Evaluator" style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                                    ) : (
                                        <span style={{ fontSize: '1rem' }}>👤</span>
                                    )}
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
                                        Evaluator: {exam?.evaluator_name || 'Assigned soon'}
                                    </p>
                                </>
                            ) : (
                                <>
                                    {exam?.student_id?.profilePhoto ? (
                                        <img src={exam.student_id.profilePhoto} alt="Student" style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                                    ) : (
                                        <span style={{ fontSize: '1rem' }}>👤</span>
                                    )}
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
                                        Student: {exam?.student_name || 'Guest'}
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                {timeRemaining !== null && timeRemaining > 0 && (
                    <div style={{
                        fontSize: '1.25rem',
                        fontWeight: '700',
                        color: 'var(--accent-primary)',
                        background: 'rgba(167, 139, 250, 0.1)',
                        padding: '0.5rem 1rem',
                        borderRadius: '8px'
                    }}>
                        ⏱️ {formatTime(timeRemaining)}
                    </div>
                )}
            </div>

            {/* Video Container */}
            {user.role !== 'admin' && (
                <div style={{ position: 'relative', width: '100%', marginBottom: '2rem' }}>
                    <div
                        ref={videoContainerRef}
                        style={{
                            width: '100%',
                            height: '500px',
                            background: 'var(--bg-tertiary)',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            boxShadow: 'var(--shadow-lg)'
                        }}
                    >
                        {joinError && (
                            <div style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'var(--bg-secondary)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '2rem',
                                textAlign: 'center',
                                borderRadius: '12px',
                                zIndex: 10
                            }}>
                                <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>❌</div>
                                <h3 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>Video Call Error</h3>
                                <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', marginBottom: '1.5rem' }}>
                                    {joinError === 'meeting-not-found'
                                        ? 'The meeting you are trying to join does not exist. Please check your room URL in .env.'
                                        : `Failed to join: ${joinError}. Please check your camera/mic permissions and internet connection.`}
                                </p>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button
                                        onClick={() => { setJoinError(null); joinVideoCall(); }}
                                        className="btn-primary"
                                    >
                                        Retry
                                    </button>
                                    <button
                                        onClick={handleExit}
                                        className="btn-secondary"
                                    >
                                        Back to Dashboard
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {videoEnded && user.role === 'evaluator' && (
                <div style={{
                    background: 'rgba(251, 191, 36, 0.1)',
                    border: '1px solid var(--warning)',
                    borderRadius: '8px',
                    padding: '1rem',
                    marginBottom: '2rem',
                    color: 'var(--warning)'
                }}>
                    ⚠️ Video call has ended. Please submit marks below.
                </div>
            )}

            {/* Marks Form (Evaluator Only) */}
            {user.role === 'evaluator' && (
                <div className="card" style={{
                    border: videoEnded ? '2px solid var(--success)' : '1px solid var(--border)',
                    transition: 'border 0.3s'
                }}>
                    {/* Header changes when call ends */}
                    {videoEnded ? (
                        <div style={{
                            background: 'rgba(5,150,105,0.12)',
                            border: '1px solid rgba(5,150,105,0.4)',
                            borderRadius: '10px',
                            padding: '1rem 1.25rem',
                            marginBottom: '1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem'
                        }}>
                            <span style={{ fontSize: '1.5rem' }}>✅</span>
                            <div>
                                <div style={{ fontWeight: '700', color: '#059669', fontSize: '1rem' }}>Call ended — please submit marks now</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>Marks cannot be changed after submission.</div>
                            </div>
                        </div>
                    ) : (
                        <div style={{
                            background: 'rgba(99,102,241,0.07)',
                            border: '1px solid rgba(99,102,241,0.2)',
                            borderRadius: '10px',
                            padding: '0.85rem 1.25rem',
                            marginBottom: '1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem'
                        }}>
                            <span style={{ fontSize: '1.25rem' }}>📝</span>
                            <div>
                                <div style={{ fontWeight: '600', color: 'var(--accent-primary)', fontSize: '0.95rem' }}>Evaluation Marks</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>You can fill marks during the call. Submission is unlocked when the call ends.</div>
                            </div>
                        </div>
                    )}

                    {criteria.map((criterion, index) => (
                        <div
                            key={index}
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '2fr 1fr 3fr auto',
                                gap: '1rem',
                                marginBottom: '1rem',
                                alignItems: 'flex-start'
                            }}
                        >
                            <div>
                                <label style={{ marginBottom: '0.25rem' }}>Criteria</label>
                                <input
                                    type="text"
                                    value={criterion.name}
                                    onChange={(e) => updateCriterion(index, 'name', e.target.value)}
                                    placeholder="e.g., Tone Quality"
                                />
                            </div>
                            <div>
                                <label style={{ marginBottom: '0.25rem' }}>Marks</label>
                                <input
                                    type="number"
                                    value={criterion.marks}
                                    onChange={(e) => updateCriterion(index, 'marks', e.target.value)}
                                    min="0"
                                    step="0.5"
                                />
                            </div>
                            <div>
                                <label style={{ marginBottom: '0.25rem' }}>Comments (optional)</label>
                                <input
                                    type="text"
                                    value={criterion.comments}
                                    onChange={(e) => updateCriterion(index, 'comments', e.target.value)}
                                    placeholder="Add feedback..."
                                />
                            </div>
                            <div style={{ paddingTop: '1.75rem' }}>
                                {criteria.length > 1 && (
                                    <button
                                        onClick={() => removeCriterion(index)}
                                        className="btn-danger btn-sm"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    <button onClick={addCriterion} className="btn-secondary mb-3">
                        + Add Criterion
                    </button>

                    <div style={{
                        background: 'var(--bg-tertiary)',
                        padding: '1.5rem',
                        borderRadius: '8px',
                        marginBottom: '1.5rem'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '1.25rem', fontWeight: '600' }}>Total Score</span>
                            <span style={{
                                fontSize: '2rem',
                                fontWeight: '700',
                                background: 'var(--accent-gradient)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent'
                            }}>
                                {calculateTotal()}
                            </span>
                        </div>
                    </div>

                    {/* Submit locked during active call */}
                    {!videoEnded ? (
                        <button
                            disabled
                            className="btn-secondary"
                            style={{ width: '100%', opacity: 0.6, cursor: 'not-allowed' }}
                        >
                            🔒 Submit locked — waiting for call to end
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmitMarks}
                            className="btn-primary"
                            disabled={submitting}
                            style={{ width: '100%', background: 'linear-gradient(135deg, #059669, #10b981)', fontSize: '1rem', padding: '0.9rem' }}
                        >
                            {submitting ? 'Submitting...' : '✅ Submit Marks'}
                        </button>
                    )}
                </div>
            )}


            {/* Student View - just show message after video ends */}
            {user.role === 'student' && videoEnded && (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <h3 style={{ color: 'var(--success)', marginBottom: '1rem' }}>✅ Exam Completed</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Your exam has been completed. You will receive your results via email once they are published by the admin.
                    </p>
                    <button onClick={() => navigate('/student/dashboard')} className="btn-primary mt-3">
                        Return to Dashboard
                    </button>
                </div>
            )}
        </div>
    );
};

export default ExamRoom;
