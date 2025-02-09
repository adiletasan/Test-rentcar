// middleware/auth.js
const User = require('../models/User');

// Middleware to check if user is authenticated
const isAuthenticated = async (req, res, next) => {
    try {
        if (!req.session || !req.session.userId) {
            // Store the originally requested URL to redirect back after login
            req.session.returnTo = req.originalUrl;
            return res.redirect('/auth/login');
        }

        // Fetch user data and attach to request
        const user = await User.findOne({ 
            _id: req.session.userId,
            deletedAt: null 
        }).select('-password');

        if (!user) {
            // Clear invalid session
            req.session.destroy();
            return res.redirect('/auth/login');
        }

        // Attach user to request object for use in routes
        req.user = user;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).render('error', { 
            message: 'Authentication error occurred' 
        });
    }
};

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
    try {
        // First ensure user is authenticated
        if (!req.session || !req.session.userId) {
            req.session.returnTo = req.originalUrl;
            return res.redirect('/auth/login');
        }

        const user = await User.findOne({ 
            _id: req.session.userId,
            deletedAt: null 
        });

        if (!user || !user.isAdmin) {
            return res.status(403).render('error', { 
                message: 'Access denied - Admin privileges required' 
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Admin authorization error:', error);
        res.status(500).render('error', { 
            message: 'Authorization error occurred' 
        });
    }
};

// Middleware to prevent authenticated users from accessing auth pages
const isNotAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) {
        return res.redirect('/');
    }
    next();
};

// Middleware to handle API authentication
const isAuthenticatedAPI = async (req, res, next) => {
    try {
        if (!req.session || !req.session.userId) {
            return res.status(401).json({ 
                error: 'Authentication required' 
            });
        }

        const user = await User.findOne({ 
            _id: req.session.userId,
            deletedAt: null 
        }).select('-password');

        if (!user) {
            req.session.destroy();
            return res.status(401).json({ 
                error: 'Invalid session' 
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('API authentication error:', error);
        res.status(500).json({ 
            error: 'Authentication error occurred' 
        });
    }
};

// Middleware to check admin status for API routes
const isAdminAPI = async (req, res, next) => {
    try {
        if (!req.session || !req.session.userId) {
            return res.status(401).json({ 
                error: 'Authentication required' 
            });
        }

        const user = await User.findOne({ 
            _id: req.session.userId,
            deletedAt: null 
        });

        if (!user || !user.isAdmin) {
            return res.status(403).json({ 
                error: 'Admin privileges required' 
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('API admin authorization error:', error);
        res.status(500).json({ 
            error: 'Authorization error occurred' 
        });
    }
};

module.exports = {
    isAuthenticated,
    isAdmin,
    isNotAuthenticated,
    isAuthenticatedAPI,
    isAdminAPI
};