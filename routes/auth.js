// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
    try {
        if (!req.session.userId) {
            return res.redirect('/auth/login');
        }
        const user = await User.findById(req.session.userId);
        if (!user || !user.isAdmin) {
            return res.status(403).render('error', { 
                message: 'Access denied - Admin privileges required' 
            });
        }
        next();
    } catch (error) {
        console.error('Admin check error:', error);
        res.status(500).render('error', { 
            message: 'Server error while checking permissions' 
        });
    }
};

// Login page
router.get('/login', (req, res) => {
    // Check if user is already logged in
    if (req.session.userId) {
        return res.redirect('/');
    }
    res.render('login', { error: null });
});

// Login process
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.render('login', { 
                error: 'Username and password are required' 
            });
        }

        const user = await User.findOne({ username, deletedAt: null });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.render('login', { 
                error: 'Invalid credentials' 
            });
        }

        req.session.userId = user._id;
        res.redirect(user.isAdmin ? '/auth/admin' : '/');
    } catch (error) {
        console.error('Login error:', error);
        res.render('login', { 
            error: 'Login failed. Please try again.' 
        });
    }
});

// Admin panel routes
router.get('/admin', isAdmin, async (req, res) => {
    try {
        const users = await User.find({ deletedAt: null })
            .select('-password')
            .sort({ createdAt: -1 });
        res.render('admin', { users, error: null, success: null });
    } catch (error) {
        console.error('Admin panel error:', error);
        res.status(500).render('error', { 
            message: 'Failed to load admin panel' 
        });
    }
});

// Create user (admin only)
router.post('/admin/users', isAdmin, async (req, res) => {
    try {
        const { username, password, isAdmin } = req.body;

        // Validation
        if (!username || !password) {
            const users = await User.find({ deletedAt: null });
            return res.status(400).render('admin', { 
                users,
                error: 'Username and password are required',
                success: null
            });
        }

        // Check for existing user
        const existingUser = await User.findOne({ 
            username, 
            deletedAt: null 
        });
        
        if (existingUser) {
            const users = await User.find({ deletedAt: null });
            return res.status(400).render('admin', { 
                users,
                error: 'Username already exists',
                success: null
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        await User.create({
            username,
            password: hashedPassword,
            isAdmin: isAdmin === 'true',
            createdAt: new Date()
        });

        res.redirect('/auth/admin');
    } catch (error) {
        console.error('User creation error:', error);
        const users = await User.find({ deletedAt: null });
        res.status(400).render('admin', { 
            users,
            error: 'User creation failed',
            success: null
        });
    }
});

// Update user (admin only)
router.put('/admin/users/:id', isAdmin, async (req, res) => {
    try {
        const { username, password, isAdmin } = req.body;
        
        // Validation
        if (!username) {
            return res.status(400).json({ 
                error: 'Username is required' 
            });
        }

        // Check if username exists (excluding current user)
        const existingUser = await User.findOne({ 
            username, 
            _id: { $ne: req.params.id },
            deletedAt: null 
        });
        
        if (existingUser) {
            return res.status(400).json({ 
                error: 'Username already exists' 
            });
        }

        const updateData = {
            username,
            isAdmin: isAdmin === 'true',
            updatedAt: new Date()
        };

        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        await User.findByIdAndUpdate(req.params.id, updateData);
        res.json({ success: true });
    } catch (error) {
        console.error('User update error:', error);
        res.status(400).json({ 
            error: 'Update failed. Please try again.' 
        });
    }
});

// Delete user (admin only)
router.delete('/admin/users/:id', isAdmin, async (req, res) => {
    try {
        const currentUser = await User.findById(req.session.userId);
        
        // Prevent self-deletion
        if (req.params.id === req.session.userId) {
            return res.status(400).json({ 
                error: 'Cannot delete your own account' 
            });
        }

        await User.findByIdAndUpdate(req.params.id, {
            deletedAt: new Date()
        });
        
        res.json({ success: true });
    } catch (error) {
        console.error('User deletion error:', error);
        res.status(400).json({ 
            error: 'Deletion failed. Please try again.' 
        });
    }
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/auth/login');
    });
});

module.exports = router;