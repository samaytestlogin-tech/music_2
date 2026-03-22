const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
    name: { type: String, required: true },
    title: { type: String },
    description: { type: String },
    date: { type: String, required: true },
    time: { type: String, required: true },
    duration: { type: Number, required: true },
    duration_minutes: { type: Number, required: true },
    started_at: { type: Date, default: null },
    end_time: { type: Date, default: null },
    recording_id: { type: String, default: null },
    status: {
        type: String,
        enum: ['scheduled', 'in_progress', 'completed', 'published'],
        default: 'scheduled'
    },
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    evaluator_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    student_name: String,
    evaluator_name: String,
    cross_examiner_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    cross_examiner_name: String,
    cross_examiner_approval: {
        type: String,
        enum: ['pending', 'approved', 'flagged'],
        default: 'pending'
    },
    cross_examiner_comment: { type: String, default: '' },
    cross_examiner_approved_at: { type: Date, default: null },
    marks_submitted: { type: Boolean, default: false },
    results_published: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const Exam = mongoose.model('Exam', examSchema);
module.exports = Exam;
