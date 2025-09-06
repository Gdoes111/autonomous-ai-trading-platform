import AIModelManager from '../ai/model-manager.js';
import TradingAnalysis from '../models/TradingAnalysis.js';
import CreditUsage from '../models/CreditUsage.js';
import User from '../models/User.js';
import { config } from '../config/environment.js';

/**
 * Trading Service
 * Handles AI trading analysis, position management, and broker integration
 */

class TradingService {
    constructor() {
        this.aiManager = AIModelManager;
        this.darwinexConfig = {
            baseUrl: config.DARWINEX_BASE_URL || 'https://api.darwinex.com',
            apiKey: config.DARWINEX_API_KEY,
            secret: config.DARWINEX_SECRET
        };
    }

    /**
     * Generate comprehensive trading analysis using AI models
     */
    async generateTradingAnalysis(userId, request) {
        const { symbol, timeframe, analysisType = 'full', preferredModels = null } = request;

        // Get user and validate credits
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Calculate credit cost based on analysis type and models
        const creditCost = this.calculateCreditCost(analysisType, preferredModels);
        
        if (user.credits.balance < creditCost) {
            throw new Error(`Insufficient credits. Required: ${creditCost}, Available: ${user.credits.balance}`);
        }

        try {
            // Prepare analysis parameters
            const analysisParams = {
                symbol,
                timeframe,
                analysisType,
                userPreferences: {
                    riskTolerance: user.trading.riskTolerance,
                    maxPositionSize: user.trading.maxPositionSize,
                    tradingStyle: user.trading.tradingStyle,
                    preferredIndicators: user.trading.preferredIndicators
                },
                models: preferredModels || user.aiPreferences.preferredModels
            };

            // Get market data (this would integrate with your data provider)
            const marketData = await this.getMarketData(symbol, timeframe);
            
            // Generate AI analysis based on type
            let analysisResult;
            switch (analysisType) {
                case 'quick':
                    analysisResult = await this.generateQuickAnalysis(analysisParams, marketData);
                    break;
                case 'full':
                    analysisResult = await this.generateFullAnalysis(analysisParams, marketData);
                    break;
                case 'risk':
                    analysisResult = await this.generateRiskAnalysis(analysisParams, marketData);
                    break;
                case 'ensemble':
                    analysisResult = await this.generateEnsembleAnalysis(analysisParams, marketData);
                    break;
                default:
                    throw new Error('Invalid analysis type');
            }

            // Apply risk management rules
            const riskAdjustedResult = this.applyRiskManagement(analysisResult, user.trading);

            // Save analysis to database
            const tradingAnalysis = new TradingAnalysis({
                userId,
                symbol,
                timeframe,
                analysisType,
                request: analysisParams,
                result: riskAdjustedResult,
                marketData: {
                    price: marketData.currentPrice,
                    volume: marketData.volume,
                    volatility: marketData.volatility,
                    timestamp: new Date()
                },
                confidence: analysisResult.confidence,
                riskScore: riskAdjustedResult.riskScore,
                creditsUsed: creditCost
            });

            await tradingAnalysis.save();

            // Deduct credits and log usage
            await user.deductCredits(creditCost);
            await this.logCreditUsage(userId, creditCost, 'trading_analysis', {
                analysisId: tradingAnalysis._id,
                symbol,
                analysisType,
                modelsUsed: analysisResult.modelsUsed
            });

            // Update user usage stats
            user.usage.totalApiCalls += 1;
            user.usage.lastActive = new Date();
            await user.save();

            return {
                analysisId: tradingAnalysis._id,
                symbol,
                timeframe,
                analysis: riskAdjustedResult,
                confidence: analysisResult.confidence,
                riskScore: riskAdjustedResult.riskScore,
                creditsUsed: creditCost,
                timestamp: tradingAnalysis.createdAt
            };

        } catch (error) {
            console.error('Trading analysis error:', error);
            throw new Error(`Analysis failed: ${error.message}`);
        }
    }

