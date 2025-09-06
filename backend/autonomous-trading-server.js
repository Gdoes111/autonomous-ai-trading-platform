/**
 * AUTONOMOUS AI TRADING SERVER
 * Main server that runs the autonomous AI trading system
 * Trades automatically for paying subscribers using Reddit sentiment + ML models + AI analysis
 */

const express = require('express');
const cors = require('cors');
const AutonomousAIBrain = require('./src/ai/AutonomousAIBrain.js');
const ProductionTradingEngine = require('./src/engine/ProductionTradingEngine.js');

class AutonomousTradingServer {
    constructor(config = {}) {
        this.config = {
            port: config.port || 3000,
            corsOrigins: config.corsOrigins || ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
            tradingEnabled: config.tradingEnabled !== false, // Default to true
            subscriptionRequired: config.subscriptionRequired !== false, // Default to true
            ...config
        };
        
        // Initialize Express app
        this.app = express();
        this.setupMiddleware();
        this.setupRoutes();
        
        // Initialize AI Brain and Trading Engine
        this.aiBrain = new AutonomousAIBrain({
            tradingInterval: 60000, // 1 minute
            sentimentWeight: 0.3,
            mlWeight: 0.4,
            aiWeight: 0.3,
            confidenceThreshold: 0.7
        });
        
        this.tradingEngine = new ProductionTradingEngine();
        
        // User management
        this.activeSubscribers = new Map(); // userId -> subscription info
        this.tradingStats = {
            totalUsers: 0,
            activeUsers: 0,
            totalTrades: 0,
            totalProfit: 0,
            startTime: new Date()
        };
        
        console.log('🤖 Autonomous AI Trading Server initialized');
    }
    
