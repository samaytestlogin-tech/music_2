const express = require('express');
const router = express.Router();
const Registration = require('../models/Registration');
const User = require('../models/User');
const sdk = require('node-appwrite');
const { protect, admin } = require('../middleware/authMiddleware');
const { users: appwriteUsers } = require('../lib/appwrite');
const { sendAcceptanceEmail, sendRejectionEmail } = require('../lib/resend');

// ─── PUBLIC ROUTE ──────────────────────────────────────────────────────────────

// @route   POST /api/registrations
// @desc    Submit a new registration application (public)
// @access  Public
router.post('/', async (req, res) => {
    try {
        const {
            academicCourse, fullName, gender, dateOfBirth, nationality,
            highestQualification, mobile, email, streetAddress, apartment,
            city, state, zip, country, discipline, specificSubject,
            previousCertificates, photograph, idProof, previousCertificateFiles,
            paymentProof, declarationAgreed, paymentScreenshot
        } = req.body;

        // Basic validation
        if (!fullName || !email || !mobile || !academicCourse || !discipline || !specificSubject) {
            return res.status(400).json({ error: 'Please fill in all required fields' });
        }

        if (!declarationAgreed) {
            return res.status(400).json({ error: 'You must agree to the declaration' });
        }

        // Check if email already registered
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ error: 'An account with this email already exists. Please login instead.' });
        }

        const existingRegistration = await Registration.findOne({
            email: email.toLowerCase(),
            status: 'pending'
        });
        if (existingRegistration) {
            return res.status(400).json({ error: 'You already have a pending registration application. Please wait for admin review.' });
        }

        const registration = await Registration.create({
            academicCourse,
            fullName,
            gender,
            dateOfBirth,
            nationality,
            highestQualification,
            mobile,
            email: email.toLowerCase(),
            streetAddress,
            apartment: apartment || '',
            city,
            state,
            zip,
            country,
            discipline,
            specificSubject,
            previousCertificates: previousCertificates || [],
            photograph: photograph || '',
            idProof: idProof || '',
            previousCertificateFiles: previousCertificateFiles || '',
            paymentProof: paymentProof || '',
            declarationAgreed,
            paymentScreenshot: paymentScreenshot || ''
        });

        res.status(201).json({
            success: true,
            message: 'Registration submitted successfully! You will be notified once the admin reviews your application.',
            registration_id: registration._id
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error processing registration', details: error.message });
    }
});

// ─── ADMIN ROUTES ──────────────────────────────────────────────────────────────

// @route   GET /api/registrations/admin
// @desc    Get all registrations
// @access  Admin
router.get('/admin', protect, admin, async (req, res) => {
    try {
        const registrations = await Registration.find().sort({ createdAt: -1 });
        res.json({ registrations });
    } catch (error) {
        res.status(500).json({ error: 'Server error fetching registrations' });
    }
});

// @route   GET /api/registrations/admin/:id
// @desc    Get single registration detail
// @access  Admin
router.get('/admin/:id', protect, admin, async (req, res) => {
    try {
        const registration = await Registration.findById(req.params.id);
        if (!registration) return res.status(404).json({ error: 'Registration not found' });
        res.json({ registration });
    } catch (error) {
        res.status(500).json({ error: 'Server error fetching registration' });
    }
});

// @route   POST /api/registrations/admin/:id/accept
// @desc    Accept registration, auto-create user account
// @access  Admin
router.post('/admin/:id/accept', protect, admin, async (req, res) => {
    try {
        // Safely access body — it is empty when called with no payload
        const body = req.body || {};

        const registration = await Registration.findById(req.params.id);
        if (!registration) return res.status(404).json({ error: 'Registration not found' });

        if (registration.status === 'accepted') {
            return res.status(400).json({ error: 'Registration already accepted' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: registration.email });
        if (existingUser) {
            return res.status(400).json({ error: 'A user with this email already exists' });
        }

        // Generate temporary password
        const tempPassword = 'Welcome@' + Math.random().toString(36).substring(2, 8).toUpperCase();

        // Try to create Appwrite user — NON-FATAL
        // If Appwrite fails for any reason, we still create the local account so login works
        let appwriteUserId = '';
        try {
            const appwriteUser = await appwriteUsers.create(
                sdk.ID.unique(),
                registration.email,
                undefined,     // phone (optional)
                tempPassword,
                registration.fullName
            );
            appwriteUserId = appwriteUser.$id;
        } catch (appwriteErr) {
            console.warn('Appwrite user creation skipped (non-fatal):', appwriteErr.message);
        }

        // Create local MongoDB user
        // The pre('save') hook in User.js will bcrypt-hash the password automatically
        const user = await User.create({
            name: registration.fullName,
            email: registration.email,
            password: tempPassword,
            role: 'student',
            appwriteId: appwriteUserId,
            profilePhoto: registration.photograph || ''
        });

        // Update registration status
        registration.status = 'accepted';
        registration.reviewedAt = new Date();
        registration.createdUserId = user._id;
        registration.adminNotes = body.adminNotes || '';
        await registration.save();

        // Send acceptance email with credentials (non-fatal)
        const emailResult = await sendAcceptanceEmail(
            registration.email,
            registration.fullName,
            tempPassword
        );

        res.json({
            success: true,
            message: 'Registration accepted! Student account created.',
            emailSent: emailResult.success,
            credentials: {
                email: registration.email,
                tempPassword: tempPassword
            },
            user_id: user._id
        });
    } catch (error) {
        console.error('Accept registration error:', error);
        res.status(500).json({ error: 'Server error accepting registration', details: error.message });
    }
});

// @route   POST /api/registrations/admin/:id/reject
// @desc    Reject a registration
// @access  Admin
router.post('/admin/:id/reject', protect, admin, async (req, res) => {
    try {
        // Safely access body
        const body = req.body || {};

        const registration = await Registration.findById(req.params.id);
        if (!registration) return res.status(404).json({ error: 'Registration not found' });

        if (registration.status !== 'pending') {
            return res.status(400).json({ error: 'Only pending registrations can be rejected' });
        }

        registration.status = 'rejected';
        registration.rejectionReason = body.reason || '';
        registration.adminNotes = body.adminNotes || '';
        registration.reviewedAt = new Date();
        await registration.save();

        // Send rejection email (non-fatal)
        const emailResult = await sendRejectionEmail(
            registration.email,
            registration.fullName,
            body.reason || ''
        );

        res.json({
            success: true,
            message: 'Registration rejected.',
            emailSent: emailResult.success
        });
    } catch (error) {
        console.error('Reject registration error:', error);
        res.status(500).json({ error: 'Server error rejecting registration' });
    }
});

module.exports = router;
