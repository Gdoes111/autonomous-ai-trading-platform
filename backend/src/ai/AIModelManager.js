/**
 * AI Model Integration Layer
 * Handles real connections to OpenAI, Anthropic APIs
 */

require('dotenv/config');
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const RedditSentimentEngine = require('./RedditSentimentEngine.js');
const MLModelsEngine = require('./MLModelsEngine.js');

class AIModelManager {
    constructor(config = {}) {
        this.config = config;
        
        // Initialize AI clients
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        
        this.anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY
        });

        // Initialize sentiment and ML engines
        this.redditSentiment = new RedditSentimentEngine();
        this.mlModels = new MLModelsEngine();
        
        // Model configurations
        this.models = {
            'gpt-4': {
                provider: 'openai',
                model: 'gpt-4',
                tier: 'free',
                costPerAnalysis: 0.05,
                maxTokens: 2000,
                features: ['technical_analysis', 'sentiment_integration', 'ml_enhanced']
            },
            'gpt-4-turbo': {
                provider: 'openai', 
                model: 'gpt-4-turbo-preview',
                tier: 'premium',
                costPerAnalysis: 0.08,
                maxTokens: 4000,
                features: ['advanced_technical', 'multi_timeframe', 'sentiment_integration', 'ml_enhanced']
            },
            'claude-3-sonnet': {
                provider: 'anthropic',
                model: 'claude-3-sonnet-20240229',
                tier: 'premium', 
                costPerAnalysis: 0.10,
                maxTokens: 4000,
                features: ['statistical_analysis', 'risk_modeling', 'sentiment_integration', 'ml_enhanced']
            },
            'claude-3-opus': {
                provider: 'anthropic',
                model: 'claude-3-opus-20240229', 
                tier: 'premium',
                costPerAnalysis: 0.20,
                maxTokens: 4000,
                features: ['ensemble_analysis', 'portfolio_optimization', 'sentiment_integration', 'ml_enhanced']
            },
            'ml-ensemble': {
                provider: 'ml',
                model: 'ensemble_predictor',
                tier: 'premium',
                costPerAnalysis: 0.03,
                features: ['price_prediction', 'volatility_forecasting', 'trend_classification']
            },
            'sentiment-analyzer': {
                provider: 'sentiment',
                model: 'reddit_sentiment',
                tier: 'free',
                costPerAnalysis: 0.01,
                features: ['social_sentiment', 'trending_analysis', 'community_signals']
            }
        };
        
        console.log('🤖 AI Model Manager initialized');
    }
    
    /**
     * Analyze market data with specified AI model
     */
    async analyzeMarket(modelId, symbol, marketData, userTier = 'free') {
        const model = this.models[modelId];
        if (!model) {
            throw new Error(`AI model ${modelId} not found`);
        }
        
        // Check access permissions
        if (model.tier === 'premium' && userTier === 'free') {
            throw new Error(`${modelId} requires premium subscription`);
        }
        
        try {
            let analysis;
            
            if (model.provider === 'openai') {
                analysis = await this.analyzeWithOpenAI(model, symbol, marketData);
            } else if (model.provider === 'anthropic') {
                analysis = await this.analyzeWithAnthropic(model, symbol, marketData);
            }
            
            return {
                ...analysis,
                modelId,
                cost: model.costPerAnalysis,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error(`AI analysis error with ${modelId}:`, error);
            throw new Error(`Failed to analyze with ${modelId}: ${error.message}`);
        }
    }
    
    /**
     * OpenAI GPT Analysis
     */
    async analyzeWithOpenAI(model, symbol, marketData, customPrompt = null) {
        const prompt = customPrompt || this.createTradingPrompt(symbol, marketData);
        
        const completion = await this.openai.chat.completions.create({
            model: model.model,
            messages: [
                {
                    role: "system",
                    content: `You are an expert quantitative trader and financial analyst. Analyze the provided market data and provide specific trading recommendations.
                    
                    IMPORTANT: Respond only with valid JSON in this exact format:
                    {
                        "action": "buy" | "sell" | "hold",
                        "confidence": 0.0-1.0,
                        "reasoning": "detailed explanation",
                        "targetPrice": number,
                        "stopLoss": number,
                        "takeProfit": number,
                        "timeHorizon": "1h" | "4h" | "1d",
                        "riskLevel": "low" | "medium" | "high"
                    }`
                },
                {
                    role: "user", 
                    content: prompt
                }
            ],
            max_tokens: model.maxTokens,
            temperature: 0.3
        });
        
        const response = completion.choices[0].message.content;
        
        try {
            return JSON.parse(response);
        } catch (error) {
            console.error('Failed to parse OpenAI response:', response);
            throw new Error('Invalid response format from AI model');
        }
    }
    
    /**
     * Anthropic Claude Analysis  
     */
    async analyzeWithAnthropic(model, symbol, marketData, customPrompt = null) {
        const prompt = customPrompt || this.createTradingPrompt(symbol, marketData);
        
        const message = await this.anthropic.messages.create({
            model: model.model,
            max_tokens: model.maxTokens,
            temperature: 0.3,
            messages: [
                {
                    role: "user",
                    content: `You are an expert quantitative trader specializing in statistical analysis and mean reversion strategies. 
                    
                    Analyze the provided market data and respond only with valid JSON:
                    {
                        "action": "buy" | "sell" | "hold",
                        "confidence": 0.0-1.0,
                        "reasoning": "detailed statistical analysis",
                        "targetPrice": number,
                        "stopLoss": number, 
                        "takeProfit": number,
                        "timeHorizon": "1h" | "4h" | "1d",
                        "riskLevel": "low" | "medium" | "high"
                    }
                    
                    Market Data:
                    ${prompt}`
                }
            ]
        });
        
        const response = message.content[0].text;
        
        try {
            return JSON.parse(response);
        } catch (error) {
            console.error('Failed to parse Claude response:', response);
            throw new Error('Invalid response format from AI model');
        }
    }
    
    /**
     * Create detailed trading prompt with market data
     */
    createTradingPrompt(symbol, marketData) {
        const latest = marketData[marketData.length - 1];
        const previous = marketData[marketData.length - 2];
        
        // Calculate key metrics
        const priceChange = ((latest.close - previous.close) / previous.close) * 100;
        const volumeChange = ((latest.volume - previous.volume) / previous.volume) * 100;
        
        // Get recent price action (last 20 periods)
        const recentData = marketData.slice(-20);
        const highs = recentData.map(d => d.high);
        const lows = recentData.map(d => d.low);
        const closes = recentData.map(d => d.close);
        
        const currentPrice = latest.close;
        const support = Math.min(...lows);
        const resistance = Math.max(...highs);
        
        // Simple technical indicators
        const sma5 = closes.slice(-5).reduce((a, b) => a + b) / 5;
        const sma20 = closes.reduce((a, b) => a + b) / closes.length;
        const rsi = this.calculateSimpleRSI(closes.slice(-14));
        
        return `
TRADING ANALYSIS REQUEST

Symbol: ${symbol}
Current Price: $${currentPrice.toFixed(4)}
Price Change (24h): ${priceChange.toFixed(2)}%
Volume Change: ${volumeChange.toFixed(2)}%

TECHNICAL LEVELS:
- Support: $${support.toFixed(4)}
- Resistance: $${resistance.toFixed(4)}
- SMA(5): $${sma5.toFixed(4)}
- SMA(20): $${sma20.toFixed(4)}
- RSI(14): ${rsi.toFixed(2)}

RECENT PRICE DATA (Last 10 periods):
${recentData.slice(-10).map((d, i) => 
    `${i+1}. Open: $${d.open.toFixed(4)}, High: $${d.high.toFixed(4)}, Low: $${d.low.toFixed(4)}, Close: $${d.close.toFixed(4)}, Volume: ${d.volume}`
).join('\n')}

ANALYSIS REQUIREMENTS:
1. Determine if this is a BUY, SELL, or HOLD opportunity
2. Provide confidence level (0.0 to 1.0)
3. Set realistic target price, stop loss, and take profit levels
4. Explain your reasoning based on technical and momentum factors
5. Assess risk level for this trade
6. Recommend appropriate time horizon

Consider:
- Current trend direction and momentum
- Support/resistance levels
- Volume patterns
- Risk/reward ratio
- Market volatility
`;
    }
    
    /**
     * Simple RSI calculation for prompt
     */
    calculateSimpleRSI(closes, period = 14) {
        if (closes.length < period + 1) return 50;
        
        let gains = 0;
        let losses = 0;
        
        for (let i = 1; i < closes.length; i++) {
            const change = closes[i] - closes[i - 1];
            if (change > 0) {
                gains += change;
            } else {
                losses -= change;
            }
        }
        
        const avgGain = gains / period;
        const avgLoss = losses / period;
        
        if (avgLoss === 0) return 100;
        
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }
    
    /**
     * Get available models for user tier
     */
    getAvailableModels(userTier = 'free') {
        return Object.entries(this.models)
            .filter(([modelId, config]) => userTier === 'premium' || config.tier === 'free')
            .map(([modelId, config]) => ({
                id: modelId,
                name: config.model,
                provider: config.provider,
                tier: config.tier,
                cost: config.costPerAnalysis
            }));
    }
    
    /**
     * Validate API keys
     */
    async validateConnections() {
        const status = {
            openai: false,
            anthropic: false,
            errors: []
        };
        
        // Test OpenAI connection
        try {
            if (process.env.OPENAI_API_KEY) {
                await this.openai.models.list();
                status.openai = true;
            }
        } catch (error) {
            status.errors.push(`OpenAI: ${error.message}`);
        }
        
        // Test Anthropic connection
        try {
            if (process.env.ANTHROPIC_API_KEY) {
                // Simple test message
                await this.anthropic.messages.create({
                    model: 'claude-3-sonnet-20240229',
                    max_tokens: 10,
                    messages: [{ role: 'user', content: 'test' }]
                });
                status.anthropic = true;
            }
        } catch (error) {
            status.errors.push(`Anthropic: ${error.message}`);
        }
        
        return status;
    }

    /**
     * Enhanced analysis with ML and sentiment integration
     */
    async analyzeWithEnhancedAI(symbol, timeframe, analysisOptions = {}) {
        try {
            const { model = 'gpt-4', includeML = true, includeSentiment = true, interval = '1min' } = analysisOptions;
            
            // Get real market data via Yahoo Finance API
            const marketData = await this.getMarketData(symbol, timeframe);
            
            // Get ML predictions if requested
            let mlPredictions = null;
            if (includeML && this.mlEngine) {
                try {
                    mlPredictions = await this.mlEngine.predict(symbol, marketData);
                } catch (error) {
                    console.warn('ML predictions failed:', error.message);
                }
            }
            
            // Get sentiment analysis if requested
            let sentimentData = null;
            if (includeSentiment && this.sentimentEngine) {
                try {
                    sentimentData = await this.sentimentEngine.analyzeSentiment(symbol);
                } catch (error) {
                    console.warn('Sentiment analysis failed:', error.message);
                }
            }
            
            // Apply interval cost multiplier
            const multiplier = this.getIntervalMultiplier(interval);
            const baseCost = this.models[model]?.costPerAnalysis || 0.05;
            const totalCost = baseCost * multiplier;
            
            // Route to appropriate AI model
            let analysis;
            const modelConfig = this.models[model];
            
            if (modelConfig.provider === 'ml') {
                analysis = await this.analyzeWithML(symbol, marketData, mlPredictions);
            } else if (modelConfig.provider === 'sentiment') {
                analysis = await this.analyzeWithSentiment(symbol, sentimentData);
            } else {
                // LLM analysis with integrated ML and sentiment data
                analysis = await this.analyzeWithLLM(symbol, marketData, model, {
                    mlPredictions,
                    sentimentData,
                    interval
                });
            }
            
            return {
                ...analysis,
                cost: totalCost,
                model: model,
                timestamp: new Date(),
                mlPredictions,
                sentimentData
            };
            
        } catch (error) {
            console.error('Enhanced AI Analysis failed:', error);
            throw new Error(`Enhanced AI analysis failed: ${error.message}`);
        }
    }

    /**
     * Analyze using ML models only
     */
    async analyzeWithML(symbol, marketData, mlPredictions) {
        if (!this.mlEngine) {
            throw new Error('ML Engine not available');
        }

        const predictions = mlPredictions || await this.mlEngine.generatePredictions(symbol, marketData);
        
        return {
            signal: predictions.predictedDirection === 'up' ? 'BUY' : 'SELL',
            confidence: predictions.confidence,
            reasoning: [
                `ML model predicts ${predictions.predictedDirection} movement`,
                `Price target: ${predictions.priceTarget}`,
                `Volatility forecast: ${predictions.volatility}`,
                `Trend classification: ${predictions.trendClassification}`
            ],
            targets: {
                entry: marketData.close,
                stopLoss: predictions.predictedDirection === 'up' ? 
                    marketData.close * 0.98 : marketData.close * 1.02,
                takeProfit: predictions.priceTarget
            },
            riskLevel: predictions.confidence > 0.7 ? 'low' : 'medium',
            timeframe: '1-4 hours',
            mlPredictions: predictions
        };
    }

    /**
     * Analyze using sentiment data only
     */
    async analyzeWithSentiment(symbol, sentimentData) {
        if (!this.sentimentEngine) {
            throw new Error('Sentiment Engine not available');
        }

        const sentiment = sentimentData || await this.sentimentEngine.analyzeSentiment(symbol);
        
        const signal = sentiment.overall_score > 0.1 ? 'BUY' : 
                      sentiment.overall_score < -0.1 ? 'SELL' : 'HOLD';
        
        return {
            signal,
            confidence: Math.min(Math.abs(sentiment.overall_score) * 2, 0.9),
            reasoning: [
                `Social sentiment score: ${sentiment.overall_score.toFixed(3)}`,
                `Posts analyzed: ${sentiment.total_posts}`,
                `Trending mentions: ${sentiment.trending_symbols?.includes(symbol) ? 'Yes' : 'No'}`,
                `Community buzz: ${sentiment.overall_score > 0 ? 'Positive' : 'Negative'}`
            ],
            riskLevel: Math.abs(sentiment.overall_score) > 0.3 ? 'low' : 'high',
            timeframe: '1-6 hours',
            sentimentData: sentiment
        };
    }

    /**
     * Enhanced LLM analysis with ML and sentiment context
     */
    async analyzeWithLLM(symbol, marketData, model, context = {}) {
        const { mlPredictions, sentimentData, interval } = context;
        
        // Create enhanced prompt with ML and sentiment context
        let prompt = this.createTradingPrompt(symbol, marketData);
        
        if (mlPredictions) {
            prompt += `\n\nML MODEL PREDICTIONS:
- Direction: ${mlPredictions.predictedDirection}
- Price Target: ${mlPredictions.priceTarget}
- Confidence: ${mlPredictions.confidence}
- Volatility: ${mlPredictions.volatility}
- Trend: ${mlPredictions.trendClassification}`;
        }
        
        if (sentimentData) {
            prompt += `\n\nSOCIAL SENTIMENT DATA:
- Overall Score: ${sentimentData.overall_score}
- Posts Analyzed: ${sentimentData.total_posts}
- Trending: ${sentimentData.trending_symbols?.includes(symbol) ? 'Yes' : 'No'}
- Community Buzz: ${sentimentData.overall_score > 0 ? 'Positive' : 'Negative'}`;
        }
        
        prompt += `\n\nPlease integrate the ML predictions and sentiment data into your technical analysis for a comprehensive trading recommendation.`;
        
        const modelConfig = this.models[model];
        
        if (modelConfig.provider === 'openai') {
            return await this.analyzeWithOpenAI(modelConfig, symbol, marketData, prompt);
        } else if (modelConfig.provider === 'anthropic') {
            return await this.analyzeWithAnthropic(modelConfig, symbol, marketData, prompt);
        } else {
            throw new Error(`Unsupported model provider: ${modelConfig.provider}`);
        }
    }

    /**
     * Get real market data for analysis
     */
    async getMarketData(symbol, timeframe = '1d') {
        try {
            // Import yahoo finance dynamically to avoid startup issues
            const yahooFinance = await import('yahoo-finance2');
            
            // Determine the period based on timeframe
            const periodMap = {
                '1m': '5d',    // 5 days for 1-minute data
                '5m': '1mo',   // 1 month for 5-minute data
                '15m': '3mo',  // 3 months for 15-minute data
                '1h': '6mo',   // 6 months for hourly data
                '1d': '1y',    // 1 year for daily data
                '1w': '2y',    // 2 years for weekly data
                '1M': '5y'     // 5 years for monthly data
            };
            
            const period = periodMap[timeframe] || '1y';
            
            // Fetch real historical data from Yahoo Finance
            const historicalData = await yahooFinance.default.historical(symbol, {
                period1: new Date(Date.now() - (period === '5d' ? 5 * 24 * 60 * 60 * 1000 :
                                              period === '1mo' ? 30 * 24 * 60 * 60 * 1000 :
                                              period === '3mo' ? 90 * 24 * 60 * 60 * 1000 :
                                              period === '6mo' ? 180 * 24 * 60 * 60 * 1000 :
                                              period === '1y' ? 365 * 24 * 60 * 60 * 1000 :
                                              period === '2y' ? 730 * 24 * 60 * 60 * 1000 :
                                              1825 * 24 * 60 * 60 * 1000)), // 5 years
                period2: new Date(),
                interval: timeframe
            });
            
            // Convert to our format and limit to last 100 points for analysis
            const formattedData = historicalData.slice(-100).map(candle => ({
                timestamp: candle.date,
                open: candle.open,
                high: candle.high,
                low: candle.low,
                close: candle.close,
                volume: candle.volume
            }));
            
            if (formattedData.length === 0) {
                throw new Error(`No market data available for ${symbol}`);
            }
            
            return formattedData;
            
        } catch (error) {
            console.error(`Error fetching market data for ${symbol}:`, error);
            throw new Error(`Unable to fetch real market data for ${symbol}. Please check the symbol is valid.`);
        }
    }

    /**
     * Get cost multiplier based on analysis interval
     */
    getIntervalMultiplier(interval) {
        const multipliers = {
            '15s': 4.0,
            '30s': 3.0,
            '1min': 2.0,
            '2min': 1.5,
            '5min': 1.2,
            '15min': 1.0,
            '1h': 1.0,
            '1d': 1.0
        };
        return multipliers[interval] || 1.0;
    }
}

module.exports = AIModelManager;
