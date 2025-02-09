// app.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const methodOverride = require('method-override');
const path = require('path');
const connectDB = require('./config/db');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const fileUpload = require('express-fileupload');
const MongoStore = require('connect-mongo');

// Initialize express
const app = express();

// Database Initialization
async function initializeDatabase() {
    try {
        await connectDB();
        console.log('Connected to MongoDB');

        // Create admin user if doesn't exist
        const adminExists = await User.findOne({ username: 'admin' });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await User.create({
                username: 'admin',
                password: hashedPassword,
                isAdmin: true
            });
            console.log('Admin user created');
        }
    } catch (error) {
        console.error('Database initialization error:', error);
        throw error;
    }
}

// Essential Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

// View Engine Setup
app.set('view engine', 'ejs');
app.set('views', path.join(process.cwd(), 'views'));

// Static Files Setup
app.use(express.static(path.join(process.cwd(), 'public')));
app.use('/uploads', express.static(path.join(process.cwd(), 'public/car-images')));

// File Upload Setup - Optimized for Vercel
app.use(fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 },
    useTempFiles: false, // Changed for Vercel
    createParentPath: true,
    defCharset: 'utf8',
    defParamCharset: 'utf8'
}));

// Session Setup with MongoDB
const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'your_session_secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        ttl: 24 * 60 * 60,
        autoRemove: 'native',
        touchAfter: 24 * 3600 // Only update session once per day
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'lax'
    },
    name: 'sessionId' // Custom name for security
};

// Apply session middleware
app.use(session(sessionConfig));

// User Authentication Middleware
app.use(async (req, res, next) => {
    try {
        if (req.session.userId) {
            const user = await User.findById(req.session.userId).select('-password');
            res.locals.user = user;
        } else {
            res.locals.user = null;
        }
        next();
    } catch (error) {
        console.error('User middleware error:', error);
        next(error);
    }
});

// Security Headers Middleware
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/cars', require('./routes/cars'));
app.use('/prices', require('./routes/prices'));
app.use('/news', require('./routes/news'));
app.use('/weather', require('./routes/weather'));

// Home Route
app.get('/', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/auth/login');
    }
    res.redirect('/cars');
});

// Health Check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
    });
});

// 404 Handler
app.use((req, res) => {
    res.status(404).render('error', {
        message: 'Page Not Found',
        error: {},
        user: res.locals.user
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    const statusCode = err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production' 
        ? 'Something went wrong!' 
        : err.message;
    
    res.status(statusCode).render('error', {
        message,
        error: process.env.NODE_ENV === 'production' ? {} : err,
        user: res.locals.user
    });
});

// Initialize Database
if (process.env.NODE_ENV !== 'test') {
    initializeDatabase().catch(console.error);
}

// Development Server
if (process.env.NODE_ENV === 'development') {
    const PORT = process.env.PORT || 3202;
    app.listen(PORT, () => {
        console.log(`Development server running on port ${PORT}`);
        console.log(`http://localhost:${PORT}`);
    });
}

module.exports = app;