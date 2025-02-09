// routes/cars.js
const express = require('express');
const router = express.Router();
const CarData = require('../models/CarData');
const path = require('path');
const axios = require('axios');
const { put, del } = require('@vercel/blob');

// Middleware to check if user is logged in
const isAuthenticated = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/auth/login');
    }
    next();
};

// GET route to show add car form
router.get('/add', isAuthenticated, (req, res) => {
    res.render('partials/addCar');
});

// Fetch car specifications from API
async function fetchCarSpecs(brand, model, year) {
    try {
        const response = await axios.get('https://car-specs.p.rapidapi.com/v2/cars', {
            headers: {
                'X-RapidAPI-Key': process.env.RAPID_API_KEY,
                'X-RapidAPI-Host': 'car-specs.p.rapidapi.com'
            },
            params: { make: brand, model: model, year: year }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching car specs:', error);
        return null;
    }
}

// Helper function to handle image upload
async function handleImageUpload(file) {
    if (!file) return null;
    
    try {
        const timestamp = Date.now();
        const ext = path.extname(file.name);
        const filename = `${timestamp}${ext}`;
        
        const blob = await put(filename, file.data, {
            access: 'public',
            addRandomSuffix: true
        });
        
        return {
            url: blob.url,
            pathname: blob.pathname
        };
    } catch (error) {
        console.error('Error uploading to Vercel Blob:', error);
        throw new Error('Failed to upload image');
    }
}

// POST route to handle car addition
router.post('/add', isAuthenticated, async (req, res) => {
    try {
        const { model, brand, year, category, dailyRate, engineSize, transmission, acceleration, power } = req.body;
        let imageData = { url: '/default_car.jpg', pathname: null };

        if (req.files && req.files.image) {
            imageData = await handleImageUpload(req.files.image);
        }

        // Fetch additional specs from API
        const apiSpecs = await fetchCarSpecs(brand, model, year);

        // Create specifications map with both manual and API data
        const specsMap = new Map([
            ['engineSize', engineSize || ''],
            ['transmission', transmission || ''],
            ['acceleration', acceleration || ''],
            ['power', power || ''],
            ...(apiSpecs ? [
                ['fuelType', apiSpecs.fuelType || ''],
                ['bodyType', apiSpecs.bodyType || ''],
                ['driveType', apiSpecs.driveType || ''],
                ['cylinders', apiSpecs.cylinders || '']
            ] : [])
        ]);

        const newCar = new CarData({
            model,
            brand,
            year: parseInt(year),
            category,
            dailyRate: parseFloat(dailyRate),
            specifications: specsMap,
            image: imageData.url,
            imagePath: imageData.pathname,
            isAvailable: true,
            lastUpdated: new Date(),
            apiData: apiSpecs
        });

        await newCar.save();
        res.redirect('/cars');
    } catch (error) {
        console.error("Error creating car:", error);
        res.status(500).render('error', { error: 'Failed to create car' });
    }
});

// GET all cars with enhanced filtering and sorting
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const { brand, sort, category, minPrice, maxPrice, year } = req.query;
        let query = {};

        // Build query based on filters
        if (brand) query.brand = brand;
        if (category) query.category = category;
        if (year) query.year = parseInt(year);
        if (minPrice || maxPrice) {
            query.dailyRate = {};
            if (minPrice) query.dailyRate.$gte = parseFloat(minPrice);
            if (maxPrice) query.dailyRate.$lte = parseFloat(maxPrice);
        }

        // Build sort options
        let sortOption = {};
        switch (sort) {
            case 'price_desc': sortOption.dailyRate = -1; break;
            case 'price_asc': sortOption.dailyRate = 1; break;
            case 'year_desc': sortOption.year = -1; break;
            case 'year_asc': sortOption.year = 1; break;
        }

        const cars = await CarData.find(query).sort(sortOption);
        const brands = await CarData.distinct('brand');
        const categories = await CarData.distinct('category');

        res.render('cars', {
            cars,
            brand,
            sort,
            category,
            minPrice,
            maxPrice,
            year,
            brands,
            categories
        });
    } catch (error) {
        console.error("Error fetching cars:", error);
        res.status(500).render('error', { error: 'Failed to fetch cars' });
    }
});

// GET car details with enhanced API data
router.get('/:id', isAuthenticated, async (req, res) => {
    try {
        const car = await CarData.findById(req.params.id);
        if (!car) {
            return res.status(404).render('error', { error: 'Car not found' });
        }

        const shouldRefreshAPI = !car.apiData || 
            (new Date() - new Date(car.lastUpdated)) > (24 * 60 * 60 * 1000);

        if (shouldRefreshAPI) {
            const apiSpecs = await fetchCarSpecs(car.brand, car.model, car.year);
            if (apiSpecs) {
                car.apiData = apiSpecs;
                car.lastUpdated = new Date();
                await car.save();
            }
        }

        res.render('carDetails', { 
            car,
            apiData: car.apiData,
            specifications: Object.fromEntries(car.specifications)
        });
    } catch (error) {
        console.error("Error fetching car details:", error);
        res.status(500).render('error', { error: 'Failed to fetch car details' });
    }
});

// DELETE a car
router.delete('/:id', isAuthenticated, async (req, res) => {
    try {
        const car = await CarData.findById(req.params.id);
        if (!car) {
            return res.status(404).json({ error: 'Car not found' });
        }

        // Delete image from Vercel Blob Storage if it exists and isn't the default
        if (car.imagePath && !car.image.includes('default_car.jpg')) {
            try {
                await del(car.imagePath);
            } catch (error) {
                console.error('Error deleting image from Blob storage:', error);
            }
        }

        await car.deleteOne();
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting car:', error);
        res.status(500).json({ error: 'Failed to delete car' });
    }
});

// PUT route to update car
router.put('/:id', isAuthenticated, async (req, res) => {
    try {
        const { model, brand, year, category, dailyRate, specifications, isAvailable } = req.body;
        const apiSpecs = await fetchCarSpecs(brand, model, year);

        let updateData = {
            model,
            brand,
            year: parseInt(year),
            category,
            dailyRate: parseFloat(dailyRate),
            isAvailable: Boolean(isAvailable),
            lastUpdated: new Date(),
            apiData: apiSpecs || null
        };

        if (specifications || apiSpecs) {
            const specsMap = new Map([
                ...Object.entries(specifications || {}),
                ...(apiSpecs ? [
                    ['fuelType', apiSpecs.fuelType || ''],
                    ['bodyType', apiSpecs.bodyType || ''],
                    ['driveType', apiSpecs.driveType || ''],
                    ['cylinders', apiSpecs.cylinders || '']
                ] : [])
            ]);
            updateData.specifications = specsMap;
        }

        if (req.files && req.files.image) {
            const oldCar = await CarData.findById(req.params.id);
            
            // Delete old image from Blob storage if it exists and isn't the default
            if (oldCar.imagePath && !oldCar.image.includes('default_car.jpg')) {
                try {
                    await del(oldCar.imagePath);
                } catch (error) {
                    console.error('Error deleting old image from Blob storage:', error);
                }
            }

            // Upload new image
            const imageData = await handleImageUpload(req.files.image);
            updateData.image = imageData.url;
            updateData.imagePath = imageData.pathname;
        }

        const car = await CarData.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!car) {
            return res.status(404).json({ error: 'Car not found' });
        }

        res.json({ success: true, car });
    } catch (error) {
        console.error('Error updating car:', error);
        res.status(500).json({ error: 'Failed to update car' });
    }
});

module.exports = router;