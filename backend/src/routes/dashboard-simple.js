const express = require('express');
const router = express.Router();

/**
 * Dashboard endpoints
 */

router.get('/stats', (req, res) => {
    res.json({
        status: 'success',
        stats: {
            totalTrades: 0,
            portfolioValue: 0,
            totalProfit: 0,
            aiRecommendations: 0
        },
        message: 'Real dashboard data - MongoDB required for persistent storage',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
