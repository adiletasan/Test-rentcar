// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: null
    },
    deletedAt: {
        type: Date,
        default: null
    }
});

// Add this before creating the model to view existing indexes
userSchema.on('index', function(err) {
    if (err) {
        console.error('User Model Index error: %s', err);
    }
});

const User = mongoose.model('User', userSchema);

// Log existing indexes
User.collection.getIndexes()
    .then(indexes => {
        console.log('Current indexes:', indexes);
    })
    .catch(err => {
        console.error('Error fetching indexes:', err);
    });

module.exports = User;