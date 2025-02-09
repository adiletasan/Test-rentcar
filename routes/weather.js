// routes/weather.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { isAuthenticated } = require('../middleware/auth');
require('dotenv').config();

const API_KEY = process.env.API2_KEY;

// Helper function to determine driving conditions
function getDrivingConditions(weatherData) {
    const warnings = [];
    const recommendations = [];
    let riskLevel = 'low';

    const temp = weatherData.temp_c;
    const visibility = weatherData.vis_km;
    const windSpeed = weatherData.wind_kph;
    const condition = weatherData.condition.text.toLowerCase();

    // Check temperature conditions
    if (temp <= 0) {
        warnings.push('Risk of ice on roads');
        recommendations.push('Use winter tires');
        riskLevel = 'high';
    }

    // Check visibility conditions
    if (visibility < 1) {
        warnings.push('Extremely low visibility');
        recommendations.push('Use fog lights');
        riskLevel = 'severe';
    } else if (visibility < 3) {
        warnings.push('Reduced visibility');
        recommendations.push('Use regular lights');
        riskLevel = Math.max(riskLevel === 'severe' ? 2 : 1, 1);
    }

    // Check wind conditions
    if (windSpeed > 50) {
        warnings.push('Strong winds - vehicle stability affected');
        recommendations.push('Reduce speed and maintain firm grip');
    }

    // Check precipitation
    if (condition.includes('rain')) {
        warnings.push('Wet roads - increased braking distance');
        recommendations.push('Maintain safe distance');
    }
    if (condition.includes('snow')) {
        warnings.push('Snowy conditions - reduced traction');
        recommendations.push('Drive slowly and avoid sudden movements');
        riskLevel = 'high';
    }

    return {
        risk_level: riskLevel,
        warnings: warnings,
        recommendations: recommendations
    };
}

router.get('/', isAuthenticated, async (req, res) => {
    try {
        // Fetch current weather
        const response = await axios.get('http://api.weatherapi.com/v1/current.json', {
            params: {
                key: API_KEY,
                q: 'Astana',
                aqi: 'yes'
            }
        });

        const currentWeather = response.data.current;
        const drivingConditions = getDrivingConditions(currentWeather);

        // Format weather data with all required properties
        const weatherData = {
            current: {
                city: response.data.location.name,
                country: response.data.location.country,
                temperature: Math.round(currentWeather.temp_c),
                feels_like: Math.round(currentWeather.feelslike_c),
                description: currentWeather.condition.text,
                humidity: currentWeather.humidity,
                wind_speed: currentWeather.wind_kph,
                wind_direction: currentWeather.wind_dir,
                visibility: currentWeather.vis_km,
                pressure: currentWeather.pressure_mb,
                updated_at: new Date(currentWeather.last_updated).toLocaleTimeString(),
                // Add driving-specific information
                warnings: drivingConditions.warnings,
                recommendations: drivingConditions.recommendations,
                road_risk: drivingConditions.risk_level
            }
        };

        res.render('weather', {
            weather: weatherData,
            title: 'Driver Weather Information',
            error: null
        });

    } catch (error) {
        console.error('Error fetching weather:', error);
        const errorMessage = error.response?.status === 401 ? 
            'Invalid API key' : 
            'Failed to fetch weather data';

        res.render('weather', {
            weather: null,
            title: 'Weather Information',
            error: errorMessage
        });
    }
});

module.exports = router;