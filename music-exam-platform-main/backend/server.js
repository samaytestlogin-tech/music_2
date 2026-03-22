require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: ['https://music-2-6fap.vercel.app', 'http://localhost:5173'],
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Database Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB Atlas Connected Successfully'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/evaluator', require('./routes/evaluator'));
app.use('/api/student', require('./routes/student'));
app.use('/api/exams', require('./routes/exams'));
app.use('/api/cross-examiner', require('./routes/crossExaminer'));
app.use('/api/certificates', require('./routes/certificates'));
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/registrations', require('./routes/registrations'));

// Start Server (only when not in Vercel serverless)
if (process.env.VERCEL !== '1') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

// Export for Vercel serverless
module.exports = app;
