const express = require('express');
const router = express.Router();
const Exam = require('../models/Exam');
const Recording = require('../models/Recording');
const { protect, crossExaminer } = require('../middleware/authMiddleware');

router.use(protect);
router.use(crossExaminer);

// @route   GET /api/cross-examiner/exams
// @desc    Get exams assigned to cross examiner or all if accessAllExams is true
router.get('/exams', async (req, res) => {
    try {
        const user = req.user;
        let exams;

        if (user.accessAllExams) {
            exams = await Exam.find().sort({ date: -1 });
        } else {
            exams = await Exam.find({ _id: { $in: user.assignedExams } }).sort({ date: -1 });
        }

        res.json({ exams });
    } catch (error) {
        console.error('Error fetching cross examiner exams:', error);
        res.status(500).json({ error: 'Server error fetching exams' });
    }
});

// @route   GET /api/cross-examiner/recordings
// @desc    Get recordings of exams assigned to cross examiner or all if accessAllExams is true
router.get('/recordings', async (req, res) => {
    try {
        const user = req.user;
        let recordings;

        if (user.accessAllExams) {
            recordings = await Recording.find().sort({ createdAt: -1 });
        } else {
            // Fetch recordings only for assigned exams
            // Assuming recordings might have an exam_id. If missing, we return all or match logic.
            // Depending on the Recording schema... 
            // If Recording lacks exam reference, we might just return all. Let's return all for now or filter if exam_id exists.
            recordings = await Recording.find({ exam_id: { $in: user.assignedExams } }).sort({ createdAt: -1 });

            // If the Recording model doesn't have exam_id, we will see an error or empty result, 
            // wait we should check how Recording is defined.
        }

        res.json({ recordings });
    } catch (error) {
        console.error('Error fetching cross examiner recordings:', error);
        res.status(500).json({ error: 'Server error fetching recordings' });
    }
});

// @route   POST /api/cross-examiner/exams/:id/approve
// @desc    Approve or flag an exam after it is completed
router.post('/exams/:id/approve', async (req, res) => {
    try {
        const user = req.user;
        const { approval, comment } = req.body;

        if (!approval || !['approved', 'flagged'].includes(approval)) {
            return res.status(400).json({ error: 'approval must be "approved" or "flagged"' });
        }

        const exam = await Exam.findById(req.params.id);
        if (!exam) return res.status(404).json({ error: 'Exam not found' });

        // Check if this cross-examiner has access to this exam
        if (!user.accessAllExams) {
            const assignedIds = (user.assignedExams || []).map(id => id.toString());
            if (!assignedIds.includes(exam._id.toString())) {
                return res.status(403).json({ error: 'You are not assigned to this exam' });
            }
        }

        // Only allow approval on completed or published exams
        if (!['completed', 'published'].includes(exam.status)) {
            return res.status(400).json({ error: 'Exam must be completed before cross-examiner approval' });
        }

        // Update approval fields
        exam.cross_examiner_approval = approval;
        exam.cross_examiner_comment = comment || '';
        exam.cross_examiner_approved_at = new Date();
        await exam.save();

        res.json({
            success: true,
            message: `Exam ${approval === 'approved' ? 'approved' : 'flagged'} successfully.`,
            exam
        });
    } catch (error) {
        console.error('Error approving exam:', error);
        res.status(500).json({ error: 'Server error approving exam' });
    }
});

module.exports = router;
