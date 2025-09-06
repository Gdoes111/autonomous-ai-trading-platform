/**
 * Real Trading Routes - Live AI Trading Integration
 */

import express from 'express';
import TradingEngine from '../engine/TradingEngine.js';
import AIModelManager from '../ai/AIModelManager.js';

const router = express.Router();

// Initialize trading engine
const tradingEngine = new TradingEngine({
    initialBalance: 100000,
    maxPositions: 10,
    maxRiskPerTrade: 0.02,
    maxDailyDrawdown: 0.05
});

const aiManager = new AIModelManager();

// Track user sessions and usage
const userSessions = new Map(); // userId -> session data
const analysisUsage = new Map(); // userId -> daily usage

// Start trading engine
tradingEngine.start();

// POST /api/trading/analyze - Get AI market analysis
router.post('/analyze', async (req, res) => {
    try {
        const {
            symbol,
            aiModel,
            timeframe = '1h',
            userId,
            userTier = 'free'
        } = req.body;

        // Validate inputs
        if (!symbol || !aiModel) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: symbol, aiModel'
            });
        }
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User authentication required for AI analysis'
            });
        }

        // Check daily usage limits for free tier
        if (userTier === 'free') {
            const today = new Date().toDateString();
            const usage = analysisUsage.get(`${userId}_${today}`) || 0;
            
            if (usage >= 10) { // 10 free analyses per day
                return res.status(403).json({
                    success: false,
                    message: 'Daily analysis limit reached. Upgrade to premium for unlimited analyses.',
                    remainingAnalyses: 0
                });
            }
        }

        console.log(`🔍 AI Analysis: ${symbol} with ${aiModel} (${userTier} tier)`);

        // Get AI analysis
        const analysis = await tradingEngine.requestAIAnalysis(
            symbol, 
            aiModel, 
            timeframe, 
            userTier
        );

        // Update usage tracking
        if (userTier === 'free') {
            const today = new Date().toDateString();
            const currentUsage = analysisUsage.get(`${userId}_${today}`) || 0;
            analysisUsage.set(`${userId}_${today}`, currentUsage + 1);
        }

        // Calculate remaining analyses
        const today = new Date().toDateString();
        const dailyUsage = analysisUsage.get(`${userId}_${today}`) || 0;
        const remainingAnalyses = userTier === 'free' ? Math.max(0, 10 - dailyUsage) : 'unlimited';

        res.json({
            success: true,
            data: {
                ...analysis,
                symbol,
                timeframe,
                usage: {
                    dailyUsage,
                    remainingAnalyses,
                    tier: userTier
                }
            }
        });

    } catch (error) {
        console.error('AI analysis error:', error);
        res.status(500).json({
            success: false,
            message: `Analysis failed: ${error.message}`
        });
    }
});

// POST /api/trading/execute - Execute a trade
router.post('/execute', async (req, res) => {
    try {
        const {
            signal,
            userId,
            userTier = 'free',
            riskPerTrade = 0.02,
            autoRisk = true
        } = req.body;

        // Validate inputs
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User authentication required for trade execution'
            });
        }

        if (!signal || !signal.symbol || !signal.action) {
            return res.status(400).json({
                success: false,
                message: 'Invalid trading signal'
            });
        }

        // Check if user has trading permissions
        if (userTier === 'free') {
            return res.status(403).json({
                success: false,
                message: 'Live trading requires a premium subscription. Upgrade your plan to access real trading.',
                upgradeRequired: true
            });
        }

        // Execute real trade for premium users
        const executionResult = await tradingEngine.executeTrade(signal, {
            userId,
            riskPerTrade,
            autoRisk
        });

        res.json({
            success: true,
            data: executionResult
        });

    } catch (error) {
        console.error('Trade execution error:', error);
        res.status(500).json({
            success: false,
            message: `Trade execution failed: ${error.message}`
        });
    }
});

// GET /api/trading/positions - Get current positions
router.get('/positions', async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        const userId = req.user.id;
        
        const status = tradingEngine.getStatus();
        
        res.json({
            success: true,
            data: {
                positions: status.positions,
                openOrders: status.openOrders,
                balance: status.balance,
                dailyPnL: status.dailyPnL,
                isActive: status.isActive
            }
        });

    } catch (error) {
        console.error('Error fetching positions:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching trading positions'
        });
    }
});

// GET /api/trading/history - Get trading history
router.get('/history', async (req, res) => {
    try {
        const { userId, limit = 50 } = req.query;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User authentication required to access trading history'
            });
        }
        
        const status = tradingEngine.getStatus();
        
        // Get real trading history from the trading engine
        const realHistory = tradingEngine.getTradingHistory(userId, parseInt(limit));
        
        // If no history exists, return empty array instead of mock data
        const trades = realHistory || [];
        
        res.json({
            success: true,
            data: {
                trades: trades,
                totalTrades: status.metrics.totalTrades,
                winRate: status.metrics.winRate,
                totalPnL: status.metrics.totalPnL,
                message: trades.length === 0 ? 'No trades found. Start trading to see your history here.' : undefined
            }
        });

    } catch (error) {
        console.error('Error fetching trading history:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching trading history'
        });
    }
});