    /**
     * Setup Express middleware
     */
    setupMiddleware() {
        // CORS configuration
        this.app.use(cors({
            origin: this.config.corsOrigins,
            credentials: true
        }));
        
        // Body parsing
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        
        // Request logging
        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            next();
        });
    }
    
    /**
     * Setup API routes
     */
    setupRoutes() {
        // Health check
        this.app.get('/api/health', (req, res) => {
            res.json({
                status: 'healthy',
                service: 'Autonomous AI Trading Server',
                version: '1.0.0',
                uptime: Date.now() - this.tradingStats.startTime.getTime(),
                trading: {
                    active: this.aiBrain.isActive,
                    users: this.activeSubscribers.size,
                    stats: this.tradingStats
                }
            });
        });
        
        // Authentication endpoints
        this.app.post('/api/auth/login', (req, res) => {
            try {
                const { email, password, rememberMe } = req.body;
                
                // Demo credentials for testing
                if (email === 'demo@autonomousai.com' && password === 'demo123') {
                    const user = {
                        id: 'demo-user-001',
                        email: 'demo@autonomousai.com',
                        firstName: 'Demo',
                        lastName: 'User',
                        subscription: 'premium',
                        aiAccess: true,
                        tradingEnabled: true
                    };
                    
                    const token = 'demo-jwt-token-' + Date.now();
                    
                    console.log(`✅ Demo user logged in: ${email}`);
                    
                    return res.json({
                        success: true,
                        user,
                        token,
                        message: 'Login successful'
                    });
                }
                
                // For non-demo accounts (in production, you'd validate against a database)
                res.status(401).json({
                    success: false,
                    error: 'Invalid credentials. Try demo@autonomousai.com / demo123'
                });
                
            } catch (error) {
                console.error('Login error:', error);
                res.status(500).json({ error: error.message });
            }
        });
        
        this.app.post('/api/auth/register', (req, res) => {
            try {
                const { email, password, firstName, lastName } = req.body;
                
                // Simple registration demo
                const user = {
                    id: 'user-' + Date.now(),
                    email,
                    firstName,
                    lastName,
                    subscription: 'basic',
                    aiAccess: false,
                    tradingEnabled: false
                };
                
                const token = 'jwt-token-' + Date.now();
                
                console.log(`✅ New user registered: ${email}`);
                
                res.json({
                    success: true,
                    user,
                    token,
                    message: 'Registration successful'
                });
                
            } catch (error) {
                console.error('Registration error:', error);
                res.status(500).json({ error: error.message });
            }
        });
        
        this.app.post('/api/auth/logout', (req, res) => {
            res.json({
                success: true,
                message: 'Logged out successfully'
            });
        });
        
        // Start autonomous trading for a user
        this.app.post('/api/trading/start', async (req, res) => {
            try {
                const { userId, subscription, config } = req.body;
                
                if (!userId) {
                    return res.status(400).json({ error: 'User ID required' });
                }
                
                // Verify subscription (in production, this would check payment/subscription status)
                if (this.config.subscriptionRequired && !subscription) {
                    return res.status(403).json({ error: 'Active subscription required' });
                }
                
                // Add user to autonomous trading
                this.aiBrain.addUser(userId, {
                    subscription: subscription || 'premium',
                    maxRisk: config?.maxRisk || 0.02,
                    balance: config?.balance || 10000,
                    allowedSymbols: config?.allowedSymbols || ['EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD', 'ETHUSD'],
                    aiModel: config?.aiModel || 'gpt-4'
                });
                
                this.activeSubscribers.set(userId, {
                    subscription,
                    startTime: new Date(),
                    config
                });
                
                this.tradingStats.totalUsers++;
                this.tradingStats.activeUsers = this.activeSubscribers.size;
                
                console.log(`✅ Started autonomous trading for user ${userId}`);
                
                res.json({
                    success: true,
                    message: 'Autonomous trading started',
                    userId,
                    config: config || {}
                });
                
            } catch (error) {
                console.error('Error starting autonomous trading:', error);
                res.status(500).json({ error: error.message });
            }
        });
        
        // Stop autonomous trading for a user
        this.app.post('/api/trading/stop', async (req, res) => {
            try {
                const { userId } = req.body;
                
                if (!userId) {
                    return res.status(400).json({ error: 'User ID required' });
                }
                
                this.aiBrain.removeUser(userId);
                this.activeSubscribers.delete(userId);
                this.tradingStats.activeUsers = this.activeSubscribers.size;
                
                console.log(`🛑 Stopped autonomous trading for user ${userId}`);
                
                res.json({
                    success: true,
                    message: 'Autonomous trading stopped',
                    userId
                });
                
            } catch (error) {
                console.error('Error stopping autonomous trading:', error);
                res.status(500).json({ error: error.message });
            }
        });
        
        // Get trading status for a user
        this.app.get('/api/trading/status/:userId', (req, res) => {
            const { userId } = req.params;
            
            const userConfig = this.aiBrain.activeUsers.get(userId);
            const subscription = this.activeSubscribers.get(userId);
            
            if (!userConfig) {
                return res.json({
                    isActive: false,
                    message: 'User not in autonomous trading'
                });
            }
            
            res.json({
                isActive: true,
                userId,
                subscription: subscription?.subscription || 'unknown',
                config: userConfig,
                startTime: subscription?.startTime,
                brainStats: this.aiBrain.getStats()
            });
        });
        
        // Get AI brain statistics
        this.app.get('/api/brain/stats', (req, res) => {
            res.json({
                brain: this.aiBrain.getStats(),
                server: this.tradingStats,
                users: {
                    total: this.tradingStats.totalUsers,
                    active: this.activeSubscribers.size,
                    list: Array.from(this.activeSubscribers.keys())
                }
            });
        });
        
        // Force AI analysis for testing
        this.app.post('/api/brain/analyze', async (req, res) => {
            try {
                const { symbol, timeframe } = req.body;
                
                if (!symbol) {
                    return res.status(400).json({ error: 'Symbol required' });
                }
                
                console.log(`🧠 Manual AI analysis requested for ${symbol}`);
                
                const analysis = await this.aiBrain.analyzeSymbolWithAIBrain(symbol);
                
                res.json({
                    success: true,
                    symbol,
                    analysis
                });
                
            } catch (error) {
                console.error('Error in manual analysis:', error);
                res.status(500).json({ error: error.message });
            }
        });
        
        // Get recent trading decisions
        this.app.get('/api/brain/decisions', (req, res) => {
            const stats = this.aiBrain.getStats();
            
            res.json({
                recentAnalysis: stats.lastAnalysis || [],
                totalDecisions: stats.totalTrades || 0,
                successRate: stats.successfulTrades / Math.max(stats.totalTrades, 1) * 100,
                avgConfidence: stats.avgConfidence || 0
            });
        });
        
        // Admin: Start/Stop the entire AI brain
        this.app.post('/api/admin/brain/:action', async (req, res) => {
            try {
                const { action } = req.params;
                
                if (action === 'start') {
                    if (!this.aiBrain.isActive) {
                        await this.aiBrain.start();
                        res.json({ success: true, message: 'AI Brain started', isActive: true });
                    } else {
                        res.json({ success: true, message: 'AI Brain already active', isActive: true });
                    }
                } else if (action === 'stop') {
                    if (this.aiBrain.isActive) {
                        await this.aiBrain.stop();
                        res.json({ success: true, message: 'AI Brain stopped', isActive: false });
                    } else {
                        res.json({ success: true, message: 'AI Brain already inactive', isActive: false });
                    }
                } else {
                    res.status(400).json({ error: 'Invalid action. Use start or stop' });
                }
                
            } catch (error) {
                console.error('Error controlling AI brain:', error);
                res.status(500).json({ error: error.message });
            }
        });
        
        // Error handling
        this.app.use((error, req, res, next) => {
            console.error('Server error:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: error.message
            });
        });
        
        // 404 handler
        this.app.use((req, res) => {
            res.status(404).json({
                error: 'Not found',
                path: req.path
            });
        });
    }
    
    /**
     * Start the autonomous trading server
     */
    async start() {
        try {
            console.log('🚀 Starting Autonomous AI Trading Server...');
            
            // Start the AI brain
            if (this.config.tradingEnabled) {
                await this.aiBrain.start();
                console.log('🧠 AI Brain is now active and making autonomous trading decisions');
            } else {
                console.log('⚠️ Trading disabled - AI Brain in analysis-only mode');
            }
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Start HTTP server
            this.server = this.app.listen(this.config.port, () => {
                console.log(`✅ Autonomous AI Trading Server running on port ${this.config.port}`);
                console.log(`📊 Dashboard: http://localhost:${this.config.port}/api/brain/stats`);
                console.log(`🤖 AI Brain Status: ${this.aiBrain.isActive ? 'ACTIVE' : 'INACTIVE'}`);
                console.log(`💰 Ready to trade automatically for subscribers!`);
            });
            
        } catch (error) {
            console.error('❌ Failed to start Autonomous Trading Server:', error);
            process.exit(1);
        }
    }
    
    /**
     * Setup event listeners for AI brain events
     */
    setupEventListeners() {
        // Listen for trades executed by AI brain
        this.aiBrain.on('trade:executed', (tradeData) => {
            console.log(`💰 AI TRADE EXECUTED: ${tradeData.symbol} ${tradeData.side} for user ${tradeData.userId}`);
            console.log(`📊 Confidence: ${tradeData.confidence}, Position: ${tradeData.positionSize}`);
            
            this.tradingStats.totalTrades++;
            
            // In production, this would save to database and notify user
        });
        
        // Listen for AI brain errors
        this.aiBrain.on('brain:error', (error) => {
            console.error('🧠 AI Brain Error:', error);
            // In production, this would alert administrators
        });
        
        // Listen for trading cycle completions
        this.aiBrain.on('cycle:completed', () => {
            console.log(`🔄 Trading cycle completed - ${this.aiBrain.activeUsers.size} active users`);
        });
        
        // Listen for users being added/removed
        this.aiBrain.on('user:added', (userId, config) => {
            console.log(`👤 User ${userId} added to autonomous trading`);
        });
        
        this.aiBrain.on('user:removed', (userId) => {
            console.log(`👤 User ${userId} removed from autonomous trading`);
        });
    }
    
    /**
     * Stop the server gracefully
     */
    async stop() {
        console.log('🛑 Stopping Autonomous AI Trading Server...');
        
        try {
            // Stop AI brain
            await this.aiBrain.stop();
            
            // Close HTTP server
            if (this.server) {
                this.server.close();
            }
            
            console.log('✅ Autonomous AI Trading Server stopped');
            
        } catch (error) {
            console.error('❌ Error stopping server:', error);
        }
    }
}

// Create and start server if run directly
if (require.main === module) {
    const server = new AutonomousTradingServer({
        port: process.env.PORT || 3000,
        tradingEnabled: process.env.TRADING_ENABLED !== 'false',
        subscriptionRequired: process.env.SUBSCRIPTION_REQUIRED !== 'false'
    });
    
    // Start server
    server.start();
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n👋 Received SIGINT, shutting down gracefully...');
        await server.stop();
        process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
        console.log('\n👋 Received SIGTERM, shutting down gracefully...');
        await server.stop();
        process.exit(0);
    });
}

module.exports = AutonomousTradingServer;
