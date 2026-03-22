const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
    exam_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
    exam_title: String,
    exam_name: String,
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    student_name: String,
    evaluator_name: String,
    marks: { type: Number, required: true },
    total_marks: { type: Number, required: true },
    criteria: { type: mongoose.Schema.Types.Mixed },
    remarks: String,
    date: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const Result = mongoose.model('Result', resultSchema);
module.exports = Result;
