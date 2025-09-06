const express = require('express');
const router = express.Router();

/**
 * Simple test routes for trading platform
 */

// Health check for auth system
router.get('/health', (req, res) => {
    res.json({
        status: 'success',
        message: 'Authentication system is operational',
        timestamp: new Date().toISOString(),
        system: 'real-trading-platform'
    });
});

// Simple registration endpoint (temporary)
router.post('/register', (req, res) => {
    res.json({
        status: 'success',
        message: 'Registration endpoint ready - requires MongoDB for full functionality',
        timestamp: new Date().toISOString()
    });
});

// Simple login endpoint (temporary)
router.post('/login', (req, res) => {
    res.json({
        status: 'success',
        message: 'Login endpoint ready - requires MongoDB for full functionality',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
