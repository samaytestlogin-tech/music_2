const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Exam = require('../models/Exam');
const Result = require('../models/Result');
const Recording = require('../models/Recording');
const Certificate = require('../models/Certificate');
const { protect, admin } = require('../middleware/authMiddleware');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const sdk = require('node-appwrite');
const { users: appwriteUsers } = require('../lib/appwrite');

// Apply protection and admin check to all routes
router.use(protect);
router.use(admin);

// @route   GET /api/admin/users
// @desc    Get all users based on role query
router.get('/users', async (req, res) => {
    try {
        const role = req.query.role;
        const query = role ? { role } : {};
        const users = await User.find(query).select('-password');
        res.json({ users });
    } catch (error) {
        res.status(500).json({ error: 'Server error fetching users' });
    }
});

// @route   POST /api/admin/users/invite
// @desc    Admin invites/creates a new user
router.post('/users/invite', async (req, res) => {
    try {
        const { name, email, role } = req.body;

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const tempPassword = 'ChangeMe123!';

        let appwriteUser;
        try {
            appwriteUser = await appwriteUsers.create(
                sdk.ID.unique(),
                email,
                undefined, // phone
                tempPassword,
                name
            );
        } catch (appwriteErr) {
            console.error('Appwrite creation error in admin:', appwriteErr);
            return res.status(500).json({ error: 'Failed to create user in Appwrite Auth' });
        }

        const user = await User.create({
            name,
            email,
            password: tempPassword,
            role,
            profilePhoto: req.body.profilePhoto || '',
            accessAllExams: req.body.accessAllExams || false,
            assignedExams: req.body.assignedExams || [],
            appwriteId: appwriteUser.$id
        });

        res.status(201).json({ success: true, tempPassword });
    } catch (error) {
        console.error('Error inviting user:', error);
        res.status(500).json({ error: 'Server error inviting user' });
    }
});

// @route   PUT /api/admin/users/:id
// @desc    Update a user profile
router.put('/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.name = req.body.name || user.name;
        user.email = req.body.email || user.email;
        user.role = req.body.role || user.role;
        if (req.body.profilePhoto !== undefined) user.profilePhoto = req.body.profilePhoto;
        if (req.body.accessAllExams !== undefined) user.accessAllExams = req.body.accessAllExams;
        if (req.body.assignedExams) user.assignedExams = req.body.assignedExams;

        await user.save();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Server error updating user' });
    }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete a user
router.delete('/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        await User.deleteOne({ _id: req.params.id });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Server error deleting user' });
    }
});

// @route   GET /api/admin/exams
// @desc    Get all exams
router.get('/exams', async (req, res) => {
    try {
        const exams = await Exam.find().sort({ date: -1 });
        res.json({ exams });
    } catch (error) {
        res.status(500).json({ error: 'Server error fetching exams' });
    }
});

