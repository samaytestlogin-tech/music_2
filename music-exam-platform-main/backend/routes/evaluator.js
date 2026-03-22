const express = require('express');
const router = express.Router();
const Exam = require('../models/Exam');
const Result = require('../models/Result');
const { protect, evaluator } = require('../middleware/authMiddleware');

router.use(protect);
router.use(evaluator);

// @route   GET /api/evaluator/exams
// @desc    Get all exams assigned to this evaluator
router.get('/exams', async (req, res) => {
    try {
        const exams = await Exam.find({ evaluator_id: req.user._id })
            .populate('student_id', 'profilePhoto name email')
            .sort({ date: 1 });
        res.json({ exams });
    } catch (error) {
        res.status(500).json({ error: 'Server error fetching evaluator exams' });
    }
});

// @route   POST /api/evaluator/marks
// @desc    Submit marks for an exam
router.post('/marks', async (req, res) => {
    try {
        const { exam_id, criteria } = req.body;

        const exam = await Exam.findById(exam_id);
        if (!exam) {
            return res.status(404).json({ error: 'Exam not found' });
        }

        // Ensure the evaluator compiling this is the one assigned
        if (exam.evaluator_id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized to mark this exam' });
        }

        const totalMarks = criteria.reduce((sum, c) => sum + c.marks, 0);

        const result = await Result.create({
            exam_id: exam._id,
            exam_title: exam.title || exam.name,
            exam_name: exam.name,
            student_id: exam.student_id,
            student_name: exam.student_name,
            evaluator_name: req.user.name,
            marks: totalMarks,
            total_marks: totalMarks,
            criteria: criteria,
            remarks: 'Evaluator assessment complete.', // Simplified for mapping
            date: new Date().toISOString().split('T')[0]
        });

        // Update exam status
        exam.status = 'completed';
        exam.marks_submitted = true;
        await exam.save();

        res.status(201).json({ success: true, result });
    } catch (error) {
        res.status(500).json({ error: 'Server error submitting marks' });
    }
});

module.exports = router;
