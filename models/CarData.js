const mongoose = require('mongoose');

const carDataSchema = new mongoose.Schema({
    brand: {
        type: String,
        required: true
    },
    model: {
        type: String,
        required: true
    },
    year: {
        type: Number,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    dailyRate: {
        type: Number,
        required: true
    },
    specifications: {
        type: Map,
        of: String
    },
    // Updated image fields for Vercel Blob Storage
    image: {
        type: String,
        required: true,
        description: 'Full URL to the image in Vercel Blob Storage'
    },
    imagePath: {
        type: String,
        required: true,
        description: 'Vercel Blob pathname for image deletion'
    },
    isAvailable: {
        type: Boolean,
        default: true
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    apiData: {
        type: Object
    }
}, { 
    timestamps: true,
    // Add virtuals to JSON output
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Add a virtual property to get the image URL if needed
carDataSchema.virtual('imageUrl').get(function() {
    return this.image;
});

module.exports = mongoose.model('CarData', carDataSchema);