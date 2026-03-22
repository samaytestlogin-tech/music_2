require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const seedUsers = [
    {
        name: "Admin User",
        email: "admin@example.com",
        password: "password123",
        role: "admin"
    },
    {
        name: "Evaluator User",
        email: "evaluator@example.com",
        password: "password123",
        role: "evaluator"
    },
    {
        name: "Student User",
        email: "student@example.com",
        password: "password123",
        role: "student"
    }
];

const seedDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        console.log('MongoDB Connected. Clearing old users...');
        await User.deleteMany();

        console.log('Seeding default users...');
        for (let user of seedUsers) {
            await User.create(user);
        }

        console.log('Seed successful! Exiting...');
        process.exit();
    } catch (error) {
        console.error('Seed error:', error);
        process.exit(1);
    }
}

seedDatabase();