// @route   POST /api/admin/exams
// @desc    Create a new exam
router.post('/exams', async (req, res) => {
    try {
        console.log("Exam payload received:", req.body);

        let { student_id, evaluator_id, cross_examiner_id, ...examData } = req.body;

        // Frontend is sending "Student User (student@example.com)" instead of an ID
        // Let's extract the email to find the true user ID if it's not a valid ObjectId
        if (student_id && !mongoose.Types.ObjectId.isValid(student_id)) {
            const emailMatch = student_id.match(/\(([^)]+)\)/);
            if (emailMatch) {
                const user = await User.findOne({ email: emailMatch[1] });
                if (user) {
                    student_id = user._id;
                    examData.student_name = user.name;
                    examData.student_email = user.email; // Useful for evaluator view
                }
            }
        } else if (student_id) {
            const user = await User.findById(student_id);
            if (user) {
                examData.student_name = user.name;
                examData.student_email = user.email;
            }
        }

        if (evaluator_id && !mongoose.Types.ObjectId.isValid(evaluator_id)) {
            const emailMatch = evaluator_id.match(/\(([^)]+)\)/);
            if (emailMatch) {
                const user = await User.findOne({ email: emailMatch[1] });
                if (user) {
                    evaluator_id = user._id;
                    examData.evaluator_name = user.name;
                }
            }
        } else if (evaluator_id) {
            const user = await User.findById(evaluator_id);
            if (user) {
                examData.evaluator_name = user.name;
            }
        }

        // Resolve cross_examiner_id
        if (cross_examiner_id && cross_examiner_id !== '') {
            if (!mongoose.Types.ObjectId.isValid(cross_examiner_id)) {
                const emailMatch = cross_examiner_id.match(/\(([^)]+)\)/);
                if (emailMatch) {
                    const user = await User.findOne({ email: emailMatch[1] });
                    if (user) {
                        cross_examiner_id = user._id;
                        examData.cross_examiner_name = user.name;
                    }
                }
            } else {
                const user = await User.findById(cross_examiner_id);
                if (user) {
                    examData.cross_examiner_name = user.name;
                }
            }
            examData.cross_examiner_id = cross_examiner_id;
        }

        examData.student_id = student_id;
        examData.evaluator_id = evaluator_id;

        if (evaluator_id && cross_examiner_id && evaluator_id.toString() === cross_examiner_id.toString()) {
            return res.status(400).json({ error: 'Evaluator and Cross-Examiner cannot be the same person for an exam' });
        }

        // Also ensure duration is set if duration_minutes is provided but not duration
        if (examData.duration_minutes && !examData.duration) {
            examData.duration = examData.duration_minutes;
        }

        const exam = await Exam.create(examData);

        // Auto-add exam to cross-examiner's assignedExams
        if (cross_examiner_id && mongoose.Types.ObjectId.isValid(cross_examiner_id)) {
            await User.findByIdAndUpdate(cross_examiner_id, {
                $addToSet: { assignedExams: exam._id }
            });
        }

        res.status(201).json(exam);
    } catch (error) {
        console.error("Error creating exam:", error);
        res.status(500).json({ error: 'Server error creating exam', details: error.message });
    }
});

// @route   PUT /api/admin/exams/:id
// @desc    Update an exam
router.put('/exams/:id', async (req, res) => {
    try {
        let { student_id, evaluator_id, cross_examiner_id, ...examData } = req.body;

        // Resolve string IDs to ObjectIds and Names
        if (student_id && !mongoose.Types.ObjectId.isValid(student_id)) {
            const emailMatch = student_id.match(/\(([^)]+)\)/);
            if (emailMatch) {
                const user = await User.findOne({ email: emailMatch[1] });
                if (user) {
                    student_id = user._id;
                    examData.student_name = user.name;
                    examData.student_email = user.email;
                }
            }
        } else if (student_id) {
            const user = await User.findById(student_id);
            if (user) {
                examData.student_name = user.name;
                examData.student_email = user.email;
            }
        }

        if (evaluator_id && !mongoose.Types.ObjectId.isValid(evaluator_id)) {
            const emailMatch = evaluator_id.match(/\(([^)]+)\)/);
            if (emailMatch) {
                const user = await User.findOne({ email: emailMatch[1] });
                if (user) {
                    evaluator_id = user._id;
                    examData.evaluator_name = user.name;
                }
            }
        } else if (evaluator_id) {
            const user = await User.findById(evaluator_id);
            if (user) {
                examData.evaluator_name = user.name;
            }
        }

        // Resolve cross_examiner_id
        if (cross_examiner_id !== undefined) {
            if (cross_examiner_id && cross_examiner_id !== '') {
                if (!mongoose.Types.ObjectId.isValid(cross_examiner_id)) {
                    const emailMatch = cross_examiner_id.match(/\(([^)]+)\)/);
                    if (emailMatch) {
                        const user = await User.findOne({ email: emailMatch[1] });
                        if (user) {
                            cross_examiner_id = user._id;
                            examData.cross_examiner_name = user.name;
                        }
                    }
                } else {
                    const user = await User.findById(cross_examiner_id);
                    if (user) {
                        examData.cross_examiner_name = user.name;
                    }
                }
                examData.cross_examiner_id = cross_examiner_id;
            } else {
                // Cross-examiner was explicitly cleared
                examData.cross_examiner_id = null;
                examData.cross_examiner_name = null;
            }
        }

        if (student_id) examData.student_id = student_id;
        if (evaluator_id) examData.evaluator_id = evaluator_id;

        // Get old exam to handle cross-examiner reassignment
        const oldExam = await Exam.findById(req.params.id);
        if (!oldExam) return res.status(404).json({ error: 'Exam not found' });

        const finalEvaluatorId = evaluator_id || oldExam.evaluator_id;
        const finalCrossExaminerId = cross_examiner_id !== undefined ? cross_examiner_id : oldExam.cross_examiner_id;

        if (finalEvaluatorId && finalCrossExaminerId && finalEvaluatorId.toString() === finalCrossExaminerId.toString()) {
            return res.status(400).json({ error: 'Evaluator and Cross-Examiner cannot be the same person for an exam' });
        }

        if (examData.duration_minutes && !examData.duration) {
            examData.duration = examData.duration_minutes;
        }

        const exam = await Exam.findByIdAndUpdate(req.params.id, examData, { new: true });
        if (!exam) return res.status(404).json({ error: 'Exam not found' });

        // Update cross-examiner's assignedExams on the User model
        if (cross_examiner_id !== undefined) {
            // Remove exam from old cross-examiner's assignedExams
            if (oldExam?.cross_examiner_id && oldExam.cross_examiner_id.toString() !== (cross_examiner_id || '').toString()) {
                await User.findByIdAndUpdate(oldExam.cross_examiner_id, {
                    $pull: { assignedExams: exam._id }
                });
            }
            // Add exam to new cross-examiner's assignedExams
            if (cross_examiner_id && mongoose.Types.ObjectId.isValid(cross_examiner_id)) {
                await User.findByIdAndUpdate(cross_examiner_id, {
                    $addToSet: { assignedExams: exam._id }
                });
            }
        }

        res.json({ success: true, exam });
    } catch (error) {
        console.error("Error updating exam:", error);
        res.status(500).json({ error: 'Server error updating exam' });
    }
});

