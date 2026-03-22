import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';

const RegistrationForm = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState(null);

    // Form state
    const [form, setForm] = useState({
        academicCourse: '',
        fullName: '',
        gender: '',
        dateOfBirth: '',
        nationality: '',
        highestQualification: '',
        mobile: '',
        email: '',
        streetAddress: '',
        apartment: '',
        city: '',
        state: '',
        zip: '',
        country: '',
        discipline: '',
        specificSubject: '',
        declarationAgreed: false
    });

    const [previousCerts, setPreviousCerts] = useState([{ level: '', board: '', year: '' }]);

    // File states (base64)
    const [photograph, setPhotograph] = useState('');
    const [idProof, setIdProof] = useState('');
    const [certFiles, setCertFiles] = useState('');
    const [paymentProof, setPaymentProof] = useState('');
    const [paymentScreenshot, setPaymentScreenshot] = useState('');

    // File names for display
    const [fileNames, setFileNames] = useState({
        photograph: '',
        idProof: '',
        certFiles: '',
        paymentProof: '',
        paymentScreenshot: ''
    });

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleFileUpload = (setter, fileNameKey) => (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be under 5MB');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setter(reader.result);
            setFileNames(prev => ({ ...prev, [fileNameKey]: file.name }));
        };
        reader.readAsDataURL(file);
    };

    const addCertRow = () => {
        setPreviousCerts(prev => [...prev, { level: '', board: '', year: '' }]);
    };

    const removeCertRow = (index) => {
        setPreviousCerts(prev => prev.filter((_, i) => i !== index));
    };

    const updateCertRow = (index, field, value) => {
        setPreviousCerts(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!form.declarationAgreed) {
            setError('You must agree to the declaration before submitting.');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                ...form,
                previousCertificates: previousCerts.filter(c => c.level || c.board || c.year),
                photograph,
                idProof,
                previousCertificateFiles: certFiles,
                paymentProof,
                paymentScreenshot
            };

            await api.post('/registrations', payload);
            setSubmitted(true);
        } catch (err) {
            const msg = err?.response?.data?.error || err?.message || 'Failed to submit registration';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #fdfcff 0%, #f3f0ff 100%)',
                padding: '2rem'
            }}>
                <div className="card" style={{ maxWidth: '550px', width: '100%', padding: '3rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>✅</div>
                    <h2 style={{
                        background: 'var(--accent-gradient)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: '1rem'
                    }}>Application Submitted!</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: '1.6', marginBottom: '2rem' }}>
                        Your examination application has been submitted successfully.
                        You will receive an email with your login credentials once the admin reviews and approves your application.
                    </p>
                    <button onClick={() => navigate('/')} className="btn-primary" style={{ padding: '0.85rem 2rem', fontSize: '1rem' }}>
                        ← Back to Login
                    </button>
                </div>
            </div>
        );
    }

    const sectionHeaderStyle = {
        background: 'var(--accent-gradient)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        fontSize: '1.25rem',
        fontWeight: '700',
        marginBottom: '1.25rem',
        marginTop: '0.5rem',
        paddingBottom: '0.75rem',
        borderBottom: '2px solid rgba(124,58,237,0.15)'
    };

    const fileUploadStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.75rem 1rem',
        background: 'var(--bg-secondary)',
        borderRadius: '8px',
        border: '1px dashed var(--border)',
        cursor: 'pointer',
        transition: 'border-color 0.2s'
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #fdfcff 0%, #f3f0ff 100%)',
            padding: '2rem 1rem'
        }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>

                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        fontSize: '3rem',
                        marginBottom: '0.75rem',
                        display: 'inline-block',
                        padding: '0.85rem',
                        background: 'var(--bg-secondary)',
                        borderRadius: '20px'
                    }}>🎻</div>
                    <h1 style={{
                        background: 'var(--accent-gradient)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        fontSize: '2rem',
                        marginBottom: '0.5rem'
                    }}>Student Examination Application Form</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                        Veena Vani Music Institute — AUSS Examination Portal
                    </p>
                </div>

                {error && (
                    <div style={{
                        padding: '1rem',
                        marginBottom: '1.5rem',
                        backgroundColor: '#fef2f2',
                        color: '#dc2626',
                        borderRadius: '8px',
                        textAlign: 'center',
                        fontWeight: '500'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>

                    {/* Academic Course */}
                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <div style={sectionHeaderStyle}>📚 Academic Course</div>
                        <div className="form-group">
                            <label>Select Course *</label>
                            <select
                                value={form.academicCourse}
                                onChange={(e) => handleChange('academicCourse', e.target.value)}
                                required
                            >
                                <option value="">-- Select Course --</option>
                                <option value="certificate">Certificate</option>
                                <option value="diploma">Diploma</option>
                                <option value="pre-diploma">Pre-Diploma</option>
                                <option value="pro-diploma">Pro-Diploma</option>
                                <option value="degree">Degree</option>
                                <option value="masters_degree">Masters Degree</option>
                                <option value="phd">PhD</option>
                            </select>
                        </div>
                    </div>

                    {/* Section A: Candidate Information */}
                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <div style={sectionHeaderStyle}>SECTION A: Candidate Information</div>

                        <div className="form-group">
                            <label>Full Name *</label>
                            <input type="text" value={form.fullName} onChange={(e) => handleChange('fullName', e.target.value)} placeholder="Enter your full name" required />
                        </div>

                        <div className="grid grid-2">
                            <div className="form-group">
                                <label>Gender *</label>
                                <select value={form.gender} onChange={(e) => handleChange('gender', e.target.value)} required>
                                    <option value="">-- Select --</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Date of Birth *</label>
                                <input type="date" value={form.dateOfBirth} onChange={(e) => handleChange('dateOfBirth', e.target.value)} required />
                            </div>
                        </div>

                        <div className="grid grid-2">
                            <div className="form-group">
                                <label>Nationality *</label>
                                <input type="text" value={form.nationality} onChange={(e) => handleChange('nationality', e.target.value)} placeholder="e.g., Indian" required />
                            </div>
                            <div className="form-group">
                                <label>Highest Qualification *</label>
                                <input type="text" value={form.highestQualification} onChange={(e) => handleChange('highestQualification', e.target.value)} placeholder="e.g., Bachelor's Degree" required />
                            </div>
                        </div>

                        <div className="grid grid-2">
                            <div className="form-group">
                                <label>Mobile Number (WhatsApp) *</label>
                                <input type="tel" value={form.mobile} onChange={(e) => handleChange('mobile', e.target.value)} placeholder="+91 XXXXX XXXXX" required />
                            </div>
                            <div className="form-group">
                                <label>Email ID *</label>
                                <input type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="your.email@example.com" required />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Street Address *</label>
                            <input type="text" value={form.streetAddress} onChange={(e) => handleChange('streetAddress', e.target.value)} placeholder="Street address" required />
                        </div>

                        <div className="form-group">
                            <label>Apartment, suite, etc.</label>
                            <input type="text" value={form.apartment} onChange={(e) => handleChange('apartment', e.target.value)} placeholder="Apartment, suite, etc. (optional)" />
                        </div>

                        <div className="grid grid-2">
                            <div className="form-group">
                                <label>City *</label>
                                <input type="text" value={form.city} onChange={(e) => handleChange('city', e.target.value)} placeholder="City" required />
                            </div>
                            <div className="form-group">
                                <label>State/Province *</label>
                                <input type="text" value={form.state} onChange={(e) => handleChange('state', e.target.value)} placeholder="State/Province" required />
                            </div>
                        </div>

                        <div className="grid grid-2">
                            <div className="form-group">
                                <label>ZIP / Postal Code *</label>
                                <input type="text" value={form.zip} onChange={(e) => handleChange('zip', e.target.value)} placeholder="ZIP / Postal Code" required />
                            </div>
                            <div className="form-group">
                                <label>Country *</label>
                                <input type="text" value={form.country} onChange={(e) => handleChange('country', e.target.value)} placeholder="Country" required />
                            </div>
                        </div>
                    </div>

                    {/* Section B: Academic & Artistic Details */}
                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <div style={sectionHeaderStyle}>SECTION B: Academic & Artistic Details</div>

                        <div className="form-group">
                            <label>Discipline *</label>
                            <select value={form.discipline} onChange={(e) => handleChange('discipline', e.target.value)} required>
                                <option value="">-- Select Discipline --</option>
                                <option value="music">Music</option>
                                <option value="dance">Dance</option>
                                <option value="yoga">Yoga</option>
                                <option value="spiritual_and_allied_sciences">Spiritual & Allied Sciences</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Specific Subject / Art Form *</label>
                            <input type="text" value={form.specificSubject} onChange={(e) => handleChange('specificSubject', e.target.value)} placeholder="e.g., Carnatic Vocal, Bharatanatyam, Veena" required />
                        </div>
                    </div>

                    {/* Section C: Previous Qualifications */}
                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <div style={sectionHeaderStyle}>SECTION C: Previous Qualifications (if applicable)</div>

                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                            Add your previous certificates if any. This is optional.
                        </p>

                        {previousCerts.map((cert, index) => (
                            <div key={index} style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr 0.7fr auto',
                                gap: '0.75rem',
                                marginBottom: '0.75rem',
                                alignItems: 'flex-end'
                            }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    {index === 0 && <label>Level</label>}
                                    <input type="text" value={cert.level} onChange={(e) => updateCertRow(index, 'level', e.target.value)} placeholder="e.g., Grade 3" />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    {index === 0 && <label>Board / University</label>}
                                    <input type="text" value={cert.board} onChange={(e) => updateCertRow(index, 'board', e.target.value)} placeholder="e.g., Trinity" />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    {index === 0 && <label>Year</label>}
                                    <input type="text" value={cert.year} onChange={(e) => updateCertRow(index, 'year', e.target.value)} placeholder="2023" />
                                </div>
                                <div style={{ paddingBottom: '0.2rem' }}>
                                    {previousCerts.length > 1 && (
                                        <button type="button" onClick={() => removeCertRow(index)} className="btn-danger btn-sm" style={{ padding: '0.5rem 0.7rem' }}>✕</button>
                                    )}
                                </div>
                            </div>
                        ))}

                        <button type="button" onClick={addCertRow} className="btn-secondary" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                            + Add Another Certificate
                        </button>
                    </div>

                    {/* Section D: Documents Enclosed */}
                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <div style={sectionHeaderStyle}>SECTION D: Documents Enclosed</div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {/* Photograph */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: '600', fontSize: '0.9rem' }}>Photograph</label>
                                <label style={fileUploadStyle}>
                                    <span style={{ fontSize: '1.2rem' }}>📷</span>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', flex: 1 }}>
                                        {fileNames.photograph || 'No file chosen'}
                                    </span>
                                    <span className="btn-secondary btn-sm" style={{ flexShrink: 0 }}>Choose File</span>
                                    <input type="file" accept="image/*" onChange={handleFileUpload(setPhotograph, 'photograph')} style={{ display: 'none' }} />
                                </label>
                                {photograph && <img src={photograph} alt="Preview" style={{ marginTop: '0.5rem', width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '2px solid var(--border)' }} />}
                            </div>

                            {/* ID Proof */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: '600', fontSize: '0.9rem' }}>ID Proof</label>
                                <label style={fileUploadStyle}>
                                    <span style={{ fontSize: '1.2rem' }}>🪪</span>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', flex: 1 }}>
                                        {fileNames.idProof || 'No file chosen'}
                                    </span>
                                    <span className="btn-secondary btn-sm" style={{ flexShrink: 0 }}>Choose File</span>
                                    <input type="file" accept="image/*,.pdf" onChange={handleFileUpload(setIdProof, 'idProof')} style={{ display: 'none' }} />
                                </label>
                            </div>

                            {/* Previous Certificates */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: '600', fontSize: '0.9rem' }}>Previous Certificates (if any)</label>
                                <label style={fileUploadStyle}>
                                    <span style={{ fontSize: '1.2rem' }}>📜</span>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', flex: 1 }}>
                                        {fileNames.certFiles || 'No file chosen'}
                                    </span>
                                    <span className="btn-secondary btn-sm" style={{ flexShrink: 0 }}>Choose File</span>
                                    <input type="file" accept="image/*,.pdf" onChange={handleFileUpload(setCertFiles, 'certFiles')} style={{ display: 'none' }} />
                                </label>
                            </div>

                            {/* Examination Fee Payment Proof */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: '600', fontSize: '0.9rem' }}>Examination Fee Payment Proof</label>
                                <label style={fileUploadStyle}>
                                    <span style={{ fontSize: '1.2rem' }}>💳</span>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', flex: 1 }}>
                                        {fileNames.paymentProof || 'No file chosen'}
                                    </span>
                                    <span className="btn-secondary btn-sm" style={{ flexShrink: 0 }}>Choose File</span>
                                    <input type="file" accept="image/*,.pdf" onChange={handleFileUpload(setPaymentProof, 'paymentProof')} style={{ display: 'none' }} />
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Declaration */}
                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <div style={sectionHeaderStyle}>📋 Declaration</div>

                        <div style={{
                            background: 'var(--bg-secondary)',
                            borderRadius: '10px',
                            padding: '1.25rem',
                            border: '1px solid var(--border)',
                            marginBottom: '1.25rem'
                        }}>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.7', marginBottom: '0.75rem' }}>
                                I declare that all the information furnished above is correct. I understand that the examination and certification are conducted under the autonomous academic framework of AUSS.
                            </p>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.7' }}>
                                I agree to abide by the examination rules and the decision of the Examination Board.
                            </p>
                        </div>

                        <label style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.75rem',
                            cursor: 'pointer',
                            padding: '0.75rem',
                            borderRadius: '8px',
                            background: form.declarationAgreed ? 'rgba(5,150,105,0.06)' : 'transparent',
                            border: form.declarationAgreed ? '1px solid rgba(5,150,105,0.3)' : '1px solid var(--border)',
                            transition: 'all 0.2s'
                        }}>
                            <input
                                type="checkbox"
                                checked={form.declarationAgreed}
                                onChange={(e) => handleChange('declarationAgreed', e.target.checked)}
                                style={{ marginTop: '0.2rem', width: '18px', height: '18px', flexShrink: 0 }}
                            />
                            <span style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '0.9rem' }}>
                                I agree to the above declaration *
                            </span>
                        </label>

                        {/* Payment Screenshot */}
                        <div style={{ marginTop: '1.25rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: '600', fontSize: '0.9rem' }}>Upload Payment Screenshot</label>
                            <label style={fileUploadStyle}>
                                <span style={{ fontSize: '1.2rem' }}>📸</span>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', flex: 1 }}>
                                    {fileNames.paymentScreenshot || 'No file chosen'}
                                </span>
                                <span className="btn-secondary btn-sm" style={{ flexShrink: 0 }}>Choose File</span>
                                <input type="file" accept="image/*" onChange={handleFileUpload(setPaymentScreenshot, 'paymentScreenshot')} style={{ display: 'none' }} />
                            </label>
                            {paymentScreenshot && <img src={paymentScreenshot} alt="Payment Preview" style={{ marginTop: '0.5rem', maxWidth: '200px', borderRadius: '8px', border: '2px solid var(--border)' }} />}
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '1.1rem',
                            fontSize: '1.15rem',
                            fontWeight: '700',
                            letterSpacing: '0.5px',
                            marginBottom: '1.5rem'
                        }}
                    >
                        {loading ? '⏳ Submitting Application...' : '📋 SUBMIT APPLICATION'}
                    </button>

                    {/* Back to Login */}
                    <div style={{ textAlign: 'center' }}>
                        <button
                            type="button"
                            onClick={() => navigate('/')}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--accent-primary)',
                                cursor: 'pointer',
                                fontSize: '0.95rem',
                                fontWeight: '600',
                                textDecoration: 'underline'
                            }}
                        >
                            ← Back to Login
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RegistrationForm;
