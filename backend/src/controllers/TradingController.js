import TradingService from '../services/TradingService.js';

/**
 * Trading Controller
 * Handles all trading-related HTTP requests
 */

class TradingController {
    /**
     * Generate trading analysis
     * POST /api/trading/analyze
     */
    async generateAnalysis(req, res) {
        try {
            const userId = req.user.userId;
            const { symbol, timeframe, analysisType, preferredModels } = req.body;

            // Basic validation
            if (!symbol || !timeframe) {
                return res.status(400).json({
                    success: false,
                    message: 'Symbol and timeframe are required'
                });
            }

            // Validate symbol format (basic check)
            if (!/^[A-Z]{3}[A-Z]{3}$/.test(symbol) && !/^[A-Z]+$/.test(symbol)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid symbol format'
                });
            }

            // Validate timeframe
            const validTimeframes = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'];
            if (!validTimeframes.includes(timeframe)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid timeframe. Valid options: ' + validTimeframes.join(', ')
                });
            }

            // Validate analysis type
            const validAnalysisTypes = ['quick', 'full', 'risk', 'ensemble'];
            if (analysisType && !validAnalysisTypes.includes(analysisType)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid analysis type. Valid options: ' + validAnalysisTypes.join(', ')
                });
            }

            const request = {
                symbol: symbol.toUpperCase(),
                timeframe,
                analysisType: analysisType || 'full',
                preferredModels
            };

            const analysis = await TradingService.generateTradingAnalysis(userId, request);

            res.json({
                success: true,
                message: 'Analysis generated successfully',
                data: analysis
            });

        } catch (error) {
            console.error('Trading analysis error:', error);
            
            if (error.message.includes('Insufficient credits')) {
                return res.status(402).json({
                    success: false,
                    message: error.message,
                    code: 'INSUFFICIENT_CREDITS'
                });
            }

            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Execute trade based on analysis
     * POST /api/trading/execute
     */
    async executeTrade(req, res) {
        try {
            const userId = req.user.userId;
            const { analysisId, orderType } = req.body;

            if (!analysisId) {
                return res.status(400).json({
                    success: false,
                    message: 'Analysis ID is required'
                });
            }

            // Validate order type
            const validOrderTypes = ['market', 'limit', 'stop'];
            if (orderType && !validOrderTypes.includes(orderType)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid order type. Valid options: ' + validOrderTypes.join(', ')
                });
            }

            const result = await TradingService.executeTrade(
                userId, 
                analysisId, 
                orderType || 'market'
            );

            res.json({
                success: true,
                message: 'Trade executed successfully',
                data: result
            });

        } catch (error) {
            console.error('Trade execution error:', error);
            
            if (error.message.includes('not enabled')) {
                return res.status(403).json({
                    success: false,
                    message: error.message,
                    code: 'FEATURE_NOT_ENABLED'
                });
            }

            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Get trading history
     * GET /api/trading/history
     */
    async getHistory(req, res) {
        try {
            const userId = req.user.userId;
            const { page = 1, limit = 20, symbol, status } = req.query;

            // Validate pagination parameters
            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);

            if (isNaN(pageNum) || pageNum < 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid page number'
                });
            }

            if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid limit (1-100)'
                });
            }

            const options = {
                page: pageNum,
                limit: limitNum,
                symbol: symbol?.toUpperCase(),
                status
            };

            const history = await TradingService.getTradingHistory(userId, options);

            res.json({
                success: true,
                data: history
            });

        } catch (error) {
            console.error('Get trading history error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Get trading performance statistics
     * GET /api/trading/performance
     */
    async getPerformance(req, res) {
        try {
            const userId = req.user.userId;
            const performance = await TradingService.getTradingPerformance(userId);

            res.json({
                success: true,
                data: performance
            });

        } catch (error) {
            console.error('Get trading performance error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Get specific analysis by ID
     * GET /api/trading/analysis/:id
     */
    async getAnalysis(req, res) {
        try {
            const userId = req.user.userId;
            const { id } = req.params;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: 'Analysis ID is required'
                });
            }

            // Import the model here to avoid circular dependencies
            const TradingAnalysis = (await import('../models/TradingAnalysis.js')).default;
            
            const analysis = await TradingAnalysis.findOne({
                _id: id,
                userId: userId
            });

            if (!analysis) {
                return res.status(404).json({
                    success: false,
                    message: 'Analysis not found'
                });
            }

            res.json({
                success: true,
                data: analysis
            });

        } catch (error) {
            console.error('Get analysis error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Update analysis feedback
     * PUT /api/trading/analysis/:id/feedback
     */
    async updateFeedback(req, res) {
        try {
            const userId = req.user.userId;
            const { id } = req.params;
            const { rating, feedback, actualOutcome } = req.body;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: 'Analysis ID is required'
                });
            }

            // Validate rating
            if (rating && (rating < 1 || rating > 5)) {
                return res.status(400).json({
                    success: false,
                    message: 'Rating must be between 1 and 5'
                });
            }

            // Import the model here to avoid circular dependencies
            const TradingAnalysis = (await import('../models/TradingAnalysis.js')).default;
            
            const analysis = await TradingAnalysis.findOne({
                _id: id,
                userId: userId
            });

            if (!analysis) {
                return res.status(404).json({
                    success: false,
                    message: 'Analysis not found'
                });
            }

            // Update feedback
            if (rating) analysis.feedback.rating = rating;
            if (feedback) analysis.feedback.comments = feedback;
            if (actualOutcome) {
                analysis.feedback.actualOutcome = actualOutcome;
                analysis.feedback.providedAt = new Date();
            }

            await analysis.save();

            res.json({
                success: true,
                message: 'Feedback updated successfully',
                data: analysis
            });

        } catch (error) {
            console.error('Update feedback error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Get trading insights and analytics
     * GET /api/trading/insights
     */
    async getInsights(req, res) {
        try {
            const userId = req.user.userId;
            const { timeframe = '30d' } = req.query;

            // Calculate date range
            const endDate = new Date();
            const startDate = new Date();
            
            switch (timeframe) {
                case '7d':
                    startDate.setDate(endDate.getDate() - 7);
                    break;
                case '30d':
                    startDate.setDate(endDate.getDate() - 30);
                    break;
                case '90d':
                    startDate.setDate(endDate.getDate() - 90);
                    break;
                default:
                    startDate.setDate(endDate.getDate() - 30);
            }

            // Import the model here to avoid circular dependencies
            const TradingAnalysis = (await import('../models/TradingAnalysis.js')).default;
            const CreditUsage = (await import('../models/CreditUsage.js')).default;

            // Get analysis insights
            const analysisStats = await TradingAnalysis.aggregate([
                {
                    $match: {
                        userId: userId,
                        createdAt: { $gte: startDate, $lte: endDate }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalAnalyses: { $sum: 1 },
                        avgConfidence: { $avg: '$confidence' },
                        avgRiskScore: { $avg: '$riskScore' },
                        executedTrades: {
                            $sum: { $cond: ['$execution.executed', 1, 0] }
                        }
                    }
                }
            ]);

            // Get symbol analysis distribution
            const symbolStats = await TradingAnalysis.aggregate([
                {
                    $match: {
                        userId: userId,
                        createdAt: { $gte: startDate, $lte: endDate }
                    }
                },
                {
                    $group: {
                        _id: '$symbol',
                        count: { $sum: 1 },
                        avgConfidence: { $avg: '$confidence' }
                    }
                },
                {
                    $sort: { count: -1 }
                },
                {
                    $limit: 10
                }
            ]);

            // Get credit usage stats
            const creditStats = await CreditUsage.aggregate([
                {
                    $match: {
                        userId: userId,
                        createdAt: { $gte: startDate, $lte: endDate },
                        type: 'trading_analysis'
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalCreditsUsed: { $sum: '$amount' },
                        totalUsages: { $sum: 1 }
                    }
                }
            ]);

            const insights = {
                timeframe,
                period: {
                    start: startDate,
                    end: endDate
                },
                analysis: analysisStats[0] || {
                    totalAnalyses: 0,
                    avgConfidence: 0,
                    avgRiskScore: 0,
                    executedTrades: 0
                },
                topSymbols: symbolStats,
                credits: creditStats[0] || {
                    totalCreditsUsed: 0,
                    totalUsages: 0
                }
            };

            res.json({
                success: true,
                data: insights
            });

        } catch (error) {
            console.error('Get insights error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Get available symbols for trading
     * GET /api/trading/symbols
     */
    async getSymbols(req, res) {
        try {
            // In production, this would fetch from your data provider
            const symbols = [
                { symbol: 'EURUSD', name: 'Euro / US Dollar', type: 'forex' },
                { symbol: 'GBPUSD', name: 'British Pound / US Dollar', type: 'forex' },
                { symbol: 'USDJPY', name: 'US Dollar / Japanese Yen', type: 'forex' },
                { symbol: 'AUDUSD', name: 'Australian Dollar / US Dollar', type: 'forex' },
                { symbol: 'USDCAD', name: 'US Dollar / Canadian Dollar', type: 'forex' },
                { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock' },
                { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'stock' },
                { symbol: 'MSFT', name: 'Microsoft Corporation', type: 'stock' },
                { symbol: 'TSLA', name: 'Tesla Inc.', type: 'stock' },
                { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'stock' }
            ];

            res.json({
                success: true,
                data: symbols
            });

        } catch (error) {
            console.error('Get symbols error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Get real-time market data for symbol
     * GET /api/trading/market-data/:symbol
     */
    async getMarketData(req, res) {
        try {
            const { symbol } = req.params;

            if (!symbol) {
                return res.status(400).json({
                    success: false,
                    message: 'Symbol is required'
                });
            }

            // In production, this would fetch real market data
            const marketData = {
                symbol: symbol.toUpperCase(),
                price: 1.0850 + (Math.random() - 0.5) * 0.01,
                bid: 1.0849,
                ask: 1.0851,
                spread: 0.0002,
                volume: Math.floor(Math.random() * 1000000),
                change: (Math.random() - 0.5) * 0.02,
                changePercent: (Math.random() - 0.5) * 2,
                high: 1.0920,
                low: 1.0780,
                timestamp: new Date()
            };

            res.json({
                success: true,
                data: marketData
            });

        } catch (error) {
            console.error('Get market data error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}

export default new TradingController();
