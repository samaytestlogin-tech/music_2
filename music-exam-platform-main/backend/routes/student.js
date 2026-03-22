const express = require('express');
const router = express.Router();
const Exam = require('../models/Exam');
const Result = require('../models/Result');
const Certificate = require('../models/Certificate');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');
const bcrypt = require('bcryptjs');

router.use(protect);

// @route   GET /api/student/exams
// @desc    Get all exams assigned to this student
router.get('/exams', async (req, res) => {
    try {
        const exams = await Exam.find({ student_id: req.user._id })
            .populate('evaluator_id', 'profilePhoto name email')
            .sort({ date: 1 });
        res.json({ exams });
    } catch (error) {
        res.status(500).json({ error: 'Server error fetching student exams' });
    }
});

// @route   GET /api/student/results
// @desc    Get all results for this student
router.get('/results', async (req, res) => {
    try {
        const results = await Result.find({ student_id: req.user._id }).sort({ date: -1 });
        res.json({ results });
    } catch (error) {
        res.status(500).json({ error: 'Server error fetching student results' });
    }
});

// @route   GET /api/student/certificates
// @desc    Get all certificates for this student
router.get('/certificates', async (req, res) => {
    try {
        const certificates = await Certificate.find({ student_id: req.user._id })
            .sort({ issuedAt: -1 });
        res.json({ certificates });
    } catch (error) {
        res.status(500).json({ error: 'Server error fetching certificates' });
    }
});

// @route   PUT /api/student/change-password
// @desc    Change student's own password
router.put('/change-password', async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new password are required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }

        const user = await User.findById(req.user._id);
        const isMatch = await user.matchPassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        user.password = newPassword;
        await user.save();
        res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Server error changing password' });
    }
});

module.exports = router;
