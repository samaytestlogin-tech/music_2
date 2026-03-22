const mongoose = require('mongoose');

const recordingSchema = new mongoose.Schema({
    exam_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: false, default: null },
    exam_name: String,
    url: { type: String, required: true },
    video_url: { type: String, required: true },
    duration: String,
    date: String,
    student_name: String,
    evaluator_name: String,
    status: { type: String, enum: ['processing', 'ready', 'error'], default: 'processing' },
    recording_id: String,
    createdAt: { type: Date, default: Date.now }
});

const Recording = mongoose.model('Recording', recordingSchema);
module.exports = Recording;
