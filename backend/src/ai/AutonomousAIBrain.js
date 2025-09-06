/**
 * AUTONOMOUS AI TRADING BRAIN
 * Combines Reddit sentiment, ML models, and automated trading decisions
 */

const EventEmitter = require('events');
const RedditSentimentEngine = require('./RedditSentimentEngine.js');
const MLModelsEngine = require('./MLModelsEngine.js');
const AIModelManager = require('./AIModelManager.js');

class AutonomousAIBrain extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.config = {
            tradingInterval: config.tradingInterval || 60000, // 1 minute
            sentimentWeight: config.sentimentWeight || 0.3,
            mlWeight: config.mlWeight || 0.4,
            aiWeight: config.aiWeight || 0.3,
            confidenceThreshold: config.confidenceThreshold || 0.7,
            maxPositionsPerUser: config.maxPositionsPerUser || 5,
            ...config
        };
        
        // AI Components
        this.redditSentiment = new RedditSentimentEngine();
        this.mlModels = new MLModelsEngine();
        this.aiManager = new AIModelManager();
        
        // Trading state
        this.isActive = false;
        this.activeUsers = new Map(); // userId -> user trading config
        this.lastAnalysis = new Map(); // symbol -> analysis result
        this.tradingQueue = [];
        
        // Performance tracking
        this.stats = {
            totalTrades: 0,
            successfulTrades: 0,
            totalProfit: 0,
            avgConfidence: 0,
            lastUpdate: new Date()
        };
        
        console.log('🧠 Autonomous AI Trading Brain initialized');
    }
    
    /**
     * Start the autonomous trading system
     */
    async start() {
        if (this.isActive) {
            console.log('⚠️ AI Brain already active');
            return;
        }
        
        console.log('🚀 Starting Autonomous AI Trading Brain...');
        
        try {
            // Initialize all AI components
            await this.initializeAIComponents();
            
            // Start the main trading loop
            this.isActive = true;
            this.startTradingLoop();
            
            console.log('✅ AI Trading Brain is now LIVE and trading automatically');
            this.emit('brain:started');
            
        } catch (error) {
            console.error('❌ Failed to start AI Brain:', error);
            this.emit('brain:error', error);
        }
    }
    
    /**
     * Stop the autonomous trading system
     */
    async stop() {
        console.log('🛑 Stopping AI Trading Brain...');
        this.isActive = false;
        
        if (this.tradingInterval) {
            clearInterval(this.tradingInterval);
        }
        
        this.emit('brain:stopped');
        console.log('✅ AI Trading Brain stopped');
    }
    
    /**
     * Initialize all AI components
     */
    async initializeAIComponents() {
        console.log('🔧 Initializing AI components...');
        
        // Test Reddit sentiment connection
        try {
            await this.redditSentiment.initialize();
            console.log('✅ Reddit Sentiment Engine ready');
        } catch (error) {
            console.warn('⚠️ Reddit Sentiment unavailable:', error.message);
        }
        
        // Test ML models
        try {
            await this.mlModels.initialize();
            console.log('✅ ML Models Engine ready');
        } catch (error) {
            console.warn('⚠️ ML Models unavailable:', error.message);
        }
        
        // Test AI manager
        try {
            const status = await this.aiManager.validateConnections();
            if (status.openai || status.anthropic) {
                console.log('✅ AI Models ready');
            }
        } catch (error) {
            console.warn('⚠️ AI Models unavailable:', error.message);
        }
    }
    
    /**
     * Add a user to autonomous trading
     */
    addUser(userId, userConfig) {
        const config = {
            subscription: userConfig.subscription || 'premium',
            maxRisk: userConfig.maxRisk || 0.02, // 2% max risk per trade
            balance: userConfig.balance || 10000,
            allowedSymbols: userConfig.allowedSymbols || ['EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD', 'ETHUSD'],
            aiModel: userConfig.aiModel || 'gpt-4',
            ...userConfig
        };
        
        this.activeUsers.set(userId, config);
        console.log(`👤 Added user ${userId} to autonomous trading`);
        this.emit('user:added', userId, config);
    }
    
    /**
     * Remove a user from autonomous trading
     */
    removeUser(userId) {
        this.activeUsers.delete(userId);
        console.log(`👤 Removed user ${userId} from autonomous trading`);
        this.emit('user:removed', userId);
    }
    
    /**
     * Main trading loop - runs continuously
     */
    startTradingLoop() {
        console.log('🔄 Starting autonomous trading loop...');
        
        this.tradingInterval = setInterval(async () => {
            if (!this.isActive || this.activeUsers.size === 0) {
                return;
            }
            
            try {
                await this.executeAutonomousTradingCycle();
            } catch (error) {
                console.error('❌ Trading cycle error:', error);
                this.emit('cycle:error', error);
            }
        }, this.config.tradingInterval);
    }
    
    /**
     * Execute one complete autonomous trading cycle
     */
    async executeAutonomousTradingCycle() {
        console.log('🔄 Executing autonomous trading cycle...');
        
        // Get all unique symbols from all users
        const allSymbols = new Set();
        this.activeUsers.forEach(user => {
            user.allowedSymbols.forEach(symbol => allSymbols.add(symbol));
        });
        
        // Analyze each symbol with AI brain
        for (const symbol of allSymbols) {
            try {
                const analysis = await this.analyzeSymbolWithAIBrain(symbol);
                this.lastAnalysis.set(symbol, analysis);
                
                // Execute trades for users based on analysis
                await this.executeTradesForSymbol(symbol, analysis);
                
            } catch (error) {
                console.error(`❌ Failed to analyze ${symbol}:`, error);
            }
        }
        
        this.emit('cycle:completed');
    }
    
    /**
     * Analyze symbol with full AI brain (sentiment + ML + AI)
     */
    async analyzeSymbolWithAIBrain(symbol) {
        console.log(`🧠 Analyzing ${symbol} with AI Brain...`);
        
        const analysis = {
            symbol,
            timestamp: new Date(),
            sentiment: null,
            mlPrediction: null,
            aiRecommendation: null,
            finalDecision: null,
            confidence: 0
        };
        
        // 1. Get Reddit sentiment
        try {
            analysis.sentiment = await this.redditSentiment.analyzeSentiment(symbol);
            console.log(`📊 ${symbol} sentiment: ${analysis.sentiment.overall} (${analysis.sentiment.confidence})`);
        } catch (error) {
            console.warn(`⚠️ Sentiment analysis failed for ${symbol}:`, error.message);
        }
        
        // 2. Get ML prediction
        try {
            analysis.mlPrediction = await this.mlModels.predict(symbol);
            console.log(`🤖 ${symbol} ML prediction: ${analysis.mlPrediction.direction} (${analysis.mlPrediction.confidence})`);
        } catch (error) {
            console.warn(`⚠️ ML prediction failed for ${symbol}:`, error.message);
        }
        
        // 3. Get AI recommendation
        try {
            const aiResult = await this.aiManager.analyzeWithEnhancedAI(symbol, '1h', {
                model: 'gpt-4',
                includeML: true,
                includeSentiment: true
            });
            analysis.aiRecommendation = aiResult;
            console.log(`🧠 ${symbol} AI recommendation: ${aiResult.analysis?.action} (${aiResult.analysis?.confidence})`);
        } catch (error) {
            console.warn(`⚠️ AI analysis failed for ${symbol}:`, error.message);
        }
        
        // 4. Combine all signals into final decision
        analysis.finalDecision = this.combineSignals(analysis);
        
        console.log(`🎯 ${symbol} FINAL DECISION: ${analysis.finalDecision.action} (confidence: ${analysis.finalDecision.confidence})`);
        
        return analysis;
    }
    
    /**
     * Combine sentiment + ML + AI signals into final trading decision
     */
    combineSignals(analysis) {
        const signals = [];
        let totalWeight = 0;
        
        // Process sentiment signal
        if (analysis.sentiment) {
            const sentimentSignal = this.convertSentimentToSignal(analysis.sentiment);
            signals.push({
                signal: sentimentSignal,
                confidence: analysis.sentiment.confidence,
                weight: this.config.sentimentWeight
            });
            totalWeight += this.config.sentimentWeight;
        }
        
        // Process ML signal
        if (analysis.mlPrediction) {
            signals.push({
                signal: analysis.mlPrediction.direction === 'up' ? 1 : -1,
                confidence: analysis.mlPrediction.confidence,
                weight: this.config.mlWeight
            });
            totalWeight += this.config.mlWeight;
        }
        
        // Process AI signal
        if (analysis.aiRecommendation?.analysis) {
            const aiSignal = this.convertAIToSignal(analysis.aiRecommendation.analysis);
            signals.push({
                signal: aiSignal,
                confidence: analysis.aiRecommendation.analysis.confidence || 0.5,
                weight: this.config.aiWeight
            });
            totalWeight += this.config.aiWeight;
        }
        
        // Calculate weighted average
        let weightedSum = 0;
        let weightedConfidence = 0;
        
        signals.forEach(s => {
            const normalizedWeight = s.weight / totalWeight;
            weightedSum += s.signal * s.confidence * normalizedWeight;
            weightedConfidence += s.confidence * normalizedWeight;
        });
        
        // Determine final action
        let action = 'hold';
        if (Math.abs(weightedSum) >= this.config.confidenceThreshold) {
            action = weightedSum > 0 ? 'buy' : 'sell';
        }
        
        return {
            action,
            confidence: Math.abs(weightedSum),
            rawConfidence: weightedConfidence,
            signals: signals.length,
            reasoning: `Combined ${signals.length} signals: sentiment, ML, AI analysis`
        };
    }
    
    /**
     * Convert sentiment to trading signal (-1 to 1)
     */
    convertSentimentToSignal(sentiment) {
        const sentimentMap = {
            'very_positive': 1,
            'positive': 0.5,
            'neutral': 0,
            'negative': -0.5,
            'very_negative': -1
        };
        return sentimentMap[sentiment.overall] || 0;
    }
    
    /**
     * Convert AI recommendation to trading signal (-1 to 1)
     */
    convertAIToSignal(aiAnalysis) {
        if (aiAnalysis.action === 'buy') return 1;
        if (aiAnalysis.action === 'sell') return -1;
        return 0;
    }
    
    /**
     * Execute trades for all users based on symbol analysis
     */
    async executeTradesForSymbol(symbol, analysis) {
        if (analysis.finalDecision.action === 'hold') {
            return; // No action needed
        }
        
        console.log(`🚀 Executing trades for ${symbol}: ${analysis.finalDecision.action}`);
        
        for (const [userId, userConfig] of this.activeUsers) {
            // Check if user allows this symbol
            if (!userConfig.allowedSymbols.includes(symbol)) {
                continue;
            }
            
            try {
                await this.executeTradeForUser(userId, userConfig, symbol, analysis);
            } catch (error) {
                console.error(`❌ Failed to execute trade for user ${userId}:`, error);
                this.emit('trade:error', userId, error);
            }
        }
    }
    
    /**
     * Execute individual trade for a specific user
     */
    async executeTradeForUser(userId, userConfig, symbol, analysis) {
        // Calculate position size based on user's risk tolerance
        const positionSize = this.calculatePositionSize(userConfig, analysis.finalDecision.confidence);
        
        // Get user's trading engine (this would come from the main app)
        const tradingEngine = await this.getUserTradingEngine(userId);
        
        // Check if user already has too many positions
        const currentPositions = tradingEngine.positions.size;
        if (currentPositions >= this.config.maxPositionsPerUser) {
            console.log(`⚠️ User ${userId} has max positions (${currentPositions})`);
            return;
        }
        
        // Execute the trade
        const side = analysis.finalDecision.action === 'buy' ? 'long' : 'short';
        
        console.log(`📈 Executing ${side} trade for user ${userId}: ${symbol} (${positionSize} units)`);
        
        const tradeResult = await tradingEngine.openPosition(symbol, side, positionSize, {
            stopLoss: 0.02, // 2% stop loss
            takeProfit: 0.06, // 6% take profit
            reason: 'autonomous_ai',
            confidence: analysis.finalDecision.confidence,
            aiAnalysis: analysis
        });
        
        // Update stats
        this.stats.totalTrades++;
        this.stats.avgConfidence = (this.stats.avgConfidence * (this.stats.totalTrades - 1) + analysis.finalDecision.confidence) / this.stats.totalTrades;
        
        // Emit trade event
        this.emit('trade:executed', {
            userId,
            symbol,
            side,
            positionSize,
            confidence: analysis.finalDecision.confidence,
            analysis,
            tradeResult
        });
        
        console.log(`✅ Trade executed for user ${userId}: ${symbol} ${side}`);
    }
    
    /**
     * Calculate position size based on user config and confidence
     */
    calculatePositionSize(userConfig, confidence) {
        const baseSize = userConfig.balance * userConfig.maxRisk; // 2% of balance
        const confidenceMultiplier = confidence; // Scale by confidence
        return Math.floor(baseSize * confidenceMultiplier);
    }
    
    /**
     * Get user's trading engine (placeholder - would integrate with main system)
     */
    async getUserTradingEngine(userId) {
        // This would be injected from the main application
        // For now, return a mock engine
        return {
            positions: new Map(),
            openPosition: async (symbol, side, quantity, options) => {
                console.log(`Mock trade: ${side} ${quantity} ${symbol}`);
                return { success: true, positionId: `pos_${Date.now()}` };
            }
        };
    }
    
    /**
     * Get current brain statistics
     */
    getStats() {
        return {
            ...this.stats,
            activeUsers: this.activeUsers.size,
            isActive: this.isActive,
            lastAnalysis: Array.from(this.lastAnalysis.entries()).map(([symbol, analysis]) => ({
                symbol,
                action: analysis.finalDecision?.action,
                confidence: analysis.finalDecision?.confidence,
                timestamp: analysis.timestamp
            }))
        };
    }
    
    /**
     * Update user configuration
     */
    updateUserConfig(userId, newConfig) {
        const currentConfig = this.activeUsers.get(userId);
        if (currentConfig) {
            this.activeUsers.set(userId, { ...currentConfig, ...newConfig });
            console.log(`👤 Updated config for user ${userId}`);
            this.emit('user:updated', userId, newConfig);
        }
    }
}

module.exports = AutonomousAIBrain;
