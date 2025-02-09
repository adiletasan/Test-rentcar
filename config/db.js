// config/db.js
const mongoose = require('mongoose');

let cachedConnection = null;

const connectDB = async () => {
    if (cachedConnection) {
        return cachedConnection;
    }

    try {
        const options = {
            bufferCommands: false,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        };

        const conn = await mongoose.connect(process.env.MONGODB_URI, options);
        cachedConnection = conn;

        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
            cachedConnection = null;
        });

        mongoose.connection.on('disconnected', () => {
            console.log('MongoDB disconnected');
            cachedConnection = null;
        });

        // Add connection success handler
        mongoose.connection.on('connected', () => {
            console.log(`MongoDB connected successfully to ${conn.connection.host}`);
        });

        return conn;
    } catch (error) {
        console.error(`MongoDB connection error: ${error.message}`);
        cachedConnection = null;
        throw error;
    }
}

module.exports = connectDB;