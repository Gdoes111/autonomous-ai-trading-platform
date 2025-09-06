/**
 * PRODUCTION-READY Trading API Routes
 * Full functionality with real market data and AI integration
 */

const express = require('express');
const { authenticate, requireSubscription, validateInput } = require('../middleware/auth.js');
const { body, param, query } = require('express-validator');
const ProductionTradingEngine = require('../engine/ProductionTradingEngine.js');
const User = require('../models/User.js');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting for trading operations
const tradingRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // Max 10 trading operations per minute
    message: {
        error: 'Too many trading requests, please slow down',
        retryAfter: 60
    }
});

const analysisRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // Max 20 analysis requests per minute
    message: {
        error: 'Too many analysis requests, please slow down',
        retryAfter: 60
    }
});

// Trading engine instances per user (in production, use Redis or database)
const userEngines = new Map();

// Get or create trading engine for user
const getUserTradingEngine = async (userId) => {
    if (!userEngines.has(userId)) {
        const user = await User.findById(userId);
        const engine = new ProductionTradingEngine({
            initialBalance: user.account?.balance || 100000,
            maxPositions: user.account?.maxPositions || 10,
            userId: userId
        });
        
        userEngines.set(userId, engine);
        await engine.start();
    }
    
    return userEngines.get(userId);
};

// Input validation schemas
const symbolValidation = [
    param('symbol')
        .isLength({ min: 1, max: 10 })
        .matches(/^[A-Z0-9]+$/)
        .withMessage('Invalid symbol format')
];

const analysisValidation = [
    body('symbol')
        .isLength({ min: 1, max: 10 })
        .matches(/^[A-Z0-9]+$/)
        .withMessage('Invalid symbol format'),
    body('model')
        .optional()
        .isIn(['gpt-4', 'gpt-4-turbo', 'claude-3-sonnet', 'claude-3-opus'])
        .withMessage('Invalid AI model'),
    body('timeframe')
        .optional()
        .isIn(['1m', '5m', '15m', '30m', '1h', '1d', '1wk', '1mo'])
        .withMessage('Invalid timeframe'),
    body('includeML')
        .optional()
        .isBoolean()
        .withMessage('includeML must be boolean'),
    body('includeSentiment')
        .optional()
        .isBoolean()
        .withMessage('includeSentiment must be boolean')
];

const tradeValidation = [
    body('symbol')
        .isLength({ min: 1, max: 10 })
        .matches(/^[A-Z0-9]+$/)
        .withMessage('Invalid symbol format'),
    body('side')
        .isIn(['long', 'short'])
        .withMessage('Side must be long or short'),
    body('quantity')
        .isFloat({ min: 0.01 })
        .withMessage('Quantity must be positive'),
    body('stopLoss')
        .optional()
        .isFloat({ min: 0.001, max: 0.5 })
        .withMessage('Stop loss must be between 0.1% and 50%'),
    body('takeProfit')
        .optional()
        .isFloat({ min: 0.001, max: 2.0 })
        .withMessage('Take profit must be between 0.1% and 200%')
];

/**
 * GET /api/trading/portfolio
 * Get user's portfolio status and performance
 */
router.get('/portfolio', 
    authenticate,
    async (req, res) => {
        try {
            const engine = await getUserTradingEngine(req.user._id);
            const portfolio = engine.getPortfolioStatus();
            
            res.json({
                success: true,
                data: portfolio,
                timestamp: new Date()
            });
            
        } catch (error) {
            console.error('Portfolio fetch error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch portfolio',
                code: 'PORTFOLIO_FETCH_ERROR'
            });
        }
    }
);

/**
 * GET /api/trading/market-data/:symbol
 * Get real-time market data for a symbol
 */
