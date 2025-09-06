const express = require('express');
const router = express.Router();

/**
 * Subscription management endpoints
 */

router.get('/plans', (req, res) => {
    res.json({
        status: 'success',
        plans: [
            { name: 'Free', credits: 100, price: 0 },
            { name: 'Basic', credits: 1000, price: 29 },
            { name: 'Premium', credits: 5000, price: 99 },
            { name: 'Enterprise', credits: 'unlimited', price: 299 }
        ],
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