    /**
     * Generate quick analysis (single model, basic indicators)
     */
    async generateQuickAnalysis(params, marketData) {
        const primaryModel = params.models[0] || 'gpt-4';
        
        const prompt = this.buildAnalysisPrompt(params, marketData, 'quick');
        const result = await this.aiManager.generateAnalysis(primaryModel, prompt, {
            maxTokens: 1000,
            temperature: 0.1
        });

        return {
            type: 'quick',
            recommendation: result.recommendation,
            entryPrice: result.entryPrice,
            stopLoss: result.stopLoss,
            takeProfit: result.takeProfit,
            confidence: result.confidence,
            reasoning: result.reasoning,
            modelsUsed: [primaryModel],
            processingTime: Date.now()
        };
    }

    /**
     * Generate full comprehensive analysis
     */
    async generateFullAnalysis(params, marketData) {
        const models = params.models.slice(0, 2); // Use up to 2 models for full analysis
        
        const prompt = this.buildAnalysisPrompt(params, marketData, 'full');
        
        // Get analyses from multiple models
        const analyses = await Promise.all(
            models.map(model => this.aiManager.generateAnalysis(model, prompt, {
                maxTokens: 2000,
                temperature: 0.1
            }))
        );

        // Combine and analyze results
        const combinedAnalysis = this.combineAnalyses(analyses);

        return {
            type: 'full',
            recommendation: combinedAnalysis.recommendation,
            entryPrice: combinedAnalysis.entryPrice,
            stopLoss: combinedAnalysis.stopLoss,
            takeProfit: combinedAnalysis.takeProfit,
            confidence: combinedAnalysis.confidence,
            reasoning: combinedAnalysis.reasoning,
            technicalIndicators: combinedAnalysis.technicalIndicators,
            fundamentalFactors: combinedAnalysis.fundamentalFactors,
            marketSentiment: combinedAnalysis.marketSentiment,
            modelsUsed: models,
            processingTime: Date.now()
        };
    }

    /**
     * Generate risk-focused analysis
     */
    async generateRiskAnalysis(params, marketData) {
        const riskPrompt = this.buildRiskAnalysisPrompt(params, marketData);
        
        const result = await this.aiManager.generateAnalysis('gpt-4', riskPrompt, {
            maxTokens: 1500,
            temperature: 0.05 // Lower temperature for risk analysis
        });

        return {
            type: 'risk',
            riskScore: result.riskScore,
            maxDrawdown: result.maxDrawdown,
            positionSize: result.recommendedPositionSize,
            stopLoss: result.stopLoss,
            riskFactors: result.riskFactors,
            mitigation: result.mitigation,
            confidence: result.confidence,
            modelsUsed: ['gpt-4'],
            processingTime: Date.now()
        };
    }

    /**
     * Generate ensemble analysis using multiple models
     */
    async generateEnsembleAnalysis(params, marketData) {
        const prompt = this.buildAnalysisPrompt(params, marketData, 'ensemble');
        
        // Use all available models for ensemble
        const ensembleResult = await this.aiManager.ensembleAnalysis(prompt, {
            models: params.models,
            votingMethod: 'weighted',
            confidence_threshold: 0.7
        });

        return {
            type: 'ensemble',
            recommendation: ensembleResult.consensus.recommendation,
            entryPrice: ensembleResult.consensus.entryPrice,
            stopLoss: ensembleResult.consensus.stopLoss,
            takeProfit: ensembleResult.consensus.takeProfit,
            confidence: ensembleResult.consensus.confidence,
            reasoning: ensembleResult.consensus.reasoning,
            modelAgreement: ensembleResult.agreement_score,
            individualAnalyses: ensembleResult.individual_results,
            modelsUsed: params.models,
            processingTime: Date.now()
        };
    }

