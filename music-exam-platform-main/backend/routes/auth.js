const express = require('express');
const jwt = require('jsonwebtoken');
const sdk = require('node-appwrite');
const User = require('../models/User');
const { users: appwriteUsers } = require('../lib/appwrite');
const router = express.Router();

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret', {
        expiresIn: '30d',
    });
};

// @desc    Auth user & signal OTP
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (user && (await user.matchPassword(password))) {
            // Instead of returning JWT, tell frontend to request OTP from Appwrite
            res.json({
                success: true,
                requireOtp: true,
                email: user.email,
                appwriteId: user.appwriteId
            });
        } else {
            res.status(401).json({ error: 'Invalid email or password' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// @desc    Verify Appwrite JWT and issue backend JWT
// @route   POST /api/auth/verify-otp
// @access  Public
router.post('/verify-otp', async (req, res) => {
    try {
        const { appwriteJwt } = req.body;

        if (!appwriteJwt) {
            return res.status(400).json({ error: 'No Appwrite token provided' });
        }

        // Verify the JWT via Appwrite
        const userClient = new sdk.Client()
            .setEndpoint(process.env.APPWRITE_ENDPOINT)
            .setProject(process.env.APPWRITE_PROJECT_ID)
            .setJWT(appwriteJwt);
        
        const account = new sdk.Account(userClient);
        const appwriteUser = await account.get();

        if (!appwriteUser || !appwriteUser.email) {
            return res.status(401).json({ error: 'Invalid Appwrite session' });
        }

        const user = await User.findOne({ email: appwriteUser.email });

        if (!user) {
            return res.status(404).json({ error: 'User not found in local database' });
        }

        // Issue our standard JWT
        res.json({
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id),
        });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(401).json({ error: 'OTP verification failed' });
    }
});

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ error: 'User already exists' });
        }

        let appwriteUser;
        try {
            // Also create in Appwrite
            appwriteUser = await appwriteUsers.create(
                sdk.ID.unique(),
                email,
                undefined, // phone
                password,
                name
            );
        } catch (appwriteErr) {
            console.error('Appwrite creation error:', appwriteErr);
            // If already exists in Appwrite, you might want to handle gracefully
            // For now, we will fail registration if Appwrite fails
            return res.status(500).json({ error: 'Failed to create user in Appwrite Auth' });
        }

        const user = await User.create({
            name,
            email,
            password,
            role: role || 'student',
            appwriteId: appwriteUser.$id
        });

        if (user) {
            res.status(201).json({
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ error: 'Invalid user data' });
        }
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Server error during registration' });
    }
});

module.exports = router;