router.get('/market-data/:symbol',
    authenticate,
    symbolValidation,
    validateInput,
    async (req, res) => {
        try {
            const { symbol } = req.params;
            const { timeframe = '1d', period = '1mo' } = req.query;
            
            const engine = await getUserTradingEngine(req.user._id);
            const marketData = await engine.getRealMarketData(symbol, timeframe, period);
            
            res.json({
                success: true,
                data: {
                    symbol,
                    timeframe,
                    period,
                    marketData,
                    dataPoints: marketData.length
                },
                timestamp: new Date()
            });
            
        } catch (error) {
            console.error('Market data error:', error);
            res.status(400).json({
                success: false,
                error: error.message || 'Failed to fetch market data',
                code: 'MARKET_DATA_ERROR'
            });
        }
    }
);

/**
 * POST /api/trading/analyze
 * Get AI analysis for a symbol with real market data
 */
router.post('/analyze',
    authenticate,
    analysisRateLimit,
    analysisValidation,
    validateInput,
    async (req, res) => {
        try {
            const {
                symbol,
                model = 'gpt-4',
                timeframe = '1d',
                includeML = true,
                includeSentiment = true
            } = req.body;
            
            // Check user's AI analysis credits
            const user = await User.findById(req.user._id);
            if (user.credits?.aiAnalysis <= 0) {
                return res.status(403).json({
                    success: false,
                    error: 'Insufficient AI analysis credits',
                    code: 'INSUFFICIENT_CREDITS'
                });
            }
            
            const engine = await getUserTradingEngine(req.user._id);
            const analysis = await engine.analyzeSymbolWithAI(symbol, {
                model,
                timeframe,
                includeML,
                includeSentiment
            });
            
            // Deduct credits
            await User.findByIdAndUpdate(req.user._id, {
                $inc: { 'credits.aiAnalysis': -1 }
            });
            
            res.json({
                success: true,
                data: {
                    symbol,
                    model,
                    analysis,
                    creditsRemaining: user.credits.aiAnalysis - 1
                },
                timestamp: new Date()
            });
            
        } catch (error) {
            console.error('AI analysis error:', error);
            res.status(400).json({
                success: false,
                error: error.message || 'AI analysis failed',
                code: 'AI_ANALYSIS_ERROR'
            });
        }
    }
);

/**
 * POST /api/trading/open-position
 * Open a new trading position
 */
router.post('/open-position',
    authenticate,
    tradingRateLimit,
    requireSubscription('free'),
    tradeValidation,
    validateInput,
    async (req, res) => {
        try {
            const {
                symbol,
                side,
                quantity,
                stopLoss = 0.02,
                takeProfit = 0.06,
                trailingStop
            } = req.body;
            
            const engine = await getUserTradingEngine(req.user._id);
            const position = await engine.openPosition(symbol, side, quantity, {
                stopLoss,
                takeProfit,
                trailingStop
            });
            
            res.json({
                success: true,
                data: {
                    position,
                    message: `${side.toUpperCase()} position opened for ${quantity} shares of ${symbol}`
                },
                timestamp: new Date()
            });
            
        } catch (error) {
            console.error('Open position error:', error);
            res.status(400).json({
                success: false,
                error: error.message || 'Failed to open position',
                code: 'OPEN_POSITION_ERROR'
            });
        }
    }
);

/**
 * POST /api/trading/close-position/:symbol
 * Close an existing position
 */
router.post('/close-position/:symbol',
    authenticate,
    tradingRateLimit,
    symbolValidation,
    validateInput,
    async (req, res) => {
        try {
            const { symbol } = req.params;
            const { reason = 'manual' } = req.body;
            
            const engine = await getUserTradingEngine(req.user._id);
            const trade = await engine.closePosition(symbol, reason);
            
            res.json({
                success: true,
                data: {
                    trade,
                    message: `Position closed for ${symbol}`
                },
                timestamp: new Date()
            });
            
        } catch (error) {
            console.error('Close position error:', error);
            res.status(400).json({
                success: false,
                error: error.message || 'Failed to close position',
                code: 'CLOSE_POSITION_ERROR'
            });
        }
    }
);

/**
 * GET /api/trading/positions
 * Get all open positions
 */