    /**
     * Apply risk management rules to analysis
     */
    applyRiskManagement(analysis, tradingConfig) {
        const maxRisk = tradingConfig.maxDailyLoss || 0.02; // 2% default
        const maxPosition = tradingConfig.maxPositionSize || 0.05; // 5% default
        
        // Calculate risk-adjusted position size
        const riskDistance = Math.abs(analysis.entryPrice - analysis.stopLoss) / analysis.entryPrice;
        const suggestedPositionSize = Math.min(maxRisk / riskDistance, maxPosition);

        // Adjust stop loss if too wide
        if (riskDistance > maxRisk) {
            const adjustedStopLoss = analysis.recommendation === 'BUY' ?
                analysis.entryPrice * (1 - maxRisk) :
                analysis.entryPrice * (1 + maxRisk);
            
            analysis.stopLoss = adjustedStopLoss;
            analysis.reasoning += ` [Risk Management: Stop loss adjusted to maintain ${(maxRisk * 100).toFixed(1)}% max risk]`;
        }

        // Calculate risk score
        const riskScore = this.calculateRiskScore(analysis, tradingConfig);

        return {
            ...analysis,
            positionSize: suggestedPositionSize,
            riskScore: riskScore,
            riskManagement: {
                maxRiskPerTrade: maxRisk,
                adjustedForRisk: true,
                riskDistance: riskDistance
            }
        };
    }

    /**
     * Calculate comprehensive risk score
     */
    calculateRiskScore(analysis, tradingConfig) {
        let riskScore = 0;
        
        // Base confidence score (higher confidence = lower risk)
        riskScore += (1 - analysis.confidence) * 40;
        
        // Volatility factor
        if (analysis.marketData?.volatility) {
            riskScore += Math.min(analysis.marketData.volatility * 30, 30);
        }
        
        // Stop loss distance
        const stopDistance = Math.abs(analysis.entryPrice - analysis.stopLoss) / analysis.entryPrice;
        riskScore += stopDistance * 100;
        
        // Market sentiment factor
        if (analysis.marketSentiment === 'bearish') riskScore += 10;
        if (analysis.marketSentiment === 'volatile') riskScore += 15;
        
        return Math.min(Math.round(riskScore), 100);
    }

    /**
     * Execute trade through Darwinex (placeholder for actual integration)
     */
    async executeTrade(userId, analysisId, orderType = 'market') {
        const analysis = await TradingAnalysis.findById(analysisId);
        if (!analysis || analysis.userId.toString() !== userId) {
            throw new Error('Analysis not found or unauthorized');
        }

        const user = await User.findById(userId);
        if (!user.integration.darwinex.enabled) {
            throw new Error('Darwinex integration not enabled');
        }

        try {
            // Placeholder for Darwinex API integration
            const tradeOrder = {
                symbol: analysis.symbol,
                side: analysis.result.recommendation.toLowerCase(),
                quantity: analysis.result.positionSize,
                type: orderType,
                stopLoss: analysis.result.stopLoss,
                takeProfit: analysis.result.takeProfit
            };

            // In production, this would call the actual Darwinex API
            const executionResult = await this.executeDarwinexTrade(tradeOrder, user.integration.darwinex);

            // Update analysis with execution details
            analysis.execution = {
                executed: true,
                executedAt: new Date(),
                orderId: executionResult.orderId,
                fillPrice: executionResult.fillPrice,
                status: executionResult.status
            };
            await analysis.save();

            // Update user trade count
            user.usage.totalTrades += 1;
            await user.save();

            return {
                success: true,
                orderId: executionResult.orderId,
                fillPrice: executionResult.fillPrice,
                status: executionResult.status
            };

        } catch (error) {
            console.error('Trade execution error:', error);
            throw new Error(`Trade execution failed: ${error.message}`);
        }
    }