// GET /api/trading/metrics - Get performance metrics
router.get('/metrics', async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        const userId = req.user.id;
        const { period = '1M' } = req.query;
        
        const status = tradingEngine.getStatus();
        
        res.json({
            success: true,
            data: {
                ...status.metrics,
                period,
                balance: status.balance,
                dailyPnL: status.dailyPnL,
                positions: status.positions.length,
                isActive: status.isActive,
                riskMetrics: {
                    maxDrawdown: status.metrics.maxDrawdown,
                    sharpeRatio: status.metrics.sharpeRatio,
                    sortino: status.metrics.sharpeRatio * 1.2, // Simplified
                    calmar: status.metrics.totalPnL / Math.max(status.metrics.maxDrawdown, 1)
                }
            }
        });

    } catch (error) {
        console.error('Error fetching metrics:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching performance metrics'
        });
    }
});

// POST /api/trading/settings - Update trading settings
router.post('/settings', async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        const userId = req.user.id;
        const {
            maxRiskPerTrade,
            maxPositions,
            autoTrade,
            preferredModels
        } = req.body;

        // Store settings (in production, save to database)
        const settings = {
            maxRiskPerTrade: maxRiskPerTrade || 0.02,
            maxPositions: maxPositions || 5,
            autoTrade: autoTrade || false,
            preferredModels: preferredModels || ['gpt-4'],
            updatedAt: new Date().toISOString()
        };

        userSessions.set(userId, { ...userSessions.get(userId), settings });

        res.json({
            success: true,
            data: settings
        });

    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating trading settings'
        });
    }
});

// GET /api/trading/models - Get available AI models
router.get('/models', async (req, res) => {
    try {
        const { userTier = 'free' } = req.query;
        
        const models = aiManager.getAvailableModels(userTier);
        
        res.json({
            success: true,
            data: models.map(model => ({
                ...model,
                description: getModelDescription(model.id),
                strengths: getModelStrengths(model.id),
                recommended: getRecommendedUse(model.id)
            }))
        });

    } catch (error) {
        console.error('Error fetching models:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching AI models'
        });
    }
});

// GET /api/trading/status - Get trading engine status
router.get('/status', async (req, res) => {
    try {
        const engineStatus = tradingEngine.getStatus();
        const aiStatus = await aiManager.validateConnections();
        
        res.json({
            success: true,
            data: {
                engine: {
                    status: engineStatus.isActive ? 'active' : 'inactive',
                    balance: engineStatus.balance,
                    positions: engineStatus.positions.length,
                    dailyPnL: engineStatus.dailyPnL
                },
                ai: aiStatus,
                markets: {
                    forex: ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD'],
                    stocks: ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN'],
                    indices: ['SPY', 'QQQ', 'IWM']
                },
                features: {
                    liveTrading: true,
                    aiAnalysis: true,
                    riskManagement: true,
                    realTimeData: true
                }
            }
        });

    } catch (error) {
        console.error('Error checking status:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking trading status'
        });
    }
});

/**
 * Helper functions
 */
function getModelDescription(modelId) {
    const descriptions = {
        'gpt-4': 'Balanced AI trader with strong technical analysis and pattern recognition capabilities.',
        'gpt-4-turbo': 'Enhanced speed and accuracy for high-frequency trading decisions.',
        'claude-3-sonnet': 'Statistical expert specializing in mean reversion and risk assessment.',
        'claude-3-opus': 'Advanced multi-factor analysis with sophisticated risk modeling.'
    };
    
    return descriptions[modelId] || 'AI-powered trading analysis';
}

function getModelStrengths(modelId) {
    const strengths = {
        'gpt-4': ['Technical Analysis', 'Market Sentiment', 'Risk Assessment'],
        'gpt-4-turbo': ['Fast Execution', 'Pattern Recognition', 'Multi-timeframe'],
        'claude-3-sonnet': ['Statistical Modeling', 'Mean Reversion', 'Volatility Analysis'],
        'claude-3-opus': ['Ensemble Strategies', 'Risk Optimization', 'Market Structure']
    };
    
    return strengths[modelId] || ['General Analysis'];
}

function getRecommendedUse(modelId) {
    const recommendations = {
        'gpt-4': 'Best for beginners and general trading strategies',
        'gpt-4-turbo': 'Ideal for active traders needing quick decisions',
        'claude-3-sonnet': 'Perfect for conservative, risk-conscious trading',
        'claude-3-opus': 'Advanced users seeking sophisticated strategies'
    };
    
    return recommendations[modelId] || 'General trading use';
}

export default router;
