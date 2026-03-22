const express = require('express');
const router = express.Router();
const Exam = require('../models/Exam');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

// @route   GET /api/exams/:id/details
// @desc    Get details of a specific exam
router.get('/:id/details', async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id)
            .populate('student_id', 'profilePhoto name email')
            .populate('evaluator_id', 'profilePhoto name email');

        if (!exam) return res.status(404).json({ error: 'Exam not found' });

        // Authorization check
        // Note: student_id and evaluator_id are populated objects, so we use ._id for comparison
        const studentId = exam.student_id?._id || exam.student_id;
        const evaluatorId = exam.evaluator_id?._id || exam.evaluator_id;
        const isStudent = studentId && studentId.toString() === req.user._id.toString();
        const isEvaluator = evaluatorId && evaluatorId.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';
        const isCrossExaminer = req.user.role === 'cross_examiner' && (
            req.user.accessAllExams ||
            (req.user.assignedExams && req.user.assignedExams.some(id => id.toString() === exam._id.toString()))
        );

        if (!isStudent && !isEvaluator && !isAdmin && !isCrossExaminer) {
            return res.status(403).json({ error: 'Not authorized to view this exam' });
        }

        res.json({ exam });
    } catch (error) {
        res.status(500).json({ error: 'Server error fetching exam details' });
    }
});

// @route   GET /api/exams/:id/room-token
// @desc    Generate a real Daily.co room token
router.get('/:id/room-token', async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id);
        if (!exam) return res.status(404).json({ error: 'Exam not found' });

        const isEvaluator = exam.evaluator_id && exam.evaluator_id.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';
        const isCrossExaminer = req.user.role === 'cross_examiner' && (
            req.user.accessAllExams ||
            (req.user.assignedExams && req.user.assignedExams.some(id => id.toString() === exam._id.toString()))
        );
        const isOwner = isEvaluator || isAdmin || isCrossExaminer;

        const roomUrl = process.env.DAILY_ROOM_URL;
        const apiKey = process.env.DAILY_API_KEY;

        if (!roomUrl || !apiKey) {
            console.warn("DAILY_ROOM_URL or DAILY_API_KEY is missing. Falling back to mock token.");
            return res.json({
                token: 'mock-daily-co-token',
                room_url: roomUrl || 'https://music-exam-platform.daily.co/music-exam-platform'
            });
        }

        // Extract room name from URL (e.g., https://domain.daily.co/room-name -> room-name)
        const roomName = roomUrl.split('/').pop();

        // Calculate token expiry (exam duration + 30 mins buffer)
        // Set expiry to 2 hours from now as a safe default if duration is missing
        const durationMinutes = exam.duration || 60;
        const exp = Math.floor(Date.now() / 1000) + (durationMinutes * 60) + 1800; // 30 mins buffer

        // Call Daily.co API to create a meeting token
        const response = await fetch('https://api.daily.co/v1/meeting-tokens', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                properties: {
                    room_name: roomName,
                    is_owner: isOwner,
                    user_name: req.user.name,
                    user_id: req.user._id.toString(),
                    exp: exp,
                    start_cloud_recording: true,
                    enable_recording_ui: false
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Daily API Error:', errorText);
            throw new Error(`Failed to generate Daily token: ${response.statusText}`);
        }

        const data = await response.json();

        res.json({
            token: data.token,
            room_url: roomUrl
        });

    } catch (error) {
        console.error("Room Token Error:", error);
        res.status(500).json({ error: 'Server error generating room token', details: error.message });
    }
});

// @route   POST /api/exams/:id/start
// @desc    Mark an exam as in progress, set server-side timer, start Daily.co recording
router.post('/:id/start', async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id);
        if (!exam) return res.status(404).json({ error: 'Exam not found' });

        // If already started, return existing timer (idempotent)
        if (exam.started_at && exam.end_time) {
            return res.json({
                success: true,
                exam,
                already_started: true,
                started_at: exam.started_at,
                end_time: exam.end_time,
                server_time: new Date()
            });
        }

        const now = new Date();
        const durationMs = (exam.duration_minutes || exam.duration || 60) * 60 * 1000;
        const endTime = new Date(now.getTime() + durationMs);

        // Note: Daily.co cloud recording is automatically started by
        // the `start_cloud_recording: true` property in the meeting token.

        // Update exam with timer info
        exam.started_at = now;
        exam.end_time = endTime;
        exam.status = 'in_progress';
        await exam.save();

        res.json({
            success: true,
            exam,
            started_at: now,
            end_time: endTime,
            server_time: new Date(),
            recording_started: true
        });
    } catch (error) {
        console.error('Error starting exam:', error);
        res.status(500).json({ error: 'Server error starting exam' });
    }
});

// @route   GET /api/exams/:id/timer
// @desc    Get server-authoritative timer state (for sync & reload persistence)
router.get('/:id/timer', async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id);
        if (!exam) return res.status(404).json({ error: 'Exam not found' });

        res.json({
            started_at: exam.started_at,
            end_time: exam.end_time,
            server_time: new Date(),
            status: exam.status,
            duration_minutes: exam.duration_minutes || exam.duration
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error fetching timer' });
    }
});

// @route   POST /api/exams/:id/end
// @desc    End exam: stop recording, mark completed
router.post('/:id/end', async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id);
        if (!exam) return res.status(404).json({ error: 'Exam not found' });

        // Already completed? Return early
        if (exam.status === 'completed' || exam.status === 'published') {
            return res.json({ success: true, already_ended: true });
        }

        // Stop Daily.co cloud recording
        const roomUrl = process.env.DAILY_ROOM_URL;
        const apiKey = process.env.DAILY_API_KEY;

        if (roomUrl && apiKey) {
            try {
                // If we have the recording_id, stop that specific recording
                const recordingId = exam.recording_id;
                if (recordingId) {
                    const stopResponse = await fetch(`https://api.daily.co/v1/recordings/${recordingId}/stop`, {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    console.log('Daily.co recording stop response:', stopResponse.status);
                } else {
                    // Fallback: list active recordings and stop them
                    const roomName = roomUrl.split('/').pop();
                    const listRes = await fetch(`https://api.daily.co/v1/recordings?room_name=${roomName}&status=in-progress`, {
                        headers: { Authorization: `Bearer ${apiKey}` }
                    });
                    if (listRes.ok) {
                        const listData = await listRes.json();
                        for (const rec of (listData.data || [])) {
                            await fetch(`https://api.daily.co/v1/recordings/${rec.id}/stop`, {
                                method: 'POST',
                                headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
                            });
                        }
                    }
                }
            } catch (recErr) {
                console.error('Failed to stop Daily.co recording:', recErr.message);
            }
        }

        exam.status = 'completed';
        await exam.save();

        res.json({ success: true, exam });
    } catch (error) {
        console.error('Error ending exam:', error);
        res.status(500).json({ error: 'Server error ending exam' });
    }
});

module.exports = router;