// @route   DELETE /api/admin/exams/:id
// @desc    Delete an exam
router.delete('/exams/:id', async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id);
        if (!exam) {
            return res.status(404).json({ error: 'Exam not found' });
        }
        await Exam.deleteOne({ _id: req.params.id });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Server error deleting exam' });
    }
});

// @route   GET /api/admin/marks
// @desc    Get all results
router.get('/marks', async (req, res) => {
    try {
        const marks = await Result.find();
        res.json({ marks });
    } catch (error) {
        res.status(500).json({ error: 'Server error fetching marks' });
    }
});

// @route   POST /api/admin/publish-results
// @desc    Publish array of given exam results
router.post('/publish-results', async (req, res) => {
    try {
        const { exam_ids } = req.body;
        await Exam.updateMany(
            { _id: { $in: exam_ids } },
            { $set: { results_published: true, status: 'published' } }
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Server error publishing results' });
    }
});

// @route   GET /api/admin/recordings
// @desc    Get all recordings from MongoDB
router.get('/recordings', async (req, res) => {
    try {
        const recordings = await Recording.find().sort({ createdAt: -1 });
        res.json({ recordings });
    } catch (error) {
        res.status(500).json({ error: 'Server error fetching recordings' });
    }
});

// @route   POST /api/admin/sync-recordings
// @desc    Pull all recordings from Daily.co API and save to MongoDB
//          This is needed when webhooks are not set up (e.g. running locally)
// @access  Admin
router.post('/sync-recordings', async (req, res) => {
    try {
        const DAILY_API_KEY = process.env.DAILY_API_KEY;
        if (!DAILY_API_KEY) {
            return res.status(500).json({ error: 'DAILY_API_KEY not configured' });
        }

        // Fetch all recordings from Daily.co REST API
        const dailyRes = await fetch('https://api.daily.co/v1/recordings', {
            headers: {
                Authorization: `Bearer ${DAILY_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!dailyRes.ok) {
            const errText = await dailyRes.text();
            return res.status(502).json({ error: 'Daily.co API error', details: errText });
        }

        const dailyData = await dailyRes.json();
        const dailyRecordings = dailyData.data || dailyData.recordings || [];

        let synced = 0;
        let skipped = 0;

        for (const rec of dailyRecordings) {
            const recordingId = rec.id || rec.recording_id;
            const downloadUrl = rec.download_link || rec.s3_key || '';

            // Get fresh access link for this recording
            let accessUrl = downloadUrl;
            try {
                const accessRes = await fetch(`https://api.daily.co/v1/recordings/${recordingId}/access-link`, {
                    headers: { Authorization: `Bearer ${DAILY_API_KEY}` }
                });
                if (accessRes.ok) {
                    const accessData = await accessRes.json();
                    accessUrl = accessData.download_link || accessUrl;
                }
            } catch (_) { /* use original url */ }

            if (!recordingId) { skipped++; continue; }

            // Check if already saved
            const existing = await Recording.findOne({ recording_id: recordingId });

            // Try to find matching exam by room name
            const roomName = rec.room_name || '';
            let exam = null;
            if (roomName) {
                exam = await Exam.findOne({
                    $or: [
                        { daily_room_name: roomName },
                        { recording_id: recordingId }
                    ]
                }).populate('student_id', 'name').populate('evaluator_id', 'name');
            }

            const duration = rec.duration || 0;
            const mins = Math.floor(duration / 60);
            const secs = Math.floor(duration % 60);
            const durationStr = `${mins}:${secs.toString().padStart(2, '0')}`;

            const recordingData = {
                exam_id: exam?._id || null,
                exam_name: exam?.name || roomName || 'Exam Recording',
                url: accessUrl || downloadUrl,
                video_url: accessUrl || downloadUrl,
                duration: durationStr,
                date: rec.start_ts ? new Date(rec.start_ts * 1000).toISOString() : new Date().toISOString(),
                student_name: exam?.student_id?.name || exam?.student_name || 'Unknown',
                evaluator_name: exam?.evaluator_id?.name || exam?.evaluator_name || 'Unknown',
                status: 'ready',
                recording_id: recordingId
            };

            if (existing) {
                await Recording.updateOne({ _id: existing._id }, recordingData);
            } else {
                await Recording.create(recordingData);
                synced++;
            }
        }

        // Return updated recordings list
        const allRecordings = await Recording.find().sort({ createdAt: -1 });
        res.json({
            success: true,
            message: `Synced ${synced} new recording(s), updated ${dailyRecordings.length - synced - skipped} existing.`,
            total_from_daily: dailyRecordings.length,
            recordings: allRecordings
        });
    } catch (error) {
        console.error('Sync recordings error:', error);
        res.status(500).json({ error: 'Server error syncing recordings', details: error.message });
    }
});


