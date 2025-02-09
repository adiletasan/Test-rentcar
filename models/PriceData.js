// models/PriceData
const mongoose = require('mongoose');

const priceDataSchema = new mongoose.Schema({
    carId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CarData',
        required: true
    },
    baseCurrency: {
        type: String,
        required: true,
        default: 'USD'
    },
    exchangeRates: {
        type: Map,
        of: Number
    },
    calculatedPrices: {
        type: Map,
        of: Number
    },
    apiResponse: {
        type: Object
    },
    requestTimestamp: {
        type: Date,
        default: Date.now
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

const PriceData = mongoose.model('PriceData', priceDataSchema);
module.exports = PriceData;