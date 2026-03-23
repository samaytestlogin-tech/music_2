import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/api';

const AdminDashboard = () => {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('create');
    const [loading, setLoading] = useState(false);

    // Data states
    const [students, setStudents] = useState([]);
    const [evaluators, setEvaluators] = useState([]);
    const [crossExaminers, setCrossExaminers] = useState([]);
    const [exams, setExams] = useState([]);
    const [marks, setMarks] = useState([]);
    const [recordings, setRecordings] = useState([]);
    const [certificates, setCertificates] = useState([]);
    const [registrations, setRegistrations] = useState([]);
    const [selectedRegistration, setSelectedRegistration] = useState(null);
    const [regFilter, setRegFilter] = useState('pending');
    const [acceptingId, setAcceptingId] = useState(null);
    const [rejectingId, setRejectingId] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [credentialsModal, setCredentialsModal] = useState(null);
    // Recordings sync state
    const [syncingRecs, setSyncingRecs] = useState(false);
    const [syncMsg, setSyncMsg] = useState('');
    const [playingRec, setPlayingRec] = useState(null);

    // Certificate form state
    const [certForm, setCertForm] = useState({
        student_id: '', exam_id: '',
        candidateName: '', gradeLevel: '', instrument: '',
        day: '', month: '', year: new Date().getFullYear().toString(),
        examCenter: '', awardedGrade: '',
        chiefExaminerName: '', registrarName: ''
    });
    const [certSubmitting, setCertSubmitting] = useState(false);
    const [certSuccess, setCertSuccess] = useState('');

    // Form state
    const [examForm, setExamForm] = useState({
        name: '',
        date: '',
        time: '',
        duration_minutes: 30,
        student_id: '',
        evaluator_id: '',
        cross_examiner_id: ''
    });

    // Build deduplicated list of users eligible to be cross-examiners
    const crossExaminerOptions = (() => {
        const seen = new Set();
        const options = [];
        [...crossExaminers, ...evaluators].forEach(u => {
            const uid = u._id || u.id;
            if (!seen.has(uid)) {
                seen.add(uid);
                options.push(u);
            }
        });
        return options;
    })();

    const [selectedExams, setSelectedExams] = useState([]);
    const [editingUser, setEditingUser] = useState(null);
    const [editingExam, setEditingExam] = useState(null);

    const [newUserRole, setNewUserRole] = useState('student');
    const [newUserAccessAll, setNewUserAccessAll] = useState(false);
    const [newUserAssignedExams, setNewUserAssignedExams] = useState([]);
    const [newUserPhoto, setNewUserPhoto] = useState('');

    const handlePhotoUpload = (e, setPhotoFn) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { // 2MB limit
                alert("File is too large. Please select an image under 2MB.");
                e.target.value = null; // Clear input
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoFn(reader.result); // Base64 string
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm("Are you sure you want to delete this user?")) return;
        setLoading(true);
        try {
            await api.delete(`/admin/users/${userId}`);
            alert("User deleted successfully.");
            fetchData();
        } catch (error) {
            alert(error.response?.data?.error || "Failed to delete user.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                name: e.target.name.value,
                email: e.target.email.value,
                role: e.target.role.value,
                profilePhoto: editingUser.profilePhoto
            };
            if (payload.role === 'cross_examiner' || payload.role === 'evaluator') {
                payload.accessAllExams = editingUser.accessAllExams || false;
                payload.assignedExams = editingUser.assignedExams || [];
            }
            await api.put(`/admin/users/${editingUser._id}`, payload);
            alert("User updated successfully.");
            setEditingUser(null);
            fetchData();
        } catch (error) {
            alert(error.response?.data?.error || "Failed to update user.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteExam = async (examId) => {
        if (!window.confirm("Are you sure you want to delete this exam?")) return;
        setLoading(true);
        try {
            await api.delete(`/admin/exams/${examId}`);
            alert("Exam deleted successfully.");
            fetchData();
        } catch (error) {
            alert(error.response?.data?.error || "Failed to delete exam.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateExam = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.put(`/admin/exams/${editingExam._id}`, {
                name: e.target.name.value,
                date: e.target.date.value,
                time: e.target.time.value,
                duration_minutes: parseInt(e.target.duration_minutes.value),
                student_id: e.target.student_id.value,
                evaluator_id: e.target.evaluator_id.value,
                cross_examiner_id: editingExam.cross_examiner_id || ''
            });
            alert("Exam updated successfully.");
            setEditingExam(null);
            fetchData();
        } catch (error) {
            alert(error.response?.data?.error || "Failed to update exam.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [studentsRes, evaluatorsRes, crossRes, examsRes, marksRes, recordingsRes, certsRes, regsRes] = await Promise.all([
                api.get('/admin/users?role=student'),
                api.get('/admin/users?role=evaluator'),
                api.get('/admin/users?role=cross_examiner'),
                api.get('/admin/exams'),
                api.get('/admin/marks'),
                api.get('/admin/recordings'),
                api.get('/admin/certificates'),
                api.get('/registrations/admin')
            ]);

            setStudents(studentsRes.data.users || []);
            setEvaluators(evaluatorsRes.data.users || []);
            setCrossExaminers(crossRes.data.users || []);
            setExams(examsRes.data.exams || []);
            setMarks(marksRes.data.marks || []);
            setRecordings(recordingsRes.data.recordings || []);
            setCertificates(certsRes.data.certificates || []);
            setRegistrations(regsRes.data.registrations || []);
        } catch (error) {
            console.error('Error fetching admin data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateExam = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Find names for the record
            const student = students.find(s => s.id === examForm.student_id);
            const evaluator = evaluators.find(ev => ev.id === examForm.evaluator_id);

            const submittableForm = {
                ...examForm,
                student_name: student?.name || '',
                evaluator_name: evaluator?.name || ''
            };

            await api.post('/admin/exams', submittableForm);
            alert('Exam created successfully!');
            setExamForm({
                name: '',
                date: '',
                time: '',
                duration_minutes: 30,
                student_id: '',
                evaluator_id: '',
                cross_examiner_id: ''
            });
            fetchData(); // Refresh data
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to create exam');
        } finally {
            setLoading(false);
        }
    };

    const handlePublishResults = async () => {
        if (selectedExams.length === 0) {
            alert('Please select exams to publish');
            return;
        }

        setLoading(true);
        try {
            await api.post('/admin/publish-results', { exam_ids: selectedExams });
            alert(`Published results for ${selectedExams.length} exam(s)`);
            setSelectedExams([]);
            fetchData();
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to publish results');
        } finally {
            setLoading(false);
        }
    };

    const toggleExamSelection = (examId) => {
        setSelectedExams(prev =>
            prev.includes(examId)
                ? prev.filter(id => id !== examId)
                : [...prev, examId]
        );
    };

    return (
        <div className="container" style={{ minHeight: '100vh', paddingTop: '2rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1>Admin Dashboard</h1>
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
                {['create', 'users', 'exams', 'certificates', 'publish', 'recordings', 'registrations'].map(tab => {
                    const pendingCount = tab === 'registrations' ? registrations.filter(r => r.status === 'pending').length : 0;
                    return (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={activeTab === tab ? 'btn-primary' : 'btn-secondary'}
                            style={{ flex: 1, minWidth: '120px', position: 'relative' }}
                        >
                            {tab === 'create' && '➕ Create Exam'}
                            {tab === 'users' && '👥 Users'}
                            {tab === 'exams' && '📋 All Exams'}
                            {tab === 'certificates' && '🎓 Certificates'}
                            {tab === 'publish' && '📊 Publish'}
                            {tab === 'recordings' && '🎥 Recordings'}
                            {tab === 'registrations' && '📋 Registrations'}
                            {pendingCount > 0 && (
                                <span style={{
                                    position: 'absolute', top: '-6px', right: '-6px',
                                    background: '#ef4444', color: 'white', borderRadius: '50%',
                                    width: '22px', height: '22px', fontSize: '0.7rem', fontWeight: '800',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>{pendingCount}</span>
                            )}
                        </button>
                    );
                })}
            </div>

            // Replace the User Management Tab (around line 157) with this:
            {/* User Management Tab */}
            {activeTab === 'users' && (
                <div className="grid grid-2">
                    <div className="card">
                        <h3>Add New User</h3>
                        <p style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                            The user will be added to the system and assigned a role.
                        </p>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            const email = e.target.email.value;
                            const name = e.target.name.value;
                            const role = newUserRole;
                            setLoading(true);
                            try {
                                const payload = { email, name, role, profilePhoto: newUserPhoto };
                                if (role === 'cross_examiner' || role === 'evaluator') {
                                    payload.accessAllExams = newUserAccessAll;
                                    payload.assignedExams = newUserAssignedExams;
                                }
                                // Production logic: Admin invites user
                                const res = await api.post('/admin/users/invite', payload);
                                alert(`User added! Temporary password for ${email} is: ${res.data.tempPassword}`);
                                e.target.reset();
                                setNewUserRole('student');
                                setNewUserAccessAll(false);
                                setNewUserAssignedExams([]);
                                setNewUserPhoto('');
                                fetchData();
                            } catch (err) {
                                alert(err.response?.data?.error || err.message || 'Failed to add user');
                            } finally {
                                setLoading(false);
                            }
                        }}>
                            <div className="form-group">
                                <label>Full Name</label>
                                <input type="text" name="name" placeholder="John Doe" required />
                            </div>
                            <div className="form-group">
                                <label>Email Address</label>
                                <input type="email" name="email" placeholder="john@example.com" required />
                            </div>
                            <div className="form-group">
                                <label>Role</label>
                                <select
                                    name="role"
                                    required
                                    value={newUserRole}
                                    onChange={(e) => setNewUserRole(e.target.value)}
                                >
                                    <option value="student">Student</option>
                                    <option value="evaluator">Evaluator</option>
                                    <option value="admin">Admin</option>
                                    <option value="cross_examiner">Cross Examiner</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Profile Photo (Optional)</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handlePhotoUpload(e, setNewUserPhoto)}
                                />
                                {newUserPhoto && (
                                    <div style={{ marginTop: '0.5rem' }}>
                                        <img src={newUserPhoto} alt="Preview" style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }} />
                                    </div>
                                )}
                            </div>

                            {(newUserRole === 'cross_examiner' || newUserRole === 'evaluator') && (
                                <div className="form-group" style={{ marginTop: '1rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                        <input
                                            type="checkbox"
                                            checked={newUserAccessAll}
                                            onChange={(e) => setNewUserAccessAll(e.target.checked)}
                                        />
                                        Access All Exams as Cross-Examiner
                                    </label>

                                    {!newUserAccessAll && (
                                        <div>
                                            <label style={{ marginBottom: '0.5rem', display: 'block' }}>Assign Specific Exams for Cross-Examining</label>
                                            <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.5rem', background: 'var(--bg-primary)' }}>
                                                {exams.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No exams available to assign.</p>}
                                                {exams.map(exam => (
                                                    <label key={exam._id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0', fontSize: '0.85rem', cursor: 'pointer' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={newUserAssignedExams.includes(exam._id)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setNewUserAssignedExams(prev => [...prev, exam._id]);
                                                                } else {
                                                                    setNewUserAssignedExams(prev => prev.filter(id => id !== exam._id));
                                                                }
                                                            }}
                                                        />
                                                        {exam.name} ({new Date(exam.date).toLocaleDateString()})
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
                                {loading ? 'Adding...' : 'Add User'}
                            </button>
                        </form>
                    </div>

                    <div className="card">
                        <h3>Existing Users</h3>
                        <div style={{ maxHeight: '400px', overflowY: 'auto', marginTop: '1rem' }}>
                            <table style={{ background: 'none', boxShadow: 'none' }}>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Role</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[...students, ...evaluators, ...crossExaminers].map((u, i) => (
                                        <tr key={i}>
                                            <td>
                                                <div style={{ fontWeight: '500' }}>{u.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</div>
                                            </td>
                                            <td>
                                                <span className={`badge badge-${u.role === 'admin' ? 'error' : u.role === 'student' ? 'info' : 'warning'}`}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button
                                                        onClick={() => setEditingUser(u)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                                                        title="Edit User"
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteUser(u._id)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                                                        title="Delete User"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Edit User Modal Overlay */}
                    {editingUser && (
                        <div style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                        }}>
                            <div className="card" style={{ width: '400px' }}>
                                <h3>Edit User</h3>
                                <form onSubmit={handleUpdateUser}>
                                    <div className="form-group">
                                        <label>Full Name</label>
                                        <input type="text" name="name" defaultValue={editingUser.name} required />
                                    </div>
                                    <div className="form-group">
                                        <label>Email Address</label>
                                        <input type="email" name="email" defaultValue={editingUser.email} required />
                                    </div>
                                    <div className="form-group">
                                        <label>Role</label>
                                        <select
                                            name="role"
                                            required
                                            value={editingUser.role}
                                            onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                                        >
                                            <option value="student">Student</option>
                                            <option value="evaluator">Evaluator</option>
                                            <option value="admin">Admin</option>
                                            <option value="cross_examiner">Cross Examiner</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label>Profile Photo</label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => handlePhotoUpload(e, (photo) => setEditingUser({ ...editingUser, profilePhoto: photo }))}
                                        />
                                        {editingUser.profilePhoto && (
                                            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <img src={editingUser.profilePhoto} alt="Preview" style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }} />
                                                <button type="button" className="btn-danger btn-sm" onClick={() => setEditingUser({ ...editingUser, profilePhoto: '' })}>Remove Photo</button>
                                            </div>
                                        )}
                                    </div>

                                    {(editingUser.role === 'cross_examiner' || editingUser.role === 'evaluator') && (
                                        <div className="form-group" style={{ marginTop: '1rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                                <input
                                                    type="checkbox"
                                                    name="accessAllExams"
                                                    checked={editingUser.accessAllExams || false}
                                                    onChange={(e) => setEditingUser({ ...editingUser, accessAllExams: e.target.checked })}
                                                />
                                                Access All Exams as Cross-Examiner
                                            </label>

                                            {(!editingUser.accessAllExams) && (
                                                <div>
                                                    <label style={{ marginBottom: '0.5rem', display: 'block' }}>Assign Specific Exams for Cross-Examining</label>
                                                    <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.5rem', background: 'var(--bg-primary)' }}>
                                                        {exams.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No exams available to assign.</p>}
                                                        {exams.map(exam => (
                                                            <label key={exam._id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0', fontSize: '0.85rem', cursor: 'pointer' }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={(editingUser.assignedExams || []).includes(exam._id)}
                                                                    onChange={(e) => {
                                                                        const currentAssigned = editingUser.assignedExams || [];
                                                                        if (e.target.checked) {
                                                                            setEditingUser({ ...editingUser, assignedExams: [...currentAssigned, exam._id] });
                                                                        } else {
                                                                            setEditingUser({ ...editingUser, assignedExams: currentAssigned.filter(id => id !== exam._id) });
                                                                        }
                                                                    }}
                                                                />
                                                                {exam.name} ({new Date(exam.date).toLocaleDateString()})
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                                        <button type="button" className="btn-secondary" onClick={() => setEditingUser(null)} style={{ flex: 1 }}>
                                            Cancel
                                        </button>
                                        <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={loading}>
                                            {loading ? 'Saving...' : 'Save Changes'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Create Exam Tab */}
            {activeTab === 'create' && (
                <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
                    <h2 style={{ marginBottom: '1.5rem' }}>Create New Exam</h2>
                    <form onSubmit={handleCreateExam}>
                        <div className="form-group">
                            <label>Exam Name</label>
                            <input
                                type="text"
                                value={examForm.name}
                                onChange={(e) => setExamForm({ ...examForm, name: e.target.value })}
                                placeholder="e.g., Carnatic Vocal Exam"
                                required
                            />
                        </div>

                        <div className="grid grid-2">
                            <div className="form-group">
                                <label>Date</label>
                                <input
                                    type="date"
                                    value={examForm.date}
                                    onChange={(e) => setExamForm({ ...examForm, date: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Time</label>
                                <input
                                    type="time"
                                    value={examForm.time}
                                    onChange={(e) => setExamForm({ ...examForm, time: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Duration (minutes)</label>
                            <input
                                type="number"
                                value={examForm.duration_minutes}
                                onChange={(e) => setExamForm({ ...examForm, duration_minutes: parseInt(e.target.value) })}
                                min="1"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Select Student</label>
                            <select
                                value={examForm.student_id}
                                onChange={(e) => setExamForm({ ...examForm, student_id: e.target.value })}
                                required
                            >
                                <option value="">-- Choose Student --</option>
                                {students.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.name} ({s.email})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Select Evaluator</label>
                            <select
                                value={examForm.evaluator_id}
                                onChange={(e) => setExamForm({ ...examForm, evaluator_id: e.target.value })}
                                required
                            >
                                <option value="">-- Choose Evaluator --</option>
                                {evaluators.map(e => (
                                    <option key={e.id} value={e.id}>
                                        {e.name} ({e.email})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Select Cross-Examiner (Optional)</label>
                            <select
                                value={examForm.cross_examiner_id}
                                onChange={(e) => setExamForm({ ...examForm, cross_examiner_id: e.target.value })}
                            >
                                <option value="">-- None --</option>
                                {crossExaminerOptions
                                    .filter(ce => (ce._id || ce.id).toString() !== examForm.evaluator_id?.toString())
                                    .map(ce => (
                                        <option key={ce._id || ce.id} value={ce._id || ce.id}>
                                            {ce.name} ({ce.email}) — {ce.role === 'cross_examiner' ? 'Cross Examiner' : 'Evaluator'}
                                        </option>
                                    ))}
                            </select>
                        </div>

                        <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
                            {loading ? 'Creating...' : 'Create Exam'}
                        </button>
                    </form>
                </div>
            )}

            {/* All Exams Tab */}
            {activeTab === 'exams' && (
                <div>
                    <h2 style={{ marginBottom: '1.5rem' }}>All Exams ({exams.length})</h2>
                    {exams.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                            <p style={{ color: 'var(--text-muted)' }}>No exams created yet</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Exam Name</th>
                                        <th>Student</th>
                                        <th>Evaluator</th>
                                        <th>Cross-Examiner</th>
                                        <th>CE Approval</th>
                                        <th>Date & Time</th>
                                        <th>Status</th>
                                        <th>Marks</th>
                                        <th>Published</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {exams.map(exam => (
                                        <tr key={exam._id || Math.random()}>
                                            <td style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{exam.name}</td>
                                            <td>{exam.student_name}</td>
                                            <td>{exam.evaluator_name}</td>
                                            <td>{exam.cross_examiner_name || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>None</span>}</td>
                                            <td>
                                                {exam.cross_examiner_id ? (
                                                    <div style={{ position: 'relative' }}>
                                                        <span
                                                            className={`badge badge-${exam.cross_examiner_approval === 'approved' ? 'success' : exam.cross_examiner_approval === 'flagged' ? 'error' : 'info'}`}
                                                            title={exam.cross_examiner_comment ? `Comment: ${exam.cross_examiner_comment}` : 'No comment yet'}
                                                            style={{ cursor: exam.cross_examiner_comment ? 'help' : 'default' }}
                                                        >
                                                            {exam.cross_examiner_approval === 'approved' ? '✅ Approved' : exam.cross_examiner_approval === 'flagged' ? '⚠️ Flagged' : '⏳ Pending'}
                                                        </span>
                                                        {exam.cross_examiner_comment && (
                                                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                "{exam.cross_examiner_comment}"
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>—</span>
                                                )}
                                            </td>
                                            <td>{new Date(exam.date).toLocaleDateString()} {exam.time}</td>
                                            <td>
                                                <span className={`badge badge-${exam.status === 'completed' ? 'success' : exam.status === 'in_progress' ? 'warning' : 'info'}`}>
                                                    {exam.status}
                                                </span>
                                            </td>
                                            <td>{exam.marks_submitted ? '✅' : '⏳'}</td>
                                            <td>{exam.results_published ? '✅' : '⏳'}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button
                                                        onClick={() => setEditingExam(exam)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                                                        title="Edit Exam"
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteExam(exam._id)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                                                        title="Delete Exam"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Edit Exam Modal Overlay */}
            {editingExam && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="card" style={{ width: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3>Edit Exam</h3>
                        <form onSubmit={handleUpdateExam}>
                            <div className="form-group">
                                <label>Exam Name</label>
                                <input type="text" name="name" defaultValue={editingExam.name} required />
                            </div>

                            <div className="grid grid-2">
                                <div className="form-group">
                                    <label>Date</label>
                                    <input
                                        type="date"
                                        name="date"
                                        defaultValue={new Date(editingExam.date).toISOString().split('T')[0]}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Time</label>
                                    <input type="time" name="time" defaultValue={editingExam.time} required />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Duration (minutes)</label>
                                <input type="number" name="duration_minutes" defaultValue={editingExam.duration || editingExam.duration_minutes || 60} min="1" required />
                            </div>

                            <div className="form-group">
                                <label>Student</label>
                                <select name="student_id" defaultValue={editingExam.student_id ? editingExam.student_id.toString() : ""} required>
                                    <option value="">-- Choose Student --</option>
                                    {students.map(s => (
                                        <option key={s.id} value={s.id}>
                                            {s.name} ({s.email})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Evaluator</label>
                                <select name="evaluator_id" defaultValue={editingExam.evaluator_id ? editingExam.evaluator_id.toString() : ""} required>
                                    <option value="">-- Choose Evaluator --</option>
                                    {evaluators.map(e => (
                                        <option key={e.id} value={e.id}>
                                            {e.name} ({e.email})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Cross-Examiner (Optional)</label>
                                <select
                                    value={editingExam.cross_examiner_id ? editingExam.cross_examiner_id.toString() : ''}
                                    onChange={(e) => setEditingExam({ ...editingExam, cross_examiner_id: e.target.value })}
                                >
                                    <option value="">-- None --</option>
                                    {crossExaminerOptions
                                        .filter(ce => (ce._id || ce.id).toString() !== editingExam.evaluator_id?.toString())
                                        .map(ce => (
                                            <option key={ce._id || ce.id} value={ce._id || ce.id}>
                                                {ce.name} ({ce.email}) — {ce.role === 'cross_examiner' ? 'Cross Examiner' : 'Evaluator'}
                                            </option>
                                        ))}
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                                <button type="button" className="btn-secondary" onClick={() => setEditingExam(null)} style={{ flex: 1 }}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={loading}>
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}


            {/* ─── Certificates Tab ─────────────────────────────────────────── */}
            {activeTab === 'certificates' && (
                <div>
                    <h2 style={{ marginBottom: '1.5rem' }}>🎓 Issue Certificate of Completion</h2>
                    <div className="grid grid-2" style={{ alignItems: 'flex-start' }}>

                        {/* Issue Form */}
                        <div className="card">
                            <h3 style={{ marginBottom: '1.25rem' }}>Fill Certificate Details</h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                                Fields match the <strong>AUSS Official Certificate of Completion</strong> template.
                            </p>

                            {certSuccess && (
                                <div style={{ background: 'rgba(5,150,105,0.1)', border: '1px solid var(--success)', borderRadius: '8px', padding: '0.85rem 1rem', marginBottom: '1rem', color: 'var(--success)', fontWeight: '600' }}>
                                    ✅ {certSuccess}
                                </div>
                            )}

                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                setCertSubmitting(true);
                                setCertSuccess('');
                                try {
                                    await api.post('/admin/certificates', certForm);
                                    setCertSuccess('Certificate issued successfully!');
                                    setCertForm({
                                        student_id: '', exam_id: '',
                                        candidateName: '', gradeLevel: '', instrument: '',
                                        day: '', month: '', year: new Date().getFullYear().toString(),
                                        examCenter: '', awardedGrade: '',
                                        chiefExaminerName: '', registrarName: ''
                                    });
                                    fetchData();
                                } catch (err) {
                                    alert(err.response?.data?.error || 'Failed to issue certificate');
                                } finally {
                                    setCertSubmitting(false);
                                }
                            }}>

                                {/* Student */}
                                <div className="form-group">
                                    <label>Student *</label>
                                    <select
                                        value={certForm.student_id}
                                        required
                                        onChange={(e) => {
                                            const s = students.find(st => st._id === e.target.value);
                                            setCertForm(f => ({
                                                ...f,
                                                student_id: e.target.value,
                                                candidateName: s?.name || f.candidateName
                                            }));
                                        }}
                                    >
                                        <option value="">-- Select Student --</option>
                                        {students.map(s => (
                                            <option key={s._id} value={s._id}>{s.name} ({s.email})</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Optional: Link Exam */}
                                <div className="form-group">
                                    <label>Link Exam (Optional)</label>
                                    <select
                                        value={certForm.exam_id}
                                        onChange={(e) => {
                                            const ex = exams.find(x => x._id === e.target.value);
                                            if (ex) {
                                                const d = new Date(ex.date);
                                                setCertForm(f => ({
                                                    ...f,
                                                    exam_id: e.target.value,
                                                    gradeLevel: ex.name || f.gradeLevel,
                                                    day: d.getDate().toString(),
                                                    month: d.toLocaleString('default', { month: 'long' }),
                                                    year: d.getFullYear().toString(),
                                                }));
                                            } else {
                                                setCertForm(f => ({ ...f, exam_id: '' }));
                                            }
                                        }}
                                    >
                                        <option value="">-- None --</option>
                                        {exams.map(ex => (
                                            <option key={ex._id} value={ex._id}>{ex.name} – {ex.student_name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Certificate body fields */}
                                <div style={{ background: 'var(--bg-tertiary)', borderRadius: '10px', padding: '1rem', marginBottom: '1rem' }}>
                                    <p style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--accent-primary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Certificate Body</p>

                                    <div className="form-group">
                                        <label>Full Name of Candidate *</label>
                                        <input
                                            type="text"
                                            value={certForm.candidateName}
                                            onChange={(e) => setCertForm(f => ({ ...f, candidateName: e.target.value }))}
                                            placeholder="e.g., John Michael Smith"
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-2">
                                        <div className="form-group">
                                            <label>Grade / Level *</label>
                                            <input
                                                type="text"
                                                value={certForm.gradeLevel}
                                                onChange={(e) => setCertForm(f => ({ ...f, gradeLevel: e.target.value }))}
                                                placeholder="e.g., Grade 5"
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Instrument / Subject</label>
                                            <input
                                                type="text"
                                                value={certForm.instrument}
                                                onChange={(e) => setCertForm(f => ({ ...f, instrument: e.target.value }))}
                                                placeholder="e.g., Violin"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-2">
                                        <div className="form-group">
                                            <label>Day *</label>
                                            <input
                                                type="number"
                                                min="1" max="31"
                                                value={certForm.day}
                                                onChange={(e) => setCertForm(f => ({ ...f, day: e.target.value }))}
                                                placeholder="e.g., 14"
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Month *</label>
                                            <select value={certForm.month} onChange={(e) => setCertForm(f => ({ ...f, month: e.target.value }))} required>
                                                <option value="">-- Month --</option>
                                                {['January','February','March','April','May','June','July','August','September','October','November','December'].map(m => (
                                                    <option key={m} value={m}>{m}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-2">
                                        <div className="form-group">
                                            <label>Year *</label>
                                            <input
                                                type="number"
                                                min="2000" max="2100"
                                                value={certForm.year}
                                                onChange={(e) => setCertForm(f => ({ ...f, year: e.target.value }))}
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Awarded Grade / Result</label>
                                            <input
                                                type="text"
                                                value={certForm.awardedGrade}
                                                onChange={(e) => setCertForm(f => ({ ...f, awardedGrade: e.target.value }))}
                                                placeholder="e.g., Distinction"
                                            />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label>Examination Centre Location</label>
                                        <input
                                            type="text"
                                            value={certForm.examCenter}
                                            onChange={(e) => setCertForm(f => ({ ...f, examCenter: e.target.value }))}
                                            placeholder="e.g., Mumbai, Maharashtra, India"
                                        />
                                    </div>
                                </div>

                                {/* Signatory fields */}
                                <div style={{ background: 'var(--bg-tertiary)', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem' }}>
                                    <p style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--accent-primary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Signatories</p>
                                    <div className="grid grid-2">
                                        <div className="form-group">
                                            <label>Chief Examiner Name</label>
                                            <input
                                                type="text"
                                                value={certForm.chiefExaminerName}
                                                onChange={(e) => setCertForm(f => ({ ...f, chiefExaminerName: e.target.value }))}
                                                placeholder="Dr. Jane Doe"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>University Registrar Name</label>
                                            <input
                                                type="text"
                                                value={certForm.registrarName}
                                                onChange={(e) => setCertForm(f => ({ ...f, registrarName: e.target.value }))}
                                                placeholder="Prof. John Doe"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={certSubmitting}>
                                    {certSubmitting ? 'Issuing...' : '🎓 Issue Certificate'}
                                </button>
                            </form>
                        </div>

                        {/* Issued Certificates List */}
                        <div className="card">
                            <h3 style={{ marginBottom: '1.25rem' }}>Issued Certificates ({certificates.length})</h3>
                            {certificates.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎓</div>
                                    <p>No certificates issued yet</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                    {certificates.map(cert => (
                                        <div key={cert._id} style={{
                                            background: 'var(--bg-tertiary)',
                                            borderRadius: '10px',
                                            padding: '1rem',
                                            border: '1px solid var(--border)',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            gap: '1rem'
                                        }}>
                                            <div>
                                                <div style={{ fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                                                    {cert.candidateName}
                                                </div>
                                                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                                    {cert.gradeLevel}{cert.instrument ? ` — ${cert.instrument}` : ''} &nbsp;•&nbsp; {cert.awardedGrade || 'N/A'} &nbsp;•&nbsp; {cert.day} {cert.month} {cert.year}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                                    Issued: {new Date(cert.issuedAt).toLocaleDateString()}
                                                    {cert.student_id?.email ? ` · ${cert.student_id.email}` : ''}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                                                <a
                                                    href="#"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="btn-secondary btn-sm"
                                                    style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                                                    onClick={(e) => {
                                                        // Attach auth token to request via URL param not possible cleanly;
                                                        // open via fetch-blob approach
                                                        e.preventDefault();
                                                        const token = localStorage.getItem('token');
                                                        const apiUrl = import.meta.env.VITE_API_URL || '/api';
                                                        fetch(`${apiUrl}/certificates/${cert._id}/pdf`, {
                                                            headers: { Authorization: `Bearer ${token}` }
                                                        })
                                                        .then(r => r.blob())
                                                        .then(blob => {
                                                            const url = URL.createObjectURL(blob);
                                                            const a = document.createElement('a');
                                                            a.href = url;
                                                            a.download = `certificate-${cert.candidateName}.pdf`;
                                                            a.click();
                                                            URL.revokeObjectURL(url);
                                                        })
                                                        .catch(() => alert('Failed to download PDF'));
                                                    }}
                                                >
                                                    📄 PDF
                                                </a>
                                                <button
                                                    onClick={async () => {
                                                        if (!window.confirm('Delete this certificate?')) return;
                                                        await api.delete(`/admin/certificates/${cert._id}`);
                                                        fetchData();
                                                    }}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}
                                                    title="Delete"
                                                >🗑️</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Publish Results Tab */}

            {activeTab === 'publish' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2>Publish Results</h2>
                        <button
                            onClick={handlePublishResults}
                            className="btn-primary"
                            disabled={selectedExams.length === 0 || loading}
                        >
                            Publish Selected ({selectedExams.length})
                        </button>
                    </div>

                    {exams.filter(e => e.marks_submitted && !e.results_published).length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                            <p style={{ color: 'var(--text-muted)' }}>No exams ready to publish</p>
                        </div>
                    ) : (
                        <div className="grid">
                            {exams
                                .filter(e => e.marks_submitted && !e.results_published)
                                .map(exam => (
                                    <div
                                        key={exam._id || Math.random()}
                                        className="card"
                                        style={{
                                            cursor: 'pointer',
                                            border: selectedExams.includes(exam._id)
                                                ? '2px solid var(--accent-primary)'
                                                : '1px solid var(--border)'
                                        }}
                                        onClick={() => toggleExamSelection(exam._id)}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>{exam.name}</h3>
                                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                                    Student: {exam.student_name} | {new Date(exam.date).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={selectedExams.includes(exam._id)}
                                                onChange={() => { }}
                                                style={{ width: '20px', height: '20px' }}
                                            />
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>
            )}

            {/* Recordings Tab */}
            {activeTab === 'recordings' && (() => {
                const syncRecordings = async () => {
                    setSyncingRecs(true);
                    setSyncMsg('');
                    try {
                        const res = await api.post('/admin/sync-recordings');
                        setRecordings(res.data.recordings || []);
                        setSyncMsg(`✅ ${res.data.message}`);
                    } catch (err) {
                        setSyncMsg('❌ ' + (err?.response?.data?.error || 'Sync failed'));
                    } finally {
                        setSyncingRecs(false);
                    }
                };

                return (
                    <div>
                        {/* Video Player Modal */}
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
                                    <video
                                        src={playingRec.video_url}
                                        controls
                                        autoPlay
                                        style={{ width: '100%', borderRadius: '12px', maxHeight: '70vh', background: '#000' }}
                                        onError={() => {
                                            alert('Cannot play this video directly. The URL may have expired. Use the Download button instead, or sync again to refresh the link.');
                                            setPlayingRec(null);
                                        }}
                                    />
                                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                                        <a
                                            href={playingRec.video_url}
                                            download
                                            className="btn-primary"
                                            style={{ textDecoration: 'none', flex: 1, textAlign: 'center' }}
                                        >
                                            ⬇️ Download Recording
                                        </a>
                                        <a
                                            href={playingRec.video_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn-secondary"
                                            style={{ textDecoration: 'none', flex: 1, textAlign: 'center' }}
                                        >
                                            🔗 Open in New Tab
                                        </a>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                            <h2>🎥 Exam Recordings ({recordings.length})</h2>
                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                <button onClick={fetchData} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    🔄 Refresh
                                </button>
                                <button
                                    onClick={syncRecordings}
                                    disabled={syncingRecs}
                                    className="btn-primary"
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                >
                                    {syncingRecs ? '⏳ Syncing...' : '☁️ Sync from Daily.co'}
                                </button>
                            </div>
                        </div>

                        {syncMsg && (
                            <div style={{
                                padding: '0.75rem 1rem', marginBottom: '1rem', borderRadius: '8px',
                                background: syncMsg.startsWith('✅') ? '#f0fdf4' : '#fef2f2',
                                color: syncMsg.startsWith('✅') ? '#16a34a' : '#dc2626',
                                fontWeight: '600', fontSize: '0.9rem'
                            }}>
                                {syncMsg}
                            </div>
                        )}

                        {recordings.length === 0 ? (
                            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎥</div>
                                <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>No recordings found in database</p>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                                    Click <strong>"Sync from Daily.co"</strong> to pull all recordings directly from your Daily.co account.
                                </p>
                                <button onClick={syncRecordings} disabled={syncingRecs} className="btn-primary">
                                    {syncingRecs ? '⏳ Syncing...' : '☁️ Sync from Daily.co'}
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-2">
                                {recordings.map(rec => (
                                    <div key={rec._id || Math.random()} className="card">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                            <h3 style={{ fontSize: '1rem', marginBottom: '0' }}>{rec.exam_name || 'Exam Recording'}</h3>
                                            <span className={`badge ${rec.status === 'ready' ? 'badge-success' : rec.status === 'error' ? 'badge-error' : 'badge-warning'}`}
                                                style={{ fontSize: '0.7rem', flexShrink: 0 }}>
                                                {rec.status === 'ready' ? '✅ Ready' : rec.status === 'error' ? '❌ Error' : '🔄 Processing'}
                                            </span>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '1rem' }}>
                                            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.85rem' }}>
                                                👤 {rec.student_name || 'Unknown'}
                                                &nbsp;|&nbsp;👨‍🏫 {rec.evaluator_name || 'Unknown'}
                                            </p>
                                            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.85rem' }}>
                                                📅 {rec.date ? new Date(rec.date).toLocaleDateString() : 'N/A'}
                                                {rec.duration && <>&nbsp;|&nbsp;⏱️ {rec.duration}</>}
                                            </p>
                                        </div>

                                        {rec.status === 'ready' && rec.video_url ? (
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button
                                                    onClick={() => setPlayingRec(rec)}
                                                    className="btn-primary"
                                                    style={{ flex: 1, fontSize: '0.85rem' }}
                                                >
                                                    ▶️ Watch
                                                </button>
                                                <a
                                                    href={rec.video_url}
                                                    download
                                                    className="btn-secondary"
                                                    style={{ flex: 1, textDecoration: 'none', textAlign: 'center', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                >
                                                    ⬇️ Download
                                                </a>
                                                <a
                                                    href={rec.video_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="btn-secondary"
                                                    style={{ textDecoration: 'none', padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                    title="Open in new tab"
                                                >
                                                    🔗
                                                </a>
                                            </div>
                                        ) : rec.status === 'processing' ? (
                                            <button className="btn-secondary" disabled style={{ width: '100%' }}>
                                                ⏳ Processing...
                                            </button>
                                        ) : (
                                            <button className="btn-secondary" disabled style={{ width: '100%' }}>
                                                Not available
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* Registrations Tab */}
            {activeTab === 'registrations' && (
                <div>
                    <h2 style={{ marginBottom: '1.5rem' }}>📋 Registration Applications</h2>

                    {/* Credentials Modal */}
                    {credentialsModal && (
                        <div style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            zIndex: 1000
                        }} onClick={() => setCredentialsModal(null)}>
                            <div className="card" style={{ maxWidth: '450px', width: '90%', padding: '2rem' }} onClick={e => e.stopPropagation()}>
                                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                                    <div style={{ fontSize: '3rem' }}>✅</div>
                                    <h3>Account Created!</h3>
                                </div>
                                <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '10px', marginBottom: '1rem' }}>
                                    <p style={{ margin: '0.3rem 0', fontSize: '0.9rem' }}><strong>Email:</strong> {credentialsModal.email}</p>
                                    <p style={{ margin: '0.3rem 0', fontSize: '0.9rem' }}><strong>Temporary Password:</strong> {credentialsModal.tempPassword}</p>
                                </div>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '1rem' }}>
                                    Please share these credentials with the student. They can use these to login.
                                </p>
                                <button onClick={() => { navigator.clipboard.writeText(`Email: ${credentialsModal.email}\nPassword: ${credentialsModal.tempPassword}`); alert('Copied!'); }} className="btn-secondary" style={{ width: '100%', marginBottom: '0.5rem' }}>
                                    📋 Copy Credentials
                                </button>
                                <button onClick={() => setCredentialsModal(null)} className="btn-primary" style={{ width: '100%' }}>
                                    Close
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Detail Modal */}
                    {selectedRegistration && (
                        <div style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            zIndex: 1000
                        }} onClick={() => setSelectedRegistration(null)}>
                            <div className="card" style={{
                                maxWidth: '700px', width: '95%', maxHeight: '85vh', overflowY: 'auto',
                                padding: '2rem'
                            }} onClick={e => e.stopPropagation()}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <h3>Application Details</h3>
                                    <button onClick={() => setSelectedRegistration(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
                                </div>

                                <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '10px', marginBottom: '1rem' }}>
                                    <h4 style={{ marginBottom: '0.5rem', color: 'var(--accent-primary)' }}>📚 Course</h4>
                                    <p>{selectedRegistration.academicCourse?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                                </div>

                                <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '10px', marginBottom: '1rem' }}>
                                    <h4 style={{ marginBottom: '0.5rem', color: 'var(--accent-primary)' }}>Section A: Candidate Information</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                        <p><strong>Name:</strong> {selectedRegistration.fullName}</p>
                                        <p><strong>Gender:</strong> {selectedRegistration.gender}</p>
                                        <p><strong>DOB:</strong> {selectedRegistration.dateOfBirth}</p>
                                        <p><strong>Nationality:</strong> {selectedRegistration.nationality}</p>
                                        <p><strong>Qualification:</strong> {selectedRegistration.highestQualification}</p>
                                        <p><strong>Mobile:</strong> {selectedRegistration.mobile}</p>
                                        <p style={{ gridColumn: '1 / -1' }}><strong>Email:</strong> {selectedRegistration.email}</p>
                                        <p style={{ gridColumn: '1 / -1' }}><strong>Address:</strong> {selectedRegistration.streetAddress}{selectedRegistration.apartment ? ', ' + selectedRegistration.apartment : ''}, {selectedRegistration.city}, {selectedRegistration.state} {selectedRegistration.zip}, {selectedRegistration.country}</p>
                                    </div>
                                </div>

                                <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '10px', marginBottom: '1rem' }}>
                                    <h4 style={{ marginBottom: '0.5rem', color: 'var(--accent-primary)' }}>Section B: Academic Details</h4>
                                    <p><strong>Discipline:</strong> {selectedRegistration.discipline?.replace(/_/g, ' & ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                                    <p><strong>Subject:</strong> {selectedRegistration.specificSubject}</p>
                                </div>

                                {selectedRegistration.previousCertificates?.length > 0 && (
                                    <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '10px', marginBottom: '1rem' }}>
                                        <h4 style={{ marginBottom: '0.5rem', color: 'var(--accent-primary)' }}>Section C: Previous Qualifications</h4>
                                        <table style={{ width: '100%', fontSize: '0.85rem' }}>
                                            <thead><tr><th style={{ textAlign: 'left', padding: '0.3rem' }}>Level</th><th style={{ textAlign: 'left', padding: '0.3rem' }}>Board/University</th><th style={{ textAlign: 'left', padding: '0.3rem' }}>Year</th></tr></thead>
                                            <tbody>
                                                {selectedRegistration.previousCertificates.map((c, i) => (
                                                    <tr key={i}><td style={{ padding: '0.3rem' }}>{c.level}</td><td style={{ padding: '0.3rem' }}>{c.board}</td><td style={{ padding: '0.3rem' }}>{c.year}</td></tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '10px', marginBottom: '1rem' }}>
                                    <h4 style={{ marginBottom: '0.75rem', color: 'var(--accent-primary)' }}>Section D: Documents</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                        {[['Photograph', selectedRegistration.photograph], ['ID Proof', selectedRegistration.idProof], ['Certificates', selectedRegistration.previousCertificateFiles], ['Payment Proof', selectedRegistration.paymentProof], ['Payment Screenshot', selectedRegistration.paymentScreenshot]].map(([label, src]) => (
                                            <div key={label}>
                                                <p style={{ fontWeight: '600', fontSize: '0.8rem', marginBottom: '0.3rem' }}>{label}</p>
                                                {src ? (
                                                    src.startsWith('data:image') ? (
                                                        <img src={src} alt={label} style={{ width: '100%', maxHeight: '150px', objectFit: 'contain', borderRadius: '6px', border: '1px solid var(--border)', background: 'white' }} />
                                                    ) : (
                                                        <a href={src} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm" style={{ display: 'inline-block', fontSize: '0.75rem' }}>View Document</a>
                                                    )
                                                ) : (
                                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Not uploaded</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Accept/Reject Buttons */}
                                {selectedRegistration.status === 'pending' && (
                                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                                        <button
                                            onClick={async () => {
                                                if (!window.confirm('Accept this registration and create a student account?')) return;
                                                setAcceptingId(selectedRegistration._id);
                                                try {
                                                    const res = await api.post(`/registrations/admin/${selectedRegistration._id}/accept`);
                                                    setCredentialsModal(res.data.credentials);
                                                    setSelectedRegistration(null);
                                                    fetchData();
                                                } catch (err) {
                                                    alert(err?.response?.data?.error || 'Failed to accept');
                                                } finally { setAcceptingId(null); }
                                            }}
                                            className="btn-primary"
                                            disabled={acceptingId === selectedRegistration._id}
                                            style={{ flex: 1 }}
                                        >
                                            {acceptingId === selectedRegistration._id ? '⏳ Creating Account...' : '✅ Accept & Create Account'}
                                        </button>
                                        <button
                                            onClick={async () => {
                                                const reason = prompt('Rejection reason (optional):');
                                                if (reason === null) return;
                                                setRejectingId(selectedRegistration._id);
                                                try {
                                                    await api.post(`/registrations/admin/${selectedRegistration._id}/reject`, { reason });
                                                    alert('Registration rejected.');
                                                    setSelectedRegistration(null);
                                                    fetchData();
                                                } catch (err) {
                                                    alert(err?.response?.data?.error || 'Failed to reject');
                                                } finally { setRejectingId(null); }
                                            }}
                                            className="btn-secondary"
                                            disabled={rejectingId === selectedRegistration._id}
                                            style={{ flex: 1, borderColor: '#ef4444', color: '#ef4444' }}
                                        >
                                            {rejectingId === selectedRegistration._id ? '⏳...' : '❌ Reject'}
                                        </button>
                                    </div>
                                )}
                                {selectedRegistration.status === 'accepted' && (
                                    <div style={{ background: '#f0fdf4', padding: '0.75rem', borderRadius: '8px', textAlign: 'center', color: '#16a34a', fontWeight: '600' }}>
                                        ✅ Accepted — Account created
                                    </div>
                                )}
                                {selectedRegistration.status === 'rejected' && (
                                    <div style={{ background: '#fef2f2', padding: '0.75rem', borderRadius: '8px', color: '#dc2626' }}>
                                        ❌ Rejected{selectedRegistration.rejectionReason ? `: ${selectedRegistration.rejectionReason}` : ''}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Filter Tabs */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        {['pending', 'accepted', 'rejected'].map(status => {
                            const count = registrations.filter(r => r.status === status).length;
                            return (
                                <button
                                    key={status}
                                    onClick={() => setRegFilter(status)}
                                    className={regFilter === status ? 'btn-primary' : 'btn-secondary'}
                                    style={{ textTransform: 'capitalize' }}
                                >
                                    {status === 'pending' && '⏳'} {status === 'accepted' && '✅'} {status === 'rejected' && '❌'} {status} ({count})
                                </button>
                            );
                        })}
                    </div>

                    {/* Registration List */}
                    {registrations.filter(r => r.status === regFilter).length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
                            <p style={{ color: 'var(--text-muted)' }}>No {regFilter} registrations</p>
                        </div>
                    ) : (
                        <div className="grid grid-2">
                            {registrations.filter(r => r.status === regFilter).map(reg => (
                                <div key={reg._id} className="card" style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                                    onClick={() => setSelectedRegistration(reg)}
                                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            {reg.photograph ? (
                                                <img src={reg.photograph} alt="" style={{ width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} />
                                            ) : (
                                                <div style={{ width: '45px', height: '45px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>👤</div>
                                            )}
                                            <div>
                                                <h3 style={{ fontSize: '1rem', marginBottom: '0.1rem' }}>{reg.fullName}</h3>
                                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{reg.email}</p>
                                            </div>
                                        </div>
                                        <span className={`badge ${reg.status === 'accepted' ? 'badge-success' : reg.status === 'rejected' ? 'badge-error' : 'badge-warning'}`}
                                            style={{ fontSize: '0.65rem', textTransform: 'capitalize' }}>
                                            {reg.status}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem' }}>
                                        <span style={{ background: 'var(--bg-secondary)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem' }}>
                                            📚 {reg.academicCourse?.replace(/_/g, ' ')}
                                        </span>
                                        <span style={{ background: 'var(--bg-secondary)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem' }}>
                                            🎵 {reg.discipline?.replace(/_/g, ' ')}
                                        </span>
                                        <span style={{ background: 'var(--bg-secondary)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem' }}>
                                            📱 {reg.mobile}
                                        </span>
                                    </div>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                                        Applied: {new Date(reg.createdAt).toLocaleDateString()} {new Date(reg.createdAt).toLocaleTimeString()}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