    /**
     * Get trading history for user
     */
    async getTradingHistory(userId, options = {}) {
        const { page = 1, limit = 20, symbol = null, status = null } = options;
        
        const query = { userId };
        if (symbol) query.symbol = symbol;
        if (status) query['execution.status'] = status;

        const skip = (page - 1) * limit;

        const analyses = await TradingAnalysis.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await TradingAnalysis.countDocuments(query);

        return {
            analyses,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Get user's trading performance stats
     */
    async getTradingPerformance(userId) {
        const analyses = await TradingAnalysis.find({ 
            userId,
            'execution.executed': true 
        });

        if (analyses.length === 0) {
            return {
                totalTrades: 0,
                winRate: 0,
                avgReturn: 0,
                totalReturn: 0
            };
        }

        const performance = analyses.reduce((acc, analysis) => {
            if (analysis.performance?.realized) {
                acc.totalReturn += analysis.performance.realized.pnl;
                acc.trades.push({
                    pnl: analysis.performance.realized.pnl,
                    return: analysis.performance.realized.returnPercentage
                });
            }
            return acc;
        }, { totalReturn: 0, trades: [] });

        const winningTrades = performance.trades.filter(t => t.pnl > 0).length;
        const winRate = performance.trades.length > 0 ? winningTrades / performance.trades.length : 0;
        const avgReturn = performance.trades.length > 0 ? 
            performance.trades.reduce((sum, t) => sum + t.return, 0) / performance.trades.length : 0;

        return {
            totalTrades: performance.trades.length,
            winRate: Math.round(winRate * 100),
            avgReturn: Math.round(avgReturn * 100) / 100,
            totalReturn: Math.round(performance.totalReturn * 100) / 100,
            winningTrades,
            losingTrades: performance.trades.length - winningTrades
        };
    }

    // Helper methods

    calculateCreditCost(analysisType, models = []) {
        const baseCosts = {
            quick: 1,
            full: 3,
            risk: 2,
            ensemble: 5
        };

        let cost = baseCosts[analysisType] || 1;
        
        // Additional cost for premium models
        if (models.includes('gpt-4')) cost += 1;
        if (models.includes('claude-3-opus')) cost += 2;
        
        return cost;
    }

    async getMarketData(symbol, timeframe) {
        // Placeholder for market data integration
        // In production, this would fetch from your data provider
        return {
            currentPrice: 1.0850,
            volume: 125000,
            volatility: 0.015,
            bid: 1.0849,
            ask: 1.0851,
            spread: 0.0002
        };
    }

    buildAnalysisPrompt(params, marketData, type) {
        return `Analyze ${params.symbol} on ${params.timeframe} timeframe.
        Current price: ${marketData.currentPrice}
        Volume: ${marketData.volume}
        User risk tolerance: ${params.userPreferences.riskTolerance}
        Analysis type: ${type}
        
        Provide specific entry, stop loss, and take profit levels with reasoning.`;
    }

    buildRiskAnalysisPrompt(params, marketData) {
        return `Perform risk analysis for ${params.symbol} trading opportunity.
        Current price: ${marketData.currentPrice}
        User max position size: ${params.userPreferences.maxPositionSize}
        Risk tolerance: ${params.userPreferences.riskTolerance}
        
        Focus on risk factors, position sizing, and risk mitigation strategies.`;
    }

    combineAnalyses(analyses) {
        // Simple consensus mechanism - in production, this would be more sophisticated
        const recommendations = analyses.map(a => a.recommendation);
        const mostCommon = recommendations.sort((a, b) =>
            recommendations.filter(v => v === a).length - recommendations.filter(v => v === b).length
        ).pop();

        const avgConfidence = analyses.reduce((sum, a) => sum + a.confidence, 0) / analyses.length;
        const avgEntry = analyses.reduce((sum, a) => sum + a.entryPrice, 0) / analyses.length;

        return {
            recommendation: mostCommon,
            entryPrice: avgEntry,
            stopLoss: analyses[0].stopLoss, // Use first model's stop loss
            takeProfit: analyses[0].takeProfit,
            confidence: avgConfidence,
            reasoning: `Consensus from ${analyses.length} AI models: ${mostCommon}`,
            technicalIndicators: analyses[0].technicalIndicators,
            fundamentalFactors: analyses[0].fundamentalFactors,
            marketSentiment: analyses[0].marketSentiment
        };
    }

    async executeDarwinexTrade(order, darwinexConfig) {
        // Placeholder for actual Darwinex API integration
        // In production, implement actual API calls
        return {
            orderId: `DX${Date.now()}`,
            fillPrice: order.type === 'market' ? order.entryPrice || 1.0850 : order.entryPrice,
            status: 'filled'
        };
    }

    async logCreditUsage(userId, amount, type, metadata) {
        const usage = new CreditUsage({
            userId,
            amount,
            type,
            description: `Trading analysis: ${metadata.symbol}`,
            metadata
        });
        await usage.save();
    }
}

export default new TradingService();
