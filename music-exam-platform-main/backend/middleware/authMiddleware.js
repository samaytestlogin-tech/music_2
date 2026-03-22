const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];

            // Decode token
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');

            // Add user to request
            req.user = await User.findById(decoded.id).select('-password');

            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ error: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ error: 'Not authorized, no token' });
    }
};

const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(401).json({ error: 'Not authorized as an admin' });
    }
};

const evaluator = (req, res, next) => {
    if (req.user && (req.user.role === 'evaluator' || req.user.role === 'admin')) {
        next();
    } else {
        res.status(401).json({ error: 'Not authorized as an evaluator' });
    }
};

const crossExaminer = (req, res, next) => {
    if (req.user && (req.user.role === 'cross_examiner' || req.user.role === 'admin' || req.user.role === 'evaluator')) {
        next();
    } else {
        res.status(401).json({ error: 'Not authorized as a cross examiner' });
    }
};

module.exports = { protect, admin, evaluator, crossExaminer };
