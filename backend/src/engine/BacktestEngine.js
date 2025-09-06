/**
 * Real Backtesting Engine
 * Provides accurate historical simulations with AI model integration
 */

import yahooFinance from 'yahoo-finance2';
import AIModelManager from '../ai/AIModelManager.js';

export class BacktestEngine {
    constructor(config = {}) {
        this.config = {
            initialCapital: 10000,
            commission: 0.001, // 0.1%
            slippage: 0.0005, // 0.05%
            maxPositions: 5,
            riskPerTrade: 0.02,
            ...config
        };
        
        this.aiManager = new AIModelManager();
        
        // Backtest state
        this.trades = [];
        this.positions = [];
        this.equity = [];
        this.capital = this.config.initialCapital;
        this.metrics = {};
        
        console.log('📊 Backtest Engine initialized');
    }
    
    /**
     * Run comprehensive backtest with real AI analysis
     */
    async runBacktest(params) {
        const {
            symbol,
            startDate,
            endDate,
            aiModel,
            timeframe = '1d',
            userTier = 'free'
        } = params;
        
        try {
            console.log(`🔍 Starting backtest: ${symbol} with ${aiModel}`);
            
            // Validate AI model access
            const availableModels = this.aiManager.getAvailableModels(userTier);
            const modelExists = availableModels.find(m => m.id === aiModel);
            if (!modelExists) {
                throw new Error(`AI model ${aiModel} not available for ${userTier} tier`);
            }
            
            // Get historical data
            const marketData = await this.getHistoricalData(symbol, startDate, endDate, timeframe);
            
            if (marketData.length < 30) {
                throw new Error('Insufficient historical data for backtesting');
            }
            
            // Reset backtest state
            this.resetState();
            
            // Run simulation
            const results = await this.simulate(symbol, marketData, aiModel, userTier);
            
            // Calculate performance metrics
            const metrics = this.calculateMetrics();
            
            console.log(`✅ Backtest completed: ${this.trades.length} trades, ${metrics.totalReturn.toFixed(2)}% return`);
            
            return {
                symbol,
                aiModel,
                timeframe,
                startDate,
                endDate,
                initialCapital: this.config.initialCapital,
                finalCapital: this.capital,
                trades: this.trades,
                equity: this.equity,
                metrics,
                dataPoints: marketData.length
            };
            
        } catch (error) {
            console.error('Backtest error:', error);
            throw new Error(`Backtest failed: ${error.message}`);
        }
    }
    
    /**
     * Get historical market data
     */
    async getHistoricalData(symbol, startDate, endDate, timeframe) {
        try {
            // Convert symbol for Yahoo Finance
            let yahooSymbol = symbol;
            if (symbol === 'EURUSD') yahooSymbol = 'EURUSD=X';
            if (symbol === 'GBPUSD') yahooSymbol = 'GBPUSD=X';
            if (symbol === 'USDJPY') yahooSymbol = 'USDJPY=X';
            
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            const queryOptions = {
                period1: start,
                period2: end,
                interval: this.convertTimeframe(timeframe)
            };
            
            console.log(`📈 Fetching ${yahooSymbol} data from ${start.toDateString()} to ${end.toDateString()}`);
            
            const data = await yahooFinance.historical(yahooSymbol, queryOptions);
            
            if (!data || data.length === 0) {
                throw new Error(`No data available for ${symbol}`);
            }
            
            // Format data
            return data.map(item => ({
                timestamp: new Date(item.date),
                open: Number(item.open),
                high: Number(item.high),
                low: Number(item.low),
                close: Number(item.close),
                volume: Number(item.volume || 0)
            })).sort((a, b) => a.timestamp - b.timestamp);
            
        } catch (error) {
            console.error(`Error fetching data for ${symbol}:`, error);
            throw new Error(`Failed to fetch historical data: ${error.message}`);
        }
    }
    
    /**
     * Run trading simulation with AI analysis
     */
    async simulate(symbol, marketData, aiModel, userTier) {
        const analysisInterval = 5; // Analyze every 5 periods
        let currentPosition = null;
        
        for (let i = 30; i < marketData.length; i += analysisInterval) {
            const currentBar = marketData[i];
            const historicalData = marketData.slice(Math.max(0, i - 100), i); // Last 100 periods for analysis
            
            try {
                // Get AI analysis
                const analysis = await this.aiManager.analyzeMarket(
                    aiModel,
                    symbol,
                    historicalData,
                    userTier
                );
                
                // Process trading signals
                await this.processSignal(analysis, currentBar, symbol);
                
                // Update equity curve
                this.updateEquity(currentBar.timestamp);
                
                // Simulate realistic delays (AI analysis takes time)
                await this.sleep(100);
                
            } catch (error) {
                console.warn(`Analysis error at ${currentBar.timestamp}:`, error.message);
                continue;
            }
        }
        
        // Close any remaining positions
        if (this.positions.length > 0) {
            const lastBar = marketData[marketData.length - 1];
            this.closeAllPositions(lastBar);
        }
        
        return {
            trades: this.trades,
            equity: this.equity,
            finalCapital: this.capital
        };
    }
    
