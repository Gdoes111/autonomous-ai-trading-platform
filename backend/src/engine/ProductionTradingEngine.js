/**
 * PRODUCTION-READY AI Trading Engine
 * This is a REAL trading engine with actual functionality
 */

require('dotenv/config');
const EventEmitter = require('events');
const yahooFinance = require('yahoo-finance2');
const AIModelManager = require('../ai/AIModelManager.js');
const TechnicalIndicators = require('technicalindicators');
const fs = require('fs/promises');
const path = require('path');

class ProductionTradingEngine extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.config = {
            initialBalance: config.initialBalance || 100000,
            maxPositions: config.maxPositions || 10,
            maxRisk: config.maxRisk || 0.02, // 2% max risk per trade
            maxDailyLoss: config.maxDailyLoss || 0.05, // 5% max daily loss
            commission: config.commission || 0.001, // 0.1% commission
            slippage: config.slippage || 0.0005, // 0.05% slippage
            ...config
        };
        
        // Portfolio state
        this.balance = this.config.initialBalance;
        this.positions = new Map(); // symbol -> position object
        this.orders = new Map(); // orderId -> order object
        this.trades = [];
        this.dailyPnL = 0;
        this.totalPnL = 0;
        
        // Risk management
        this.isActive = false;
        this.dailyTradeCount = 0;
        this.lastTradeDate = null;
        
        // AI Integration
        this.aiManager = new AIModelManager();
        
        // Market data cache
        this.marketDataCache = new Map();
        this.lastDataUpdate = new Map();
        
        // Performance tracking
        this.metrics = {
            totalTrades: 0,
            winningTrades: 0,
            losingTrades: 0,
            totalReturn: 0,
            sharpeRatio: 0,
            maxDrawdown: 0,
            winRate: 0,
            avgWin: 0,
            avgLoss: 0,
            profitFactor: 0
        };
        
        console.log('🚀 Production Trading Engine initialized');
        this.initializeEngine();
    }
    
    async initializeEngine() {
        try {
            // Validate API connections
            await this.validateConnections();
            
            // Load historical trades if any
            await this.loadTradeHistory();
            
            // Start market data monitoring
            this.startMarketDataMonitoring();
            
            this.emit('engine:initialized');
            console.log('✅ Trading engine fully initialized and ready');
            
        } catch (error) {
            console.error('❌ Engine initialization failed:', error);
            this.emit('engine:error', error);
        }
    }
    
    async validateConnections() {
        console.log('🔍 Validating API connections...');
        
        // Test OpenAI connection
        try {
            const aiStatus = await this.aiManager.testConnections();
            if (!aiStatus.openai) {
                throw new Error('OpenAI API connection failed');
            }
            console.log('✅ OpenAI API: Connected');
        } catch (error) {
            console.warn('⚠️ OpenAI API: Not available -', error.message);
        }
        
        // Test Yahoo Finance connection
        try {
            await yahooFinance.quote('AAPL');
            console.log('✅ Yahoo Finance API: Connected');
        } catch (error) {
            console.warn('⚠️ Yahoo Finance API: Not available -', error.message);
        }
    }
    
    async loadTradeHistory() {
        try {
            const historyPath = path.join(process.cwd(), 'data', 'trade-history.json');
            const data = await fs.readFile(historyPath, 'utf8');
            const history = JSON.parse(data);
            
            this.trades = history.trades || [];
            this.metrics = { ...this.metrics, ...history.metrics };
            this.totalPnL = history.totalPnL || 0;
            
            console.log(`📊 Loaded ${this.trades.length} historical trades`);
        } catch (error) {
            console.log('📊 No trade history found, starting fresh');
        }
    }
    
    async saveTradeHistory() {
        try {
            const historyPath = path.join(process.cwd(), 'data', 'trade-history.json');
            await fs.mkdir(path.dirname(historyPath), { recursive: true });
            
            const data = {
                trades: this.trades,
                metrics: this.metrics,
                totalPnL: this.totalPnL,
                lastUpdated: new Date().toISOString()
            };
            
            await fs.writeFile(historyPath, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Failed to save trade history:', error);
        }
    }
    
    startMarketDataMonitoring() {
        // Update market data every 5 minutes during market hours
        setInterval(() => {
            this.updateMarketData();
        }, 5 * 60 * 1000);
        
        console.log('📡 Market data monitoring started');
    }
    
    async updateMarketData() {
        try {
            const symbols = Array.from(this.positions.keys());
            if (symbols.length === 0) return;
            
            for (const symbol of symbols) {
                const quote = await yahooFinance.quote(symbol);
                this.marketDataCache.set(symbol, {
                    symbol,
                    price: quote.regularMarketPrice,
                    change: quote.regularMarketChange,
                    changePercent: quote.regularMarketChangePercent,
                    volume: quote.regularMarketVolume,
                    timestamp: new Date()
                });
                
                // Check for stop losses and take profits
                await this.checkPositionRisk(symbol, quote.regularMarketPrice);
            }
            
            this.emit('market:updated', this.marketDataCache);
            
        } catch (error) {
            console.error('Market data update failed:', error);
        }
    }
    
    async checkPositionRisk(symbol, currentPrice) {
        const position = this.positions.get(symbol);
        if (!position) return;
        
        const pnl = this.calculatePositionPnL(position, currentPrice);
        const pnlPercent = pnl / (position.entryPrice * position.quantity);
        
        // Stop loss check
        if (pnlPercent <= -position.stopLoss) {
            await this.closePosition(symbol, 'stop_loss', currentPrice);
            return;
        }
        
        // Take profit check
        if (pnlPercent >= position.takeProfit) {
            await this.closePosition(symbol, 'take_profit', currentPrice);
            return;
        }
        
        // Trailing stop check
        if (position.trailingStop) {
            const trailingStopPrice = position.side === 'long' ? 
                currentPrice * (1 - position.trailingStop) :
                currentPrice * (1 + position.trailingStop);
                
            if ((position.side === 'long' && currentPrice <= trailingStopPrice) ||
                (position.side === 'short' && currentPrice >= trailingStopPrice)) {
                await this.closePosition(symbol, 'trailing_stop', currentPrice);
            }
        }
    }
    
    async getRealMarketData(symbol, timeframe = '1d', period = '1mo') {
        try {
            console.log(`📊 Fetching real market data for ${symbol}...`);
            
            // Get real-time quote first
            const quote = await yahooFinance.quote(symbol);
            
            // Get historical data
            const historical = await yahooFinance.historical(symbol, {
                period1: this.getPeriodStart(period),
                period2: new Date(),
                interval: this.convertTimeframe(timeframe)
            });
            
            const processedData = historical.map(item => ({
                timestamp: item.date,
                open: item.open,
                high: item.high,
                low: item.low,
                close: item.close,
                volume: item.volume || 0
            }));
            
            // Add current quote as the latest data point
            if (quote && quote.regularMarketPrice) {
                processedData.push({
                    timestamp: new Date(),
                    open: quote.regularMarketPreviousClose,
                    high: quote.regularMarketDayHigh,
                    low: quote.regularMarketDayLow,
                    close: quote.regularMarketPrice,
                    volume: quote.regularMarketVolume
                });
            }
            
            console.log(`✅ Retrieved ${processedData.length} data points for ${symbol}`);
            return processedData;
            
        } catch (error) {
            console.error(`❌ Failed to fetch market data for ${symbol}:`, error);
            throw new Error(`Market data unavailable for ${symbol}`);
        }
    }
    
    getPeriodStart(period) {
        const now = new Date();
        const periodMap = {
            '1d': 1, '5d': 5, '1mo': 30, '3mo': 90,
            '6mo': 180, '1y': 365, '2y': 730, '5y': 1825
        };
        const days = periodMap[period] || 30;
        return new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
    }
    
    convertTimeframe(timeframe) {
        const frameMap = {
            '1m': '1m', '2m': '2m', '5m': '5m', '15m': '15m',
            '30m': '30m', '1h': '1d', '1d': '1d', '1wk': '1wk', '1mo': '1mo'
        };
        return frameMap[timeframe] || '1d';
    }
    
    async analyzeSymbolWithAI(symbol, options = {}) {
        try {
            const {
                model = 'gpt-4',
                timeframe = '1d',
                includeML = true,
                includeSentiment = true
            } = options;
            
            console.log(`🤖 Analyzing ${symbol} with AI model ${model}...`);
            
            // Get real market data
            const marketData = await this.getRealMarketData(symbol, timeframe);
            
            // Calculate technical indicators
            const technicals = this.calculateTechnicalIndicators(marketData);
            
            // Get AI analysis
            const aiAnalysis = await this.aiManager.analyzeWithEnhancedAI(symbol, timeframe, {
                model,
                includeML,
                includeSentiment,
                interval: '1min'
            });
            
            // Combine analysis with technical indicators
            const comprehensiveAnalysis = {
                ...aiAnalysis,
                technicals,
                marketData: marketData.slice(-5), // Last 5 periods
                timestamp: new Date()
            };
            
            console.log(`✅ AI analysis complete for ${symbol}`);
            return comprehensiveAnalysis;
            
        } catch (error) {
            console.error(`❌ AI analysis failed for ${symbol}:`, error);
            throw error;
        }
    }
    
    calculateTechnicalIndicators(marketData) {
        try {
            const closes = marketData.map(d => d.close);
            const highs = marketData.map(d => d.high);
            const lows = marketData.map(d => d.low);
            const volumes = marketData.map(d => d.volume);
            
            const indicators = {};
            
            // Moving Averages
            if (closes.length >= 20) {
                indicators.sma20 = TechnicalIndicators.SMA.calculate({ period: 20, values: closes });
                indicators.ema20 = TechnicalIndicators.EMA.calculate({ period: 20, values: closes });
            }
            
            if (closes.length >= 50) {
                indicators.sma50 = TechnicalIndicators.SMA.calculate({ period: 50, values: closes });
            }
            
            // RSI
            if (closes.length >= 14) {
                indicators.rsi = TechnicalIndicators.RSI.calculate({ period: 14, values: closes });
            }
            
            // MACD
            if (closes.length >= 26) {
                indicators.macd = TechnicalIndicators.MACD.calculate({
                    fastPeriod: 12,
                    slowPeriod: 26,
                    signalPeriod: 9,
                    values: closes
                });
            }
            
            // Bollinger Bands
            if (closes.length >= 20) {
                indicators.bollingerBands = TechnicalIndicators.BollingerBands.calculate({
                    period: 20,
                    stdDev: 2,
                    values: closes
                });
            }
            
            // Stochastic Oscillator
            if (closes.length >= 14) {
                indicators.stochastic = TechnicalIndicators.Stochastic.calculate({
                    high: highs,
                    low: lows,
                    close: closes,
                    period: 14,
                    signalPeriod: 3
                });
            }
            
            // Average True Range (ATR)
            if (closes.length >= 14) {
                indicators.atr = TechnicalIndicators.ATR.calculate({
                    high: highs,
                    low: lows,
                    close: closes,
                    period: 14
                });
            }
            
            return indicators;
            
        } catch (error) {
            console.error('Technical indicator calculation failed:', error);
            return {};
        }
    }
    
    async openPosition(symbol, side, quantity, options = {}) {
        try {
            console.log(`📈 Opening ${side} position: ${quantity} shares of ${symbol}`);
            
            // Validate inputs
            if (!['long', 'short'].includes(side)) {
                throw new Error('Side must be "long" or "short"');
            }
            
            if (quantity <= 0) {
                throw new Error('Quantity must be positive');
            }
            
            // Check if we already have a position in this symbol
            if (this.positions.has(symbol)) {
                throw new Error(`Position already exists for ${symbol}`);
            }
            
            // Get current market price
            const quote = await yahooFinance.quote(symbol);
            const currentPrice = quote.regularMarketPrice;
            
            if (!currentPrice || currentPrice <= 0) {
                throw new Error(`Invalid price for ${symbol}: ${currentPrice}`);
            }
            
            // Calculate position value
            const positionValue = currentPrice * quantity;
            const commission = positionValue * this.config.commission;
            const totalCost = positionValue + commission;
            
            // Check if we have enough balance
            if (totalCost > this.balance) {
                throw new Error(`Insufficient balance. Required: $${totalCost.toFixed(2)}, Available: $${this.balance.toFixed(2)}`);
            }
            
            // Risk management - don't risk more than maxRisk per trade
            const riskAmount = this.balance * this.config.maxRisk;
            if (positionValue > riskAmount) {
                throw new Error(`Position size exceeds maximum risk. Max allowed: $${riskAmount.toFixed(2)}`);
            }
            
            // Create position object
            const position = {
                symbol,
                side,
                quantity,
                entryPrice: currentPrice,
                entryTime: new Date(),
                stopLoss: options.stopLoss || 0.02, // 2% default stop loss
                takeProfit: options.takeProfit || 0.06, // 6% default take profit
                trailingStop: options.trailingStop || null,
                commission,
                unrealizedPnL: 0,
                realizedPnL: 0
            };
            
            // Update balance
            this.balance -= totalCost;
            
            // Store position
            this.positions.set(symbol, position);
            
            // Record trade
            const trade = {
                id: this.generateTradeId(),
                symbol,
                side,
                quantity,
                entryPrice: currentPrice,
                entryTime: new Date(),
                commission,
                type: 'open',
                status: 'filled'
            };
            
            this.trades.push(trade);
            this.metrics.totalTrades++;
            
            // Emit events
            this.emit('position:opened', position);
            this.emit('trade:executed', trade);
            
            console.log(`✅ Position opened: ${side} ${quantity} ${symbol} @ $${currentPrice}`);
            
            // Save state
            await this.saveTradeHistory();
            
            return position;
            
        } catch (error) {
            console.error(`❌ Failed to open position for ${symbol}:`, error);
            throw error;
        }
    }
    
    async closePosition(symbol, reason = 'manual', exitPrice = null) {
        try {
            const position = this.positions.get(symbol);
            if (!position) {
                throw new Error(`No position found for ${symbol}`);
            }
            
            console.log(`📉 Closing position: ${position.side} ${position.quantity} ${symbol} (${reason})`);
            
            // Get exit price
            const currentPrice = exitPrice || (await yahooFinance.quote(symbol)).regularMarketPrice;
            
            if (!currentPrice || currentPrice <= 0) {
                throw new Error(`Invalid exit price for ${symbol}: ${currentPrice}`);
            }
            
            // Calculate P&L
            const pnl = this.calculatePositionPnL(position, currentPrice);
            const positionValue = currentPrice * position.quantity;
            const commission = positionValue * this.config.commission;
            const netPnL = pnl - commission;
            
            // Update balance
            this.balance += positionValue - commission;
            this.totalPnL += netPnL;
            this.dailyPnL += netPnL;
            
            // Update metrics
            if (netPnL > 0) {
                this.metrics.winningTrades++;
            } else {
                this.metrics.losingTrades++;
            }
            
            // Record trade
            const trade = {
                id: this.generateTradeId(),
                symbol,
                side: position.side,
                quantity: position.quantity,
                entryPrice: position.entryPrice,
                exitPrice: currentPrice,
                entryTime: position.entryTime,
                exitTime: new Date(),
                pnl: netPnL,
                commission: position.commission + commission,
                reason,
                type: 'close',
                status: 'filled'
            };
            
            this.trades.push(trade);
            
            // Remove position
            this.positions.delete(symbol);
            
            // Update performance metrics
            this.updatePerformanceMetrics();
            
            // Emit events
            this.emit('position:closed', { ...position, exitPrice: currentPrice, pnl: netPnL, reason });
            this.emit('trade:executed', trade);
            
            console.log(`✅ Position closed: ${symbol} P&L: $${netPnL.toFixed(2)}`);
            
            // Save state
            await this.saveTradeHistory();
            
            return trade;
            
        } catch (error) {
            console.error(`❌ Failed to close position for ${symbol}:`, error);
            throw error;
        }
    }
    
    calculatePositionPnL(position, currentPrice) {
        const { side, quantity, entryPrice } = position;
        
        if (side === 'long') {
            return (currentPrice - entryPrice) * quantity;
        } else {
            return (entryPrice - currentPrice) * quantity;
        }
    }
    
    updatePerformanceMetrics() {
        const trades = this.trades.filter(t => t.type === 'close');
        
        if (trades.length === 0) return;
        
        const wins = trades.filter(t => t.pnl > 0);
        const losses = trades.filter(t => t.pnl <= 0);
        
        this.metrics.winRate = (wins.length / trades.length) * 100;
        this.metrics.avgWin = wins.length > 0 ? wins.reduce((sum, t) => sum + t.pnl, 0) / wins.length : 0;
        this.metrics.avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0) / losses.length) : 0;
        
        if (this.metrics.avgLoss > 0) {
            this.metrics.profitFactor = this.metrics.avgWin / this.metrics.avgLoss;
        }
        
        this.metrics.totalReturn = ((this.balance + this.getTotalPositionValue() - this.config.initialBalance) / this.config.initialBalance) * 100;
    }
    
    getTotalPositionValue() {
        let totalValue = 0;
        for (const [symbol, position] of this.positions) {
            const cachedData = this.marketDataCache.get(symbol);
            if (cachedData) {
                totalValue += cachedData.price * position.quantity;
            }
        }
        return totalValue;
    }
    
    generateTradeId() {
        return `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    getPortfolioStatus() {
        const totalPositionValue = this.getTotalPositionValue();
        const totalPortfolioValue = this.balance + totalPositionValue;
        
        return {
            balance: this.balance,
            totalPositionValue,
            totalPortfolioValue,
            totalReturn: ((totalPortfolioValue - this.config.initialBalance) / this.config.initialBalance) * 100,
            dailyPnL: this.dailyPnL,
            totalPnL: this.totalPnL,
            openPositions: this.positions.size,
            metrics: this.metrics,
            positions: Array.from(this.positions.entries()).map(([symbol, position]) => {
                const cachedData = this.marketDataCache.get(symbol);
                const currentPrice = cachedData ? cachedData.price : position.entryPrice;
                const unrealizedPnL = this.calculatePositionPnL(position, currentPrice);
                
                return {
                    symbol,
                    ...position,
                    currentPrice,
                    unrealizedPnL,
                    unrealizedPnLPercent: (unrealizedPnL / (position.entryPrice * position.quantity)) * 100
                };
            })
        };
    }
    
    async start() {
        if (this.isActive) {
            console.log('⚠️ Trading engine is already active');
            return;
        }
        
        this.isActive = true;
        this.emit('engine:started');
        console.log('🚀 Trading engine started');
    }
    
    async stop() {
        if (!this.isActive) {
            console.log('⚠️ Trading engine is already stopped');
            return;
        }
        
        this.isActive = false;
        
        // Close all open positions
        for (const symbol of this.positions.keys()) {
            await this.closePosition(symbol, 'engine_stop');
        }
        
        this.emit('engine:stopped');
        console.log('🛑 Trading engine stopped');
    }
}

module.exports = ProductionTradingEngine;