// ─── Certificate Routes ────────────────────────────────────────────────────

// @route   POST /api/admin/certificates
// @desc    Issue a certificate to a student
router.post('/certificates', async (req, res) => {
    try {
        const {
            student_id, exam_id,
            candidateName, gradeLevel, instrument,
            day, month, year,
            examCenter, awardedGrade,
            chiefExaminerName, chiefExaminerSignature,
            registrarName, registrarSignature
        } = req.body;

        if (!student_id || !candidateName || !gradeLevel || !day || !month || !year) {
            return res.status(400).json({ error: 'student_id, candidateName, gradeLevel, day, month, year are required' });
        }

        const certificate = await Certificate.create({
            student_id, exam_id: exam_id || null,
            candidateName, gradeLevel, instrument: instrument || '',
            day, month, year,
            examCenter: examCenter || '',
            awardedGrade: awardedGrade || '',
            chiefExaminerName: chiefExaminerName || '',
            chiefExaminerSignature: chiefExaminerSignature || '',
            registrarName: registrarName || '',
            registrarSignature: registrarSignature || ''
        });

        res.status(201).json({ success: true, certificate });
    } catch (error) {
        console.error('Error issuing certificate:', error);
        res.status(500).json({ error: 'Server error issuing certificate', details: error.message });
    }
});

// @route   GET /api/admin/certificates
// @desc    List all issued certificates
router.get('/certificates', async (req, res) => {
    try {
        const certificates = await Certificate.find()
            .populate('student_id', 'name email profilePhoto')
            .populate('exam_id', 'name title')
            .sort({ issuedAt: -1 });
        res.json({ certificates });
    } catch (error) {
        res.status(500).json({ error: 'Server error fetching certificates' });
    }
});

// @route   DELETE /api/admin/certificates/:id
// @desc    Delete a certificate
router.delete('/certificates/:id', async (req, res) => {
    try {
        await Certificate.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Server error deleting certificate' });
    }
});

module.exports = router;
