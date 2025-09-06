import mongoose from 'mongoose';

/**
 * Credit Usage Model
 * Tracks all credit transactions for billing and analytics
 */

const creditUsageSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    
    // Transaction details
    type: {
        type: String,
        enum: ['deduction', 'addition', 'refund', 'bonus', 'reset'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    
    // Context information
    context: {
        // AI model used
        aiModel: {
            type: String,
            enum: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-1106-preview', 'claude-3-sonnet-20240229', 'claude-3-opus-20240229']
        },
        // Type of analysis
        analysisType: {
            type: String,
            enum: ['technical', 'fundamental', 'sentiment', 'risk', 'strategy', 'general']
        },
        // Request details
        requestId: String,
        tokens: {
            input: Number,
            output: Number,
            total: Number
        },
        // Trading context
        symbol: String,
        timeframe: String
    },
    
    // Balance tracking
    balanceBefore: {
        type: Number,
        required: true
    },
    balanceAfter: {
        type: Number,
        required: true
    },
    
    // Payment information (for additions)
    payment: {
        stripePaymentIntentId: String,
        amount: Number,
        currency: {
            type: String,
            default: 'USD'
        }
    },
    
    // Metadata
    metadata: {
        userAgent: String,
        ipAddress: String,
        sessionId: String,
        platform: String // web, mobile, api
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
creditUsageSchema.index({ userId: 1, createdAt: -1 });
creditUsageSchema.index({ type: 1, createdAt: -1 });
creditUsageSchema.index({ 'context.aiModel': 1 });
creditUsageSchema.index({ 'context.analysisType': 1 });
creditUsageSchema.index({ createdAt: -1 });

// Static methods for analytics
creditUsageSchema.statics.getUserUsageStats = function(userId, startDate, endDate) {
    const matchConditions = { userId };
    
    if (startDate || endDate) {
        matchConditions.createdAt = {};
        if (startDate) matchConditions.createdAt.$gte = startDate;
        if (endDate) matchConditions.createdAt.$lte = endDate;
    }
    
    return this.aggregate([
        { $match: matchConditions },
        {
            $group: {
                _id: null,
                totalCreditsUsed: { $sum: { $cond: [{ $eq: ['$type', 'deduction'] }, '$amount', 0] } },
                totalCreditsAdded: { $sum: { $cond: [{ $eq: ['$type', 'addition'] }, '$amount', 0] } },
                totalTransactions: { $sum: 1 },
                byModel: {
                    $push: {
                        $cond: [
                            { $ne: ['$context.aiModel', null] },
                            { model: '$context.aiModel', amount: '$amount' },
                            null
                        ]
                    }
                },
                byAnalysisType: {
                    $push: {
                        $cond: [
                            { $ne: ['$context.analysisType', null] },
                            { type: '$context.analysisType', amount: '$amount' },
                            null
                        ]
                    }
                }
            }
        }
    ]);
};

creditUsageSchema.statics.getPopularModels = function(startDate, endDate) {
    const matchConditions = {
        type: 'deduction',
        'context.aiModel': { $exists: true, $ne: null }
    };
    
    if (startDate || endDate) {
        matchConditions.createdAt = {};
        if (startDate) matchConditions.createdAt.$gte = startDate;
        if (endDate) matchConditions.createdAt.$lte = endDate;
    }
    
    return this.aggregate([
        { $match: matchConditions },
        {
            $group: {
                _id: '$context.aiModel',
                totalUsage: { $sum: '$amount' },
                requestCount: { $sum: 1 },
                avgCreditsPerRequest: { $avg: '$amount' }
            }
        },
        { $sort: { totalUsage: -1 } }
    ]);
};

creditUsageSchema.statics.getDailyUsage = function(userId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return this.aggregate([
        {
            $match: {
                userId,
                type: 'deduction',
                createdAt: { $gte: startDate }
            }
        },
        {
            $group: {
                _id: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' },
                    day: { $dayOfMonth: '$createdAt' }
                },
                totalCredits: { $sum: '$amount' },
                requests: { $sum: 1 }
            }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);
};

// Instance methods
creditUsageSchema.methods.toAPI = function() {
    return {
        id: this._id,
        type: this.type,
        amount: this.amount,
        description: this.description,
        balanceAfter: this.balanceAfter,
        aiModel: this.context?.aiModel,
        analysisType: this.context?.analysisType,
        symbol: this.context?.symbol,
        timestamp: this.createdAt
    };
};

const CreditUsage = mongoose.model('CreditUsage', creditUsageSchema);

export default CreditUsage;
