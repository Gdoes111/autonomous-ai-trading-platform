/**
 * REDDIT SENTIMENT ANALYSIS ENGINE
 * Scrapes and analyzes Reddit posts for trading sentiment
 */

const EventEmitter = require('events');

class RedditSentimentEngine extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.config = {
            subreddits: config.subreddits || [
                'wallstreetbets',
                'StockMarket', 
                'investing',
                'stocks',
                'SecurityAnalysis',
                'ValueInvesting',
                'CryptoCurrency',
                'Bitcoin',
                'ethereum',
                'Forex',
                'trading'
            ],
            updateInterval: config.updateInterval || 300000, // 5 minutes
            sentimentCache: new Map(),
            maxCacheAge: config.maxCacheAge || 900000, // 15 minutes
            ...config
        };
        
        // Sentiment keywords (simplified - would use ML in production)
        this.positiveKeywords = [
            'bullish', 'moon', 'pump', 'buy', 'calls', 'rocket', 'diamond hands',
            'hodl', 'long', 'breakout', 'rally', 'surge', 'gains', 'profit',
            'strong', 'support', 'momentum', 'uptrend', 'rising', 'positive'
        ];
        
        this.negativeKeywords = [
            'bearish', 'dump', 'sell', 'puts', 'crash', 'drop', 'fall',
            'short', 'breakdown', 'decline', 'loss', 'weak', 'resistance',
            'downtrend', 'negative', 'fear', 'panic', 'bubble', 'overvalued'
        ];
        
        console.log('📱 Reddit Sentiment Engine initialized');
    }
    
    /**
     * Initialize the Reddit sentiment engine
     */
    async initialize() {
        console.log('🔧 Initializing Reddit Sentiment Engine...');
        
        // In production, this would set up Reddit API connection
        // For demo, we'll simulate Reddit data
        
        this.isInitialized = true;
        console.log('✅ Reddit Sentiment Engine ready');
    }
    
    /**
     * Analyze sentiment for a specific symbol
     */
    async analyzeSentiment(symbol) {
        console.log(`📊 Analyzing Reddit sentiment for ${symbol}...`);
        
        // Check cache first
        const cacheKey = symbol.toUpperCase();
        const cached = this.config.sentimentCache.get(cacheKey);
        
        if (cached && (Date.now() - cached.timestamp) < this.config.maxCacheAge) {
            console.log(`📊 Using cached sentiment for ${symbol}`);
            return cached.data;
        }
        
        // Get fresh sentiment analysis
        const sentiment = await this.fetchAndAnalyzeSentiment(symbol);
        
        // Cache result
        this.config.sentimentCache.set(cacheKey, {
            data: sentiment,
            timestamp: Date.now()
        });
        
        return sentiment;
    }
    
    /**
     * Fetch and analyze Reddit sentiment (simulated for demo)
     */
    async fetchAndAnalyzeSentiment(symbol) {
        // In production, this would:
        // 1. Search Reddit posts mentioning the symbol
        // 2. Use NLP/ML to analyze sentiment
        // 3. Weight by post popularity, recency, etc.
        
        // For demo, we'll simulate realistic sentiment data
        return this.simulateRedditSentiment(symbol);
    }
    
    /**
     * Simulate Reddit sentiment analysis (for demo/testing)
     */
    simulateRedditSentiment(symbol) {
        const symbolUpper = symbol.toUpperCase();
        
        // Generate realistic sentiment based on symbol and time
        const random = Math.random();
        const timeOfDay = new Date().getHours();
        
        // Simulate different sentiment patterns
        let baseSentiment = 0;
        
        // Market hours tend to be more volatile
        if (timeOfDay >= 9 && timeOfDay <= 16) {
            baseSentiment += (random - 0.5) * 0.4;
        }
        
        // Different assets have different sentiment patterns
        if (symbolUpper.includes('BTC') || symbolUpper.includes('ETH')) {
            baseSentiment += 0.1; // Crypto generally more bullish on Reddit
        }
        
        if (symbolUpper.includes('USD')) {
            baseSentiment += (random - 0.5) * 0.3; // Forex more moderate
        }
        
        // Add some randomness
        baseSentiment += (random - 0.5) * 0.6;
        
        // Convert to sentiment categories
        let overall;
        if (baseSentiment > 0.3) overall = 'very_positive';
        else if (baseSentiment > 0.1) overall = 'positive';
        else if (baseSentiment > -0.1) overall = 'neutral';
        else if (baseSentiment > -0.3) overall = 'negative';
        else overall = 'very_negative';
        
        // Generate realistic post counts and engagement
        const postCount = Math.floor(random * 100) + 20;
        const avgUpvotes = Math.floor(random * 50) + 5;
        const commentCount = Math.floor(random * 200) + 10;
        
        // Calculate confidence based on volume and consistency
        const confidence = Math.min(0.95, Math.max(0.3, 
            (postCount / 100) * 0.4 + 
            (avgUpvotes / 50) * 0.3 + 
            Math.abs(baseSentiment) * 0.3
        ));
        
        return {
            symbol: symbolUpper,
            overall,
            score: baseSentiment,
            confidence: Math.round(confidence * 100) / 100,
            sources: {
                reddit: {
                    posts: postCount,
                    avgUpvotes,
                    comments: commentCount,
                    subreddits: this.config.subreddits.slice(0, 3),
                    timeframe: '1h'
                }
            },
            breakdown: {
                very_positive: overall === 'very_positive' ? 0.4 : 0.1,
                positive: overall === 'positive' ? 0.3 : 0.15,
                neutral: overall === 'neutral' ? 0.4 : 0.2,
                negative: overall === 'negative' ? 0.3 : 0.15,
                very_negative: overall === 'very_negative' ? 0.4 : 0.1
            },
            trending: {
                isHot: random > 0.7,
                mentions1h: postCount,
                mentions24h: postCount * 24,
                momentumScore: (random - 0.5) * 2
            },
            lastUpdated: new Date(),
            keywords: {
                positive: this.positiveKeywords.slice(0, 3),
                negative: this.negativeKeywords.slice(0, 2)
            }
        };
    }
    
    /**
     * Get trending symbols based on Reddit activity
     */
    async getTrendingSymbols(limit = 10) {
        console.log('📈 Getting trending symbols from Reddit...');
        
        // In production, this would analyze Reddit for most mentioned symbols
        // For demo, return some popular symbols with activity
        
        const trendingSymbols = [
            'BTCUSD', 'ETHUSD', 'EURUSD', 'GBPUSD', 'USDJPY',
            'AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL'
        ];
        
        const results = [];
        
        for (let i = 0; i < Math.min(limit, trendingSymbols.length); i++) {
            const symbol = trendingSymbols[i];
            const sentiment = await this.analyzeSentiment(symbol);
            
            results.push({
                symbol,
                mentions: sentiment.sources.reddit.posts,
                sentiment: sentiment.overall,
                confidence: sentiment.confidence,
                momentum: sentiment.trending.momentumScore
            });
        }
        
        // Sort by mentions and momentum
        return results.sort((a, b) => 
            (b.mentions * (1 + Math.abs(b.momentum))) - 
            (a.mentions * (1 + Math.abs(a.momentum)))
        );
    }
    
    /**
     * Get sentiment summary for multiple symbols
     */
    async getSentimentSummary(symbols) {
        console.log(`📊 Getting sentiment summary for ${symbols.length} symbols...`);
        
        const results = {};
        
        for (const symbol of symbols) {
            try {
                results[symbol] = await this.analyzeSentiment(symbol);
            } catch (error) {
                console.error(`❌ Failed to get sentiment for ${symbol}:`, error);
                results[symbol] = {
                    error: error.message,
                    overall: 'neutral',
                    confidence: 0
                };
            }
        }
        
        return results;
    }
    
    /**
     * Start continuous sentiment monitoring
     */
    startMonitoring(symbols = []) {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
        
        console.log(`🔄 Starting continuous sentiment monitoring for ${symbols.length} symbols...`);
        
        this.monitoringInterval = setInterval(async () => {
            try {
                const summary = await this.getSentimentSummary(symbols);
                this.emit('sentiment:update', summary);
            } catch (error) {
                console.error('❌ Sentiment monitoring error:', error);
                this.emit('sentiment:error', error);
            }
        }, this.config.updateInterval);
    }
    
    /**
     * Stop sentiment monitoring
     */
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
            console.log('🛑 Stopped sentiment monitoring');
        }
    }
    
    /**
     * Clear sentiment cache
     */
    clearCache() {
        this.config.sentimentCache.clear();
        console.log('🗑️ Sentiment cache cleared');
    }
    
    /**
     * Get engine statistics
     */
    getStats() {
        return {
            cacheSize: this.config.sentimentCache.size,
            subredditCount: this.config.subreddits.length,
            isMonitoring: !!this.monitoringInterval,
            isInitialized: this.isInitialized,
            lastUpdate: new Date()
        };
    }
}

module.exports = RedditSentimentEngine;
