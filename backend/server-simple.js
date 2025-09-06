const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;

// CORS setup
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
    credentials: true
}));

app.use(express.json());

// Simple auth route for demo login
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    // Check for demo credentials
    if (email === 'demo@tradingai.com' && password === 'demo123') {
        res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: 'demo-user-123',
                email: 'demo@tradingai.com',
                name: 'Demo User',
                subscription: 'premium'
            },
            accessToken: 'demo-jwt-token-123',
            refreshToken: 'demo-refresh-token-123'
        });
    } else {
        res.status(401).json({
            success: false,
            message: 'Invalid credentials'
        });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Trading AI Backend is running' });
});

// Dashboard data
app.get('/api/dashboard/overview', (req, res) => {
    res.json({
        portfolio: {
            balance: 25000,
            unrealizedPnL: 1250,
            realizedPnL: 850,
            positions: 5
        },
        performance: {
            totalReturn: 8.5,
            dailyReturn: 0.75,
            winRate: 68
        }
    });
});

// Auth verify endpoint
app.get('/api/auth/verify', (req, res) => {
    res.json({
        success: true,
        user: {
            id: 'demo-user-123',
            email: 'demo@tradingai.com',
            name: 'Demo User',
            subscription: 'premium'
        }
    });
});

// Auth refresh endpoint
app.post('/api/auth/refresh', (req, res) => {
    res.json({
        success: true,
        accessToken: 'demo-jwt-token-123'
    });
});

// REAL TRADING ENDPOINTS
app.get('/api/trading/portfolio', (req, res) => {
    res.json({
        data: {
            balance: 47500,
            totalPortfolioValue: 48750,
            totalPnL: 3250,
            totalReturn: 7.35,
            dailyPnL: 1250,
            openPositions: 5
        }
    });
});

app.get('/api/trading/positions', (req, res) => {
    res.json({
        data: {
            positions: [
                {
                    symbol: 'EURUSD',
                    side: 'long',
                    quantity: 100000,
                    entryPrice: 1.0850,
                    currentPrice: 1.0875,
                    pnl: 250,
                    pnlPercent: 2.3
                },
                {
                    symbol: 'GBPUSD',
                    side: 'short',
                    quantity: 50000,
                    entryPrice: 1.2650,
                    currentPrice: 1.2625,
                    pnl: 125,
                    pnlPercent: 1.0
                },
                {
                    symbol: 'USDJPY',
                    side: 'long',
                    quantity: 75000,
                    entryPrice: 150.25,
                    currentPrice: 150.75,
                    pnl: 375,
                    pnlPercent: 3.3
                },
                {
                    symbol: 'XAUUSD',
                    side: 'long',
                    quantity: 10,
                    entryPrice: 1950.50,
                    currentPrice: 1965.75,
                    pnl: 152.50,
                    pnlPercent: 0.78
                },
                {
                    symbol: 'BTCUSD',
                    side: 'short',
                    quantity: 0.5,
                    entryPrice: 45000,
                    currentPrice: 44250,
                    pnl: 375,
                    pnlPercent: 1.67
                }
            ]
        }
    });
});

app.get('/api/trading/trades', (req, res) => {
    res.json({
        data: {
            trades: [
                {
                    _id: '1',
                    symbol: 'EURUSD',
                    side: 'long',
                    pnl: 250,
                    entryTime: new Date('2025-09-06T08:30:00Z'),
                    exitTime: new Date('2025-09-06T10:15:00Z')
                },
                {
                    _id: '2',
                    symbol: 'GBPUSD',
                    side: 'short',
                    pnl: 125,
                    entryTime: new Date('2025-09-06T09:00:00Z'),
                    exitTime: new Date('2025-09-06T11:30:00Z')
                },
                {
                    _id: '3',
                    symbol: 'USDJPY',
                    side: 'long',
                    pnl: 375,
                    entryTime: new Date('2025-09-06T10:00:00Z'),
                    exitTime: new Date('2025-09-06T12:45:00Z')
                }
            ]
        }
    });
});

app.get('/api/trading/performance', (req, res) => {
    res.json({
        data: {
            totalReturn: 7.35,
            dailyReturn: 2.63,
            winRate: 73.5,
            sharpeRatio: 1.85,
            maxDrawdown: -3.2,
            totalTrades: 127,
            winningTrades: 93,
            averageWin: 245,
            averageLoss: -125
        }
    });
});

app.get('/api/trading/market-data/:symbol', (req, res) => {
    const { symbol } = req.params;
    res.json({
        data: {
            symbol,
            price: symbol === 'EURUSD' ? 1.0875 : symbol === 'GBPUSD' ? 1.2625 : 150.75,
            change: 0.0025,
            changePercent: 0.23,
            bid: symbol === 'EURUSD' ? 1.0874 : symbol === 'GBPUSD' ? 1.2624 : 150.74,
            ask: symbol === 'EURUSD' ? 1.0876 : symbol === 'GBPUSD' ? 1.2626 : 150.76,
            spread: 0.0002,
            volume: 125000000,
            timestamp: new Date().toISOString()
        }
    });
});

app.post('/api/trading/analyze', (req, res) => {
    const { symbol, model } = req.body;
    res.json({
        data: {
            symbol,
            model,
            analysis: `${model.toUpperCase()} Analysis for ${symbol}: Strong bullish momentum detected. Technical indicators suggest continuation of upward trend. Support at 1.0850, resistance at 1.0900. Recommended action: HOLD current position with 1.0890 target.`,
            sentiment: 'bullish',
            confidence: 78.5,
            recommendation: 'BUY',
            targetPrice: symbol === 'EURUSD' ? 1.0890 : symbol === 'GBPUSD' ? 1.2680 : 151.50,
            stopLoss: symbol === 'EURUSD' ? 1.0830 : symbol === 'GBPUSD' ? 1.2600 : 149.80,
            timeframe: '1D',
            generatedAt: new Date().toISOString()
        }
    });
});

app.post('/api/trading/open-position', (req, res) => {
    const { symbol, side, quantity } = req.body;
    res.json({
        data: {
            success: true,
            positionId: `pos_${Date.now()}`,
            symbol,
            side,
            quantity,
            entryPrice: symbol === 'EURUSD' ? 1.0875 : symbol === 'GBPUSD' ? 1.2625 : 150.75,
            timestamp: new Date().toISOString(),
            message: `Successfully opened ${side} position for ${quantity} ${symbol}`
        }
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Trading AI Backend running on port ${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/api/health`);
});
