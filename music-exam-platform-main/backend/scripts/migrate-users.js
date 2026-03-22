require('dotenv').config();
const mongoose = require('mongoose');
const sdk = require('node-appwrite');
const User = require('../models/User');

const client = new sdk.Client();

client
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const users = new sdk.Users(client);

const migrateUsers = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB.');

        // Find users that don't have an appwriteId
        const usersToMigrate = await User.find({ appwriteId: { $exists: false } });
        
        console.log(`Found ${usersToMigrate.length} users to migrate.`);

        for (const user of usersToMigrate) {
            try {
                console.log(`Migrating user: ${user.email}...`);
                
                // Generate a random password for Appwrite since they will only use OTP
                const randomPassword = sdk.ID.unique() + sdk.ID.unique();

                const appwriteUser = await users.create(
                    sdk.ID.unique(),
                    user.email,
                    undefined, // phone
                    randomPassword,
                    user.name
                );

                user.appwriteId = appwriteUser.$id;
                await user.save();
                
                console.log(`Successfully migrated ${user.email} (Appwrite ID: ${appwriteUser.$id})`);
            } catch (err) {
                console.error(`Error migrating ${user.email}:`, err.message);
                // If the error is that the user already exists in Appwrite, you might need to handle it.
            }
        }

        console.log('Migration complete!');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        mongoose.disconnect();
        process.exit(0);
    }
};

migrateUsers();
