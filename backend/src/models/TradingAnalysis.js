import mongoose from 'mongoose';

/**
 * Trading Analysis Model
 * Stores AI-generated trading analysis and recommendations
 */

const tradingAnalysisSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    
    // Analysis metadata
    analysisId: {
        type: String,
        unique: true,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'expired'],
        default: 'pending'
    },
    
    // Request details
    request: {
        symbol: {
            type: String,
            required: true,
            uppercase: true
        },
        timeframe: {
            type: String,
            enum: ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M'],
            required: true
        },
        analysisType: {
            type: String,
            enum: ['technical', 'fundamental', 'sentiment', 'risk', 'strategy', 'comprehensive'],
            required: true
        },
        aiModel: {
            type: String,
            enum: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-1106-preview', 'claude-3-sonnet-20240229', 'claude-3-opus-20240229'],
            required: true
        },
        prompt: String,
        parameters: {
            lookbackPeriod: Number,
            includeNews: Boolean,
            riskLevel: String,
            customInstructions: String
        }
    },
    
    // Market data context
    marketData: {
        currentPrice: Number,
        ohlc: [{
            timestamp: Date,
            open: Number,
            high: Number,
            low: Number,
            close: Number,
            volume: Number
        }],
        indicators: {
            rsi: Number,
            macd: {
                macd: Number,
                signal: Number,
                histogram: Number
            },
            movingAverages: {
                ma20: Number,
                ma50: Number,
                ma200: Number
            },
            bollinger: {
                upper: Number,
                middle: Number,
                lower: Number
            },
            volume: {
                current: Number,
                average: Number,
                ratio: Number
            }
        },
        newsEvents: [{
            timestamp: Date,
            title: String,
            impact: String,
            sentiment: Number
        }]
    },
    
    // AI Analysis Results
    analysis: {
        summary: String,
        confidence: {
            type: Number,
            min: 0,
            max: 100
        },
        
        // Technical Analysis
        technical: {
            trend: {
                direction: String, // 'bullish', 'bearish', 'sideways'
                strength: Number, // 1-10
                timeframe: String
            },
            support: [Number],
            resistance: [Number],
            keyLevels: [{
                price: Number,
                type: String, // 'support', 'resistance', 'pivot'
                strength: Number
            }],
            patterns: [{
                name: String,
                confidence: Number,
                implications: String
            }],
            indicators: {
                rsiAnalysis: String,
                macdAnalysis: String,
                volumeAnalysis: String,
                overallSignal: String
            }
        },
        
        // Trading Signals
        signals: {
            action: {
                type: String,
                enum: ['buy', 'sell', 'hold', 'wait'],
                required: true
            },
            strength: {
                type: Number,
                min: 1,
                max: 10
            },
            timeHorizon: {
                type: String,
                enum: ['scalp', 'intraday', 'swing', 'position']
            },
            entry: {
                price: Number,
                conditions: [String]
            },
            stopLoss: {
                price: Number,
                percentage: Number,
                reasoning: String
            },
            takeProfit: [{
                price: Number,
                percentage: Number,
                probability: Number
            }],
            riskReward: Number
        },
        
        // Risk Assessment
        risk: {
            level: {
                type: String,
                enum: ['very_low', 'low', 'medium', 'high', 'very_high']
            },
            score: {
                type: Number,
                min: 1,
                max: 10
            },
            factors: [String],
            positionSize: {
                recommended: Number, // as percentage of portfolio
                maxRecommended: Number,
                reasoning: String
            },
            volatility: {
                current: Number,
                expected: Number,
                analysis: String
            }
        },
        
        // Fundamental Analysis (if applicable)
        fundamental: {
            economicFactors: [String],
            newsImpact: String,
            marketSentiment: String,
            correlations: [{
                asset: String,
                correlation: Number,
                impact: String
            }]
        },
        
        // AI Model Response Details
        reasoning: String,
        keyPoints: [String],
        warnings: [String],
        alternativeScenarios: [{
            scenario: String,
            probability: Number,
            implications: String
        }]
    },
    
    // Usage and Performance Tracking
    usage: {
        creditsUsed: {
            type: Number,
            required: true
        },
        tokensUsed: {
            input: Number,
            output: Number,
            total: Number
        },
        processingTime: Number, // milliseconds
        modelVersion: String
    },
    
    // User Interaction
    feedback: {
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        helpful: Boolean,
        comments: String,
        accuracy: {
            type: Number,
            min: 1,
            max: 5
        }
    },
    
    // Follow-up tracking
    outcome: {
        tradeExecuted: Boolean,
        executionPrice: Number,
        result: {
            type: String,
            enum: ['profit', 'loss', 'breakeven', 'pending']
        },
        pnl: Number,
        duration: Number, // minutes
        notes: String
    },
    
    // Expiry and archival
    expiresAt: {
        type: Date,
        default: function() {
            // Analysis expires after 24 hours for intraday, 7 days for swing/position
            const hours = ['1m', '5m', '15m', '30m', '1h'].includes(this.request.timeframe) ? 24 : 168;
            return new Date(Date.now() + hours * 60 * 60 * 1000);
        }
    },
    archived: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Indexes for performance
