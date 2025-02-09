// routes/prices.js
const express = require('express');
const router = express.Router();
const PriceData = require('../models/PriceData');
const CarData = require('../models/CarData');
const axios = require('axios');

// Middleware to check if user is logged in
const isAuthenticated = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/auth/login');
    }
    next();
};

// Main prices route to show all cars with prices
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const cars = await CarData.find().select('brand model category year dailyRate specifications');
        
        // Fetch latest exchange rates for each car
        const priceData = await Promise.all(cars.map(async (car) => {
            const latestPrice = await PriceData.findOne({ carId: car._id })
                .sort({ requestTimestamp: -1 });
            return latestPrice;
        }));

        res.render('prices', { 
            cars,
            priceData,
            title: 'Car Prices'
        });
    } catch (error) {
        console.error('Error fetching prices:', error);
        res.status(500).render('error', { 
            error: 'Failed to fetch pricing information' 
        });
    }
});

// Get pricing for a specific car
router.get('/:carId', isAuthenticated, async (req, res) => {
    try {
        const car = await CarData.findById(req.params.carId);
        if (!car) {
            return res.status(404).render('error', { error: 'Car not found' });
        }

        // Example API call to Exchange Rate API
        const apiResponse = await axios.get(
            `https://api.exchangerate-api.com/v4/latest/USD`
        );

        // Store exchange rates and calculate prices
        const priceData = await PriceData.create({
            carId: car._id,
            baseCurrency: 'USD',
            exchangeRates: new Map(Object.entries(apiResponse.data.rates)),
            calculatedPrices: new Map(
                Object.entries(apiResponse.data.rates).map(([currency, rate]) => [
                    currency,
                    car.dailyRate * rate
                ])
            ),
            apiResponse: apiResponse.data
        });

        res.render('prices', { car, priceData });
    } catch (error) {
        res.status(500).render('error', { error: 'Failed to fetch pricing' });
    }
});

// Get price history for a car
router.get('/:carId/history', isAuthenticated, async (req, res) => {
    try {
        const priceHistory = await PriceData.find({ carId: req.params.carId })
            .sort({ requestTimestamp: -1 })
            .limit(10);
        
        res.render('priceHistory', { priceHistory });
    } catch (error) {
        res.status(500).render('error', { error: 'Failed to fetch price history' });
    }
});

module.exports = router;