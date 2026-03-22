import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { account } from '../lib/appwrite';
import '../index.css';

const Login = () => {
    const { login, verifyAppwriteOtp } = useAuth();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1); // 1 = Login, 2 = OTP

    // Clear stale Appwrite sessions on mount
    useEffect(() => {
        const clearStaleSession = async () => {
            try {
                await account.deleteSession('current');
            } catch (e) {
                // Ignore if no session exists
            }
        };
        clearStaleSession();
    }, []);

    
    // Step 1 State
    const [email, setEmail] = useState('admin@example.com');
    const [password, setPassword] = useState('password123');
    const [showPassword, setShowPassword] = useState(false);
    
    // Step 2 State
    const [otp, setOtp] = useState('');
    const [appwriteUserId, setAppwriteUserId] = useState(null);

    const [error, setError] = useState(null);

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await login(null, email, password);
            if (res.requireOtp) {
                try {
                    // Start Appwrite Email OTP Flow
                    await account.createEmailToken(res.appwriteId, email);
                    setAppwriteUserId(res.appwriteId);
                    setStep(2);
                } catch (appwriteErr) {
                    console.error('Appwrite OTP Error:', appwriteErr);
                    setError('Failed to send OTP email. Please try again.');
                }
            } else if (!res.success) {
                setError(res.error || 'Failed to login');
            }
        } catch (err) {
            console.error("Login failed", err);
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleOtpSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Verify OTP with Appwrite
            await account.createSession(appwriteUserId, otp);
            // Get Appwrite JWT
            const jwtResponse = await account.createJWT();
            // Send JWT to our backend to verify and get our own token
            const verifyRes = await verifyAppwriteOtp(jwtResponse.jwt);
            
            if (!verifyRes.success) {
                setError(verifyRes.error || 'OTP valid, but backend login failed.');
            }
            // If success, Context will update state and Router will redirect
        } catch (err) {
            console.error('OTP Submit Error:', err);
            setError('Invalid or expired OTP code.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #fdfcff 0%, #f3f0ff 100%)',
            padding: '2rem'
        }}>
            <div className="card" style={{
                maxWidth: '450px',
                width: '100%',
                padding: '3rem',
                boxShadow: 'var(--shadow-xl)',
                border: '1px solid var(--bg-tertiary)'
            }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{
                        fontSize: '3rem',
                        marginBottom: '1rem',
                        display: 'inline-block',
                        padding: '1rem',
                        background: 'var(--bg-secondary)',
                        borderRadius: '20px'
                    }}>
                        🎻
                    </div>
                    <h1 style={{
                        background: 'var(--accent-gradient)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: '0.5rem',
                        fontSize: '2rem'
                    }}>
                        Veena Vani
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: '500' }}>
                        Music Institute Portal
                    </p>
                    <p style={{ marginTop: '1rem', color: 'var(--accent-primary)', fontWeight: 'bold' }}>
                        {step === 1 ? 'Sign in to continue' : 'Enter One-Time Password'}
                    </p>
                </div>

                {error && (
                    <div style={{
                        padding: '1rem',
                        marginBottom: '1.5rem',
                        backgroundColor: '#fef2f2',
                        color: '#dc2626',
                        borderRadius: '8px',
                        textAlign: 'center'
                    }}>
                        {error}
                    </div>
                )}

                {/* Login Form Step 1 */}
                {step === 1 && (
                    <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="form-group">
                            <label>Email Address</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your email"
                            />
                        </div>

                        <div className="form-group">
                            <label>Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    style={{ width: '100%', paddingRight: '2.5rem' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute',
                                        right: '0.75rem',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: '1.2rem',
                                        color: 'var(--text-secondary)'
                                    }}
                                    title={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? '🙈' : '👁️'}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={loading}
                            style={{ width: '100%', padding: '1rem', fontSize: '1.2rem', marginTop: '1rem' }}
                        >
                            {loading ? 'Continuing...' : 'Sign In'}
                        </button>

                        <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                            <p>Default Accounts (Password: password123):</p>
                            <p>admin@example.com | evaluator@... | student@... | cross_examin@...</p>
                        </div>

                        <div style={{
                            textAlign: 'center',
                            marginTop: '1.5rem',
                            paddingTop: '1.5rem',
                            borderTop: '1px solid var(--bg-tertiary)'
                        }}>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                                New student? Apply for examination
                            </p>
                            <button
                                type="button"
                                onClick={() => window.location.href = '/register'}
                                style={{
                                    background: 'none',
                                    border: '2px solid var(--accent-primary)',
                                    color: 'var(--accent-primary)',
                                    padding: '0.7rem 2rem',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: '700',
                                    fontSize: '0.95rem',
                                    transition: 'all 0.2s'
                                }}
                            >
                                📋 Register for Examination
                            </button>
                        </div>
                    </form>
                )}

                {/* OTP Form Step 2 */}
                {step === 2 && (
                    <form onSubmit={handleOtpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ textAlign: 'center', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                            <p>An email with a 6-digit OTP has been sent to</p>
                            <p style={{ fontWeight: 'bold' }}>{email}</p>
                        </div>
                        <div className="form-group">
                            <label>OTP Code</label>
                            <input
                                type="text"
                                required
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                placeholder="Enter 6-digit OTP"
                                maxLength="6"
                                style={{
                                    textAlign: 'center',
                                    letterSpacing: '0.5rem',
                                    fontSize: '1.5rem',
                                    fontWeight: 'bold'
                                }}
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={loading}
                            style={{ width: '100%', padding: '1rem', fontSize: '1.2rem', marginTop: '1rem' }}
                        >
                            {loading ? 'Verifying...' : 'Verify & Login'}
                        </button>

                        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    textDecoration: 'underline'
                                }}
                            >
                                Back to Login
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default Login;
