const express = require('express');
const router = express.Router();
const Exam = require('../models/Exam');
const Recording = require('../models/Recording');

// @route   POST /api/webhooks/daily
// @desc    Receive Daily.co webhook events (recording.ready-to-download, etc.)
// @access  Public (no auth — verified by event structure)
router.post('/daily', async (req, res) => {
    try {
        const event = req.body;
        console.log('Daily.co webhook received:', event.type || 'unknown', JSON.stringify(event).substring(0, 500));

        // Handle recording ready event
        if (event.type === 'recording.ready-to-download') {
            const payload = event.payload || event;
            const downloadUrl = payload.download_link || payload.url || '';
            const roomName = payload.room_name || '';
            const duration = payload.duration || payload.max_participants_seconds || 0;
            const recordingId = payload.recording_id || payload.id || '';

            if (!downloadUrl) {
                console.warn('Webhook: No download URL in recording.ready-to-download event');
                return res.json({ received: true, warning: 'no download url' });
            }

            // Find the exam that matches this recording
            // Try by recording_id first, then by room_name (fallback)
            let exam = null;
            if (recordingId) {
                exam = await Exam.findOne({ recording_id: recordingId })
                    .populate('student_id', 'name')
                    .populate('evaluator_id', 'name');
            }

            // Fallback: find most recent in_progress or completed exam
            if (!exam) {
                exam = await Exam.findOne({
                    status: { $in: ['in_progress', 'completed'] }
                })
                    .sort({ started_at: -1 })
                    .populate('student_id', 'name')
                    .populate('evaluator_id', 'name');
            }

            if (!exam) {
                console.warn('Webhook: Could not find matching exam for recording');
                // Still save the recording as an orphan
                await Recording.create({
                    exam_id: null,
                    exam_name: roomName || 'Unknown Exam',
                    url: downloadUrl,
                    video_url: downloadUrl,
                    duration: formatDuration(duration),
                    date: new Date().toISOString(),
                    student_name: 'Unknown',
                    evaluator_name: 'Unknown',
                    status: 'ready',
                    recording_id: recordingId
                });
                return res.json({ received: true, matched_exam: false });
            }

            // Check if recording already exists for this exam
            const existingRecording = await Recording.findOne({
                $or: [
                    { recording_id: recordingId },
                    { exam_id: exam._id }
                ]
            });

            if (existingRecording) {
                // Update existing recording
                existingRecording.video_url = downloadUrl;
                existingRecording.url = downloadUrl;
                existingRecording.status = 'ready';
                existingRecording.recording_id = recordingId;
                if (duration) existingRecording.duration = formatDuration(duration);
                await existingRecording.save();
                console.log('Updated existing recording for exam:', exam._id);
            } else {
                // Create new recording entry
                await Recording.create({
                    exam_id: exam._id,
                    exam_name: exam.name || exam.title || 'Exam Recording',
                    url: downloadUrl,
                    video_url: downloadUrl,
                    duration: formatDuration(duration),
                    date: exam.date || new Date().toISOString(),
                    student_name: exam.student_id?.name || exam.student_name || 'Unknown',
                    evaluator_name: exam.evaluator_id?.name || exam.evaluator_name || 'Unknown',
                    status: 'ready',
                    recording_id: recordingId
                });
                console.log('Created recording for exam:', exam._id);
            }

            return res.json({ received: true, matched_exam: true, exam_id: exam._id });
        }

        // Handle other events we might care about
        if (event.type === 'recording.started') {
            console.log('Daily.co recording started event received');
        }

        if (event.type === 'recording.error') {
            console.error('Daily.co recording error:', event.payload);
        }

        res.json({ received: true });
    } catch (error) {
        console.error('Webhook processing error:', error);
        // Return 200 even on error so Daily doesn't retry indefinitely
        res.status(200).json({ received: true, error: error.message });
    }
});

// Helper: format duration in seconds to MM:SS string
function formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

module.exports = router;