    /**
     * Process AI trading signal
     */
    async processSignal(analysis, currentBar, symbol) {
        const { action, confidence, targetPrice, stopLoss, takeProfit } = analysis;
        
        // Minimum confidence threshold
        if (confidence < 0.6) {
            return;
        }
        
        // Close existing positions if signal changes
        if (this.positions.length > 0 && action !== 'hold') {
            const position = this.positions[0];
            if ((position.side === 'long' && action === 'sell') || 
                (position.side === 'short' && action === 'buy')) {
                this.closePosition(position, currentBar, 'signal_change');
            }
        }
        
        // Open new position
        if (action === 'buy' || action === 'sell') {
            if (this.positions.length < this.config.maxPositions) {
                this.openPosition(action, currentBar, analysis, symbol);
            }
        }
        
        // Check stop loss and take profit for existing positions
        this.checkStopLossAndTakeProfit(currentBar);
    }
    
    /**
     * Open new trading position
     */
    openPosition(side, currentBar, analysis, symbol) {
        const { targetPrice, stopLoss, takeProfit, confidence } = analysis;
        
        // Calculate position size based on risk
        const riskAmount = this.capital * this.config.riskPerTrade;
        const stopDistance = Math.abs(currentBar.close - stopLoss);
        
        if (stopDistance === 0) return;
        
        const positionSize = Math.min(
            riskAmount / stopDistance,
            this.capital * 0.2 / currentBar.close // Max 20% of capital per position
        );
        
        if (positionSize * currentBar.close < 100) return; // Minimum $100 position
        
        // Apply slippage and commission
        const executionPrice = this.applySlippage(currentBar.close, side);
        const commission = positionSize * executionPrice * this.config.commission;
        
        const position = {
            id: `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            symbol,
            side: side === 'buy' ? 'long' : 'short',
            size: positionSize,
            entryPrice: executionPrice,
            entryTime: currentBar.timestamp,
            stopLoss,
            takeProfit,
            confidence,
            commission,
            aiModel: analysis.modelId || 'unknown'
        };
        
        this.positions.push(position);
        this.capital -= commission;
        
        console.log(`📈 Opened ${position.side} position: ${symbol} @ $${executionPrice.toFixed(4)}`);
    }
    
    /**
     * Close trading position
     */
    closePosition(position, currentBar, reason = 'manual') {
        const executionPrice = this.applySlippage(currentBar.close, position.side === 'long' ? 'sell' : 'buy');
        const commission = position.size * executionPrice * this.config.commission;
        
        // Calculate P&L
        let pnl;
        if (position.side === 'long') {
            pnl = (executionPrice - position.entryPrice) * position.size;
        } else {
            pnl = (position.entryPrice - executionPrice) * position.size;
        }
        
        pnl -= commission + position.commission; // Subtract both entry and exit commissions
        
        const trade = {
            id: position.id,
            symbol: position.symbol,
            side: position.side,
            size: position.size,
            entryPrice: position.entryPrice,
            exitPrice: executionPrice,
            entryTime: position.entryTime,
            exitTime: currentBar.timestamp,
            pnl,
            pnlPercent: (pnl / (position.entryPrice * position.size)) * 100,
            holdingPeriod: currentBar.timestamp - position.entryTime,
            reason,
            confidence: position.confidence,
            aiModel: position.aiModel,
            commission: commission + position.commission
        };
        
        this.trades.push(trade);
        this.capital += pnl;
        
        // Remove position
        this.positions = this.positions.filter(p => p.id !== position.id);
        
        console.log(`📉 Closed ${trade.side} position: ${trade.symbol} P&L: $${pnl.toFixed(2)} (${trade.pnlPercent.toFixed(2)}%)`);
    }
    
    /**
     * Check stop loss and take profit levels
     */
    checkStopLossAndTakeProfit(currentBar) {
        for (const position of [...this.positions]) {
            let shouldClose = false;
            let reason = '';
            
            if (position.side === 'long') {
                if (currentBar.low <= position.stopLoss) {
                    shouldClose = true;
                    reason = 'stop_loss';
                } else if (currentBar.high >= position.takeProfit) {
                    shouldClose = true;
                    reason = 'take_profit';
                }
            } else { // short position
                if (currentBar.high >= position.stopLoss) {
                    shouldClose = true;
                    reason = 'stop_loss';
                } else if (currentBar.low <= position.takeProfit) {
                    shouldClose = true;
                    reason = 'take_profit';
                }
            }
            
            if (shouldClose) {
                this.closePosition(position, currentBar, reason);
            }
        }
    }
    
    /**
     * Close all positions
     */
    closeAllPositions(currentBar) {
        for (const position of [...this.positions]) {
            this.closePosition(position, currentBar, 'backtest_end');
        }
    }
    
    /**
     * Update equity curve
     */
    updateEquity(timestamp) {
        let unrealizedPnL = 0;
        
        // Calculate unrealized P&L for open positions
        for (const position of this.positions) {
            // This would need current market price, simplified for backtest
            unrealizedPnL += 0; // In real-time this would be calculated
        }
        
        this.equity.push({
            timestamp,
            capital: this.capital,
            unrealizedPnL,
            totalEquity: this.capital + unrealizedPnL
        });
    }
    
    /**
     * Apply realistic slippage
     */
    applySlippage(price, side) {
        const slippageAmount = price * this.config.slippage;
        return side === 'buy' ? price + slippageAmount : price - slippageAmount;
    }
    
    /**
     * Calculate comprehensive performance metrics
     */
    calculateMetrics() {
        if (this.trades.length === 0) {
            return {
                totalReturn: 0,
                totalTrades: 0,
                winRate: 0,
                profitFactor: 0,
                sharpeRatio: 0,
                maxDrawdown: 0,
                avgWin: 0,
                avgLoss: 0,
                largestWin: 0,
                largestLoss: 0
            };
        }
        
        const winningTrades = this.trades.filter(t => t.pnl > 0);
        const losingTrades = this.trades.filter(t => t.pnl < 0);
        
        const totalReturn = ((this.capital - this.config.initialCapital) / this.config.initialCapital) * 100;
        const winRate = (winningTrades.length / this.trades.length) * 100;
        
        const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
        const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
        const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0;
        
        const avgWin = winningTrades.length > 0 ? grossProfit / winningTrades.length : 0;
        const avgLoss = losingTrades.length > 0 ? grossLoss / losingTrades.length : 0;
        
        const largestWin = winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.pnl)) : 0;
        const largestLoss = losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.pnl)) : 0;
        
        // Calculate Sharpe ratio
        const returns = this.trades.map(t => t.pnlPercent);
        const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);
        const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0; // Annualized
        
        // Calculate maximum drawdown
        let peak = this.config.initialCapital;
        let maxDD = 0;
        let runningCapital = this.config.initialCapital;
        
        for (const trade of this.trades) {
            runningCapital += trade.pnl;
            if (runningCapital > peak) peak = runningCapital;
            const drawdown = ((peak - runningCapital) / peak) * 100;
            if (drawdown > maxDD) maxDD = drawdown;
        }
        
        return {
            totalReturn: Number(totalReturn.toFixed(2)),
            totalTrades: this.trades.length,
            winRate: Number(winRate.toFixed(1)),
            profitFactor: Number(profitFactor.toFixed(2)),
            sharpeRatio: Number(sharpeRatio.toFixed(2)),
            maxDrawdown: Number(maxDD.toFixed(2)),
            avgWin: Number(avgWin.toFixed(2)),
            avgLoss: Number(avgLoss.toFixed(2)),
            largestWin: Number(largestWin.toFixed(2)),
            largestLoss: Number(largestLoss.toFixed(2)),
            winningTrades: winningTrades.length,
            losingTrades: losingTrades.length
        };
    }
    
    /**
     * Reset backtest state
     */
    resetState() {
        this.trades = [];
        this.positions = [];
        this.equity = [];
        this.capital = this.config.initialCapital;
        this.metrics = {};
    }
    
    /**
     * Convert timeframe for Yahoo Finance
     */
    convertTimeframe(timeframe) {
        const mapping = {
            '1m': '1m',
            '5m': '5m',
            '15m': '15m',
            '1h': '1h',
            '4h': '4h',
            '1d': '1d',
            '1w': '1wk',
            '1M': '1mo'
        };
        
        return mapping[timeframe] || '1d';
    }
    
    /**
     * Sleep utility for simulation
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default BacktestEngine;
