const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
    student_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    exam_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Exam',
        default: null
    },
    // Template fields matching the AUSS certificate
    candidateName: { type: String, required: true },
    gradeLevel: { type: String, required: true },     // "Grade/Level and Instrument"
    instrument: { type: String, default: '' },
    day: { type: String, required: true },            // Day of month
    month: { type: String, required: true },          // Month name
    year: { type: String, required: true },           // 4-digit year
    examCenter: { type: String, default: '' },        // Exam Centre Location
    awardedGrade: { type: String, default: '' },      // Result / Awarded Grade
    chiefExaminerName: { type: String, default: '' },
    chiefExaminerSignature: { type: String, default: '' }, // base64 image or text
    registrarName: { type: String, default: '' },
    registrarSignature: { type: String, default: '' },     // base64 image or text
    issuedAt: { type: Date, default: Date.now }
});

const Certificate = mongoose.model('Certificate', certificateSchema);
module.exports = Certificate;