tradingAnalysisSchema.index({ userId: 1, createdAt: -1 });
tradingAnalysisSchema.index({ analysisId: 1 });
tradingAnalysisSchema.index({ 'request.symbol': 1, createdAt: -1 });
tradingAnalysisSchema.index({ 'request.analysisType': 1 });
tradingAnalysisSchema.index({ 'request.aiModel': 1 });
tradingAnalysisSchema.index({ status: 1 });
tradingAnalysisSchema.index({ expiresAt: 1 });

// Automatically delete expired analyses
tradingAnalysisSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for analysis age
tradingAnalysisSchema.virtual('age').get(function() {
    return Date.now() - this.createdAt.getTime();
});

// Virtual for time until expiry
tradingAnalysisSchema.virtual('timeToExpiry').get(function() {
    return this.expiresAt.getTime() - Date.now();
});

// Static methods
tradingAnalysisSchema.statics.findBySymbol = function(symbol, limit = 10) {
    return this.find({ 'request.symbol': symbol.toUpperCase() })
               .sort({ createdAt: -1 })
               .limit(limit)
               .populate('userId', 'firstName lastName');
};

tradingAnalysisSchema.statics.getPerformanceStats = function(userId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return this.aggregate([
        {
            $match: {
                userId,
                createdAt: { $gte: startDate },
                'outcome.tradeExecuted': true,
                'outcome.result': { $ne: 'pending' }
            }
        },
        {
            $group: {
                _id: null,
                totalTrades: { $sum: 1 },
                profitableTrades: {
                    $sum: { $cond: [{ $eq: ['$outcome.result', 'profit'] }, 1, 0] }
                },
                totalPnL: { $sum: '$outcome.pnl' },
                avgRating: { $avg: '$feedback.rating' },
                avgAccuracy: { $avg: '$feedback.accuracy' },
                creditsSpent: { $sum: '$usage.creditsUsed' }
            }
        }
    ]);
};

tradingAnalysisSchema.statics.getModelPerformance = function(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return this.aggregate([
        {
            $match: {
                createdAt: { $gte: startDate },
                status: 'completed'
            }
        },
        {
            $group: {
                _id: '$request.aiModel',
                totalAnalyses: { $sum: 1 },
                avgConfidence: { $avg: '$analysis.confidence' },
                avgRating: { $avg: '$feedback.rating' },
                avgProcessingTime: { $avg: '$usage.processingTime' },
                creditsUsed: { $sum: '$usage.creditsUsed' }
            }
        },
        { $sort: { avgRating: -1 } }
    ]);
};

// Instance methods
tradingAnalysisSchema.methods.isExpired = function() {
    return this.expiresAt < new Date();
};

tradingAnalysisSchema.methods.markAsExecuted = function(executionPrice, notes = '') {
    this.outcome.tradeExecuted = true;
    this.outcome.executionPrice = executionPrice;
    this.outcome.notes = notes;
    return this.save();
};

tradingAnalysisSchema.methods.updateOutcome = function(result, pnl, duration) {
    this.outcome.result = result;
    this.outcome.pnl = pnl;
    this.outcome.duration = duration;
    return this.save();
};

tradingAnalysisSchema.methods.addFeedback = function(rating, helpful, comments, accuracy) {
    this.feedback.rating = rating;
    this.feedback.helpful = helpful;
    this.feedback.comments = comments;
    this.feedback.accuracy = accuracy;
    return this.save();
};

tradingAnalysisSchema.methods.toAPI = function() {
    return {
        id: this.analysisId,
        symbol: this.request.symbol,
        timeframe: this.request.timeframe,
        analysisType: this.request.analysisType,
        aiModel: this.request.aiModel,
        status: this.status,
        confidence: this.analysis.confidence,
        action: this.analysis.signals.action,
        strength: this.analysis.signals.strength,
        entry: this.analysis.signals.entry,
        stopLoss: this.analysis.signals.stopLoss,
        takeProfit: this.analysis.signals.takeProfit,
        risk: this.analysis.risk,
        summary: this.analysis.summary,
        reasoning: this.analysis.reasoning,
        keyPoints: this.analysis.keyPoints,
        warnings: this.analysis.warnings,
        creditsUsed: this.usage.creditsUsed,
        timestamp: this.createdAt,
        expiresAt: this.expiresAt,
        feedback: this.feedback
    };
};

const TradingAnalysis = mongoose.model('TradingAnalysis', tradingAnalysisSchema);

export default TradingAnalysis;