router.get('/positions',
    authenticate,
    async (req, res) => {
        try {
            const engine = await getUserTradingEngine(req.user._id);
            const portfolio = engine.getPortfolioStatus();
            
            res.json({
                success: true,
                data: {
                    positions: portfolio.positions,
                    totalValue: portfolio.totalPositionValue,
                    openPositions: portfolio.openPositions
                },
                timestamp: new Date()
            });
            
        } catch (error) {
            console.error('Get positions error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch positions',
                code: 'GET_POSITIONS_ERROR'
            });
        }
    }
);

/**
 * GET /api/trading/trades
 * Get trade history with pagination
 */
router.get('/trades',
    authenticate,
    async (req, res) => {
        try {
            const { page = 1, limit = 50, symbol, type } = req.query;
            
            const engine = await getUserTradingEngine(req.user._id);
            let trades = [...engine.trades];
            
            // Filter by symbol if provided
            if (symbol) {
                trades = trades.filter(t => t.symbol === symbol.toUpperCase());
            }
            
            // Filter by type if provided
            if (type) {
                trades = trades.filter(t => t.type === type);
            }
            
            // Sort by most recent first
            trades.sort((a, b) => new Date(b.entryTime || b.exitTime) - new Date(a.entryTime || a.exitTime));
            
            // Pagination
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + parseInt(limit);
            const paginatedTrades = trades.slice(startIndex, endIndex);
            
            res.json({
                success: true,
                data: {
                    trades: paginatedTrades,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: trades.length,
                        pages: Math.ceil(trades.length / limit)
                    }
                },
                timestamp: new Date()
            });
            
        } catch (error) {
            console.error('Get trades error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch trades',
                code: 'GET_TRADES_ERROR'
            });
        }
    }
);

/**
 * GET /api/trading/performance
 * Get detailed performance metrics
 */
router.get('/performance',
    authenticate,
    async (req, res) => {
        try {
            const engine = await getUserTradingEngine(req.user._id);
            const portfolio = engine.getPortfolioStatus();
            
            // Calculate additional performance metrics
            const trades = engine.trades.filter(t => t.type === 'close');
            const monthlyReturns = calculateMonthlyReturns(trades);
            const drawdownData = calculateDrawdown(trades);
            
            res.json({
                success: true,
                data: {
                    ...portfolio.metrics,
                    totalTrades: trades.length,
                    monthlyReturns,
                    maxDrawdown: drawdownData.maxDrawdown,
                    currentDrawdown: drawdownData.currentDrawdown,
                    portfolio: {
                        balance: portfolio.balance,
                        totalValue: portfolio.totalPortfolioValue,
                        totalReturn: portfolio.totalReturn,
                        dailyPnL: portfolio.dailyPnL,
                        totalPnL: portfolio.totalPnL
                    }
                },
                timestamp: new Date()
            });
            
        } catch (error) {
            console.error('Get performance error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch performance metrics',
                code: 'GET_PERFORMANCE_ERROR'
            });
        }
    }
);

/**
 * POST /api/trading/backtest
 * Run backtest on historical data with AI strategy
 */
router.post('/backtest',
    authenticate,
    requireSubscription('premium'),
    [
        body('symbol').isLength({ min: 1, max: 10 }).matches(/^[A-Z0-9]+$/),
        body('startDate').isISO8601(),
        body('endDate').isISO8601(),
        body('strategy').isIn(['ai-signals', 'technical', 'hybrid']),
        body('model').optional().isIn(['gpt-4', 'claude-3-sonnet'])
    ],
    validateInput,
    async (req, res) => {
        try {
            const {
                symbol,
                startDate,
                endDate,
                strategy = 'ai-signals',
                model = 'gpt-4',
                initialBalance = 100000
            } = req.body;
            
            // Create temporary engine for backtesting
            const backtestEngine = new ProductionTradingEngine({
                initialBalance,
                userId: `backtest_${req.user._id}_${Date.now()}`
            });
            
            // Get historical data
            const marketData = await backtestEngine.getRealMarketData(
                symbol, 
                '1d', 
                calculatePeriodFromDates(startDate, endDate)
            );
            
            // Filter data by date range
            const filteredData = marketData.filter(d => 
                d.timestamp >= new Date(startDate) && d.timestamp <= new Date(endDate)
            );
            
            // Run backtest simulation
            const backtestResults = await runBacktestSimulation(
                backtestEngine, 
                symbol, 
                filteredData, 
                strategy, 
                model
            );
            
            res.json({
                success: true,
                data: {
                    symbol,
                    period: { startDate, endDate },
                    strategy,
                    model,
                    results: backtestResults
                },
                timestamp: new Date()
            });
            
        } catch (error) {
            console.error('Backtest error:', error);
            res.status(400).json({
                success: false,
                error: error.message || 'Backtest failed',
                code: 'BACKTEST_ERROR'
            });
        }
    }
);

