const mongoose = require('mongoose');

const previousCertSchema = new mongoose.Schema({
    level: String,
    board: String,
    year: String
}, { _id: false });

const registrationSchema = new mongoose.Schema({
    // Academic Course
    academicCourse: {
        type: String,
        enum: ['certificate', 'diploma', 'pre-diploma', 'pro-diploma', 'degree', 'masters_degree', 'phd'],
        required: true
    },

    // Section A: Candidate Information
    fullName: { type: String, required: true },
    gender: { type: String, enum: ['male', 'female', 'other'], required: true },
    dateOfBirth: { type: String, required: true },
    nationality: { type: String, required: true },
    highestQualification: { type: String, required: true },
    mobile: { type: String, required: true },
    email: { type: String, required: true },
    streetAddress: { type: String, required: true },
    apartment: { type: String, default: '' },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zip: { type: String, required: true },
    country: { type: String, required: true },

    // Section B: Academic & Artistic Details
    discipline: {
        type: String,
        enum: ['music', 'dance', 'yoga', 'spiritual_and_allied_sciences'],
        required: true
    },
    specificSubject: { type: String, required: true },

    // Section C: Previous Qualifications
    previousCertificates: [previousCertSchema],

    // Section D: Documents Enclosed (base64)
    photograph: { type: String, default: '' },
    idProof: { type: String, default: '' },
    previousCertificateFiles: { type: String, default: '' },
    paymentProof: { type: String, default: '' },

    // Declaration
    declarationAgreed: { type: Boolean, required: true },
    paymentScreenshot: { type: String, default: '' },

    // Admin Review
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending'
    },
    rejectionReason: { type: String, default: '' },
    adminNotes: { type: String, default: '' },
    reviewedAt: { type: Date, default: null },
    createdUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    createdAt: { type: Date, default: Date.now }
});

const Registration = mongoose.model('Registration', registrationSchema);
module.exports = Registration;
