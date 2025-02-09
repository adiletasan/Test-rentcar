// routes/news.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
require('dotenv').config();

const isAuthenticated = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/auth/login');
    }
    next();
};

router.get('/', isAuthenticated, async (req, res) => {
    try {
        // Get current date and format it
        const date = new Date();
        // Get news from 30 days ago
        date.setDate(date.getDate() - 30);
        const fromDate = date.toISOString().split('T')[0];

        const apiKey = process.env.API1_URL.split('apiKey=')[1];
        const response = await axios.get('https://newsapi.org/v2/everything', {
            params: {
                // Using multiple keywords to ensure car-related content
                q: '(car OR automobile OR vehicle) AND (new OR launch OR review OR technology)',
                language: 'en', // English articles only
                from: fromDate,
                sortBy: 'publishedAt',
                apiKey: apiKey,
                // Add domains for major automotive news sources
                domains: 'caranddriver.com,autocar.co.uk,motortrend.com,autoblog.com,cnet.com/roadshow'
            }
        });

        // Filter articles to ensure they're car-related
        const carArticles = response.data.articles.filter(article => {
            const title = article.title.toLowerCase();
            const description = article.description?.toLowerCase() || '';
            
            // Keywords that indicate car-related content
            const carKeywords = ['car', 'vehicle', 'automobile', 'suv', 'sedan', 'ev', 'electric vehicle', 'hybrid'];
            
            return carKeywords.some(keyword => 
                title.includes(keyword) || description.includes(keyword)
            );
        });

        res.render('news', {
            articles: carArticles,
            title: 'Car News'
        });
    } catch (error) {
        console.error('Error fetching news:', error);
        res.render('news', {
            articles: [],
            error: 'Failed to fetch car news'
        });
    }
});

module.exports = router;