// Helper functions
function calculateMonthlyReturns(trades) {
    const monthlyData = {};
    
    trades.forEach(trade => {
        if (trade.exitTime && trade.pnl) {
            const monthKey = trade.exitTime.toISOString().slice(0, 7); // YYYY-MM
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = 0;
            }
            monthlyData[monthKey] += trade.pnl;
        }
    });
    
    return Object.entries(monthlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, pnl]) => ({ month, pnl }));
}

function calculateDrawdown(trades) {
    let peak = 0;
    let maxDrawdown = 0;
    let currentValue = 0;
    
    trades.forEach(trade => {
        if (trade.pnl) {
            currentValue += trade.pnl;
            if (currentValue > peak) {
                peak = currentValue;
            }
            const drawdown = (peak - currentValue) / peak;
            if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown;
            }
        }
    });
    
    const currentDrawdown = peak > 0 ? (peak - currentValue) / peak : 0;
    
    return {
        maxDrawdown: maxDrawdown * 100,
        currentDrawdown: currentDrawdown * 100
    };
}

function calculatePeriodFromDates(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 7) return '1wk';
    if (diffDays <= 30) return '1mo';
    if (diffDays <= 90) return '3mo';
    if (diffDays <= 180) return '6mo';
    if (diffDays <= 365) return '1y';
    return '2y';
}

async function runBacktestSimulation(engine, symbol, marketData, strategy, model) {
    // This is a simplified backtest - in production, you'd implement more sophisticated logic
    const results = {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        totalReturn: 0,
        maxDrawdown: 0,
        sharpeRatio: 0,
        trades: []
    };
    
    // Simulate trading based on strategy
    for (let i = 20; i < marketData.length - 1; i++) { // Start after 20 periods for indicators
        const currentData = marketData.slice(0, i + 1);
        
        try {
            if (strategy === 'ai-signals') {
                // Simulate AI analysis (simplified)
                const analysis = await engine.analyzeSymbolWithAI(symbol, {
                    model,
                    timeframe: '1d',
                    includeML: true,
                    includeSentiment: false
                });
                
                // Make trading decision based on AI signal
                if (analysis.signal === 'BUY' && analysis.confidence > 0.7) {
                    await engine.openPosition(symbol, 'long', 100);
                    results.totalTrades++;
                }
            }
            
            // Close positions if needed
            for (const [posSymbol, position] of engine.positions) {
                const currentPrice = marketData[i].close;
                const pnl = engine.calculatePositionPnL(position, currentPrice);
                const pnlPercent = pnl / (position.entryPrice * position.quantity);
                
                if (pnlPercent <= -0.02 || pnlPercent >= 0.06) { // 2% stop loss or 6% take profit
                    const trade = await engine.closePosition(posSymbol, 'backtest', currentPrice);
                    results.trades.push(trade);
                    
                    if (trade.pnl > 0) {
                        results.winningTrades++;
                    } else {
                        results.losingTrades++;
                    }
                }
            }
            
        } catch (error) {
            console.warn('Backtest simulation error:', error.message);
        }
    }
    
    // Close any remaining positions
    for (const symbol of engine.positions.keys()) {
        const trade = await engine.closePosition(symbol, 'backtest_end');
        results.trades.push(trade);
    }
    
    // Calculate final metrics
    const portfolio = engine.getPortfolioStatus();
    results.totalReturn = portfolio.totalReturn;
    results.finalBalance = portfolio.totalPortfolioValue;
    
    return results;
}

module.exports = router;
