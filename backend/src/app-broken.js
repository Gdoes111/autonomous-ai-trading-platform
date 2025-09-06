/**
 * PRODUCTION TRADING PLATFORM APPLICATION
 * Enterprise-grade security, real functionality, production-ready
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import winston from 'winston';
import { fileURLToPath } from 'url';
import path from 'path';

// Import production routes and middleware
import authRoutes from './routes/auth.js';
import tradingRoutes from './routes/trading-production.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure Winston logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'trading-platform' },
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

/**
 * Production Trading AI Platform
 */
class TradingAIApp {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3001;
        this.mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/trading-platform';
        
        this.initializeMiddleware();
        this.initializeRoutes();
        this.initializeErrorHandling();
    }

    /**
     * Initialize security and middleware stack
     */
    initializeMiddleware() {
        // Trust proxy for rate limiting behind load balancers
        this.app.set('trust proxy', 1);

        // Security middleware with production-grade configuration
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                    fontSrc: ["'self'", "https://fonts.gstatic.com"],
                    imgSrc: ["'self'", "data:", "https:"],
                    scriptSrc: ["'self'"],
                    connectSrc: ["'self'", "https://api.openai.com", "https://query2.finance.yahoo.com"]
                }
            },
            hsts: {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true
            }
        }));

        // Compression middleware
        this.app.use(compression());

        // CORS configuration for production
        const corsOptions = {
            origin: function (origin, callback) {
                const allowedOrigins = [
                    'http://localhost:3000',
                    'http://localhost:3001',
                    process.env.FRONTEND_URL,
                    'https://your-production-domain.com'
                ].filter(Boolean);
                
                if (!origin || allowedOrigins.includes(origin)) {
                    callback(null, true);
                } else {
                    logger.warn(`CORS blocked request from origin: ${origin}`);
                    callback(new Error('Not allowed by CORS'));
                }
            },
            credentials: true,
            optionsSuccessStatus: 200
        };

        this.app.use(cors(corsOptions));

        // Rate limiting with different tiers
        const globalLimiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100, // Limit each IP to 100 requests per windowMs
            message: {
                error: 'Too many requests from this IP, please try again later',
                retryAfter: '15 minutes'
            },
            standardHeaders: true,
            legacyHeaders: false,
            handler: (req, res) => {
                logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
                res.status(429).json({
                    error: 'Too many requests from this IP, please try again later',
                    retryAfter: '15 minutes'
                });
            }
        });

        this.app.use(globalLimiter);

        // Authentication rate limiting
        this.authLimiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 10, // Limit each IP to 10 auth requests per windowMs
            message: {
                error: 'Too many authentication attempts, please try again later',
                retryAfter: '15 minutes'
            },
            skipSuccessfulRequests: true
        });

        // Request logging
        this.app.use(morgan('combined', {
            stream: {
                write: (message) => logger.info(message.trim())
            }
        }));

        // Body parsing middleware with security
        this.app.use(express.json({ 
            limit: '10mb',
            verify: (req, res, buf) => {
                try {
                    JSON.parse(buf);
                } catch (e) {
                    res.status(400).json({ error: 'Invalid JSON' });
                    throw new Error('Invalid JSON');
                }
            }
        }));

        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Request ID for tracking
        this.app.use((req, res, next) => {
            req.requestId = Math.random().toString(36).substr(2, 9);
            res.setHeader('X-Request-ID', req.requestId);
            next();
        });
    }

    /**
     * Initialize API routes
     */
    initializeRoutes() {
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.status(200).json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                version: process.env.npm_package_version || '1.0.0',
                environment: process.env.NODE_ENV || 'development'
            });
        });

        // API information endpoint
        this.app.get('/api', (req, res) => {
            res.json({
                success: true,
                message: 'Production Trading AI Platform API',
                version: '2.0.0',
                features: [
                    'Real-time market data via Yahoo Finance',
                    'AI analysis with OpenAI GPT-4',
                    'Secure JWT authentication with refresh tokens',
                    'Production-grade trading engine',
                    'Risk management and position tracking',
                    'Enterprise security with rate limiting'
                ],
                endpoints: {
                    auth: '/api/auth',
                    trading: '/api/trading'
                }
            });
        });

        // API routes with rate limiting
        this.app.use('/api/auth', this.authLimiter, authRoutes);
        this.app.use('/api/trading', tradingRoutes);
    }

    /**
     * Initialize error handling
     */
    initializeErrorHandling() {
        // 404 handler
        this.app.use('*', (req, res) => {
            res.status(404).json({
                success: false,
                error: 'Route not found',
                path: req.originalUrl,
                method: req.method
            });
        });

        // Global error handler
        this.app.use((err, req, res, next) => {
            logger.error('Unhandled error:', {
                error: err.message,
                stack: err.stack,
                url: req.url,
                method: req.method,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                requestId: req.requestId
            });

            // Don't leak error details in production
            const isDevelopment = process.env.NODE_ENV === 'development';
            
            res.status(err.status || 500).json({
                success: false,
                error: isDevelopment ? err.message : 'Internal server error',
                requestId: req.requestId,
                ...(isDevelopment && { stack: err.stack })
            });
        });
    }

    /**
     * Connect to MongoDB with retry logic
     */
    async connectDatabase(retries = 5) {
        try {
            const conn = await mongoose.connect(this.mongoUri, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                maxPoolSize: 10,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
                bufferMaxEntries: 0
            });

            logger.info(`✅ MongoDB Connected: ${conn.connection.host}`);

            // Handle connection events
            mongoose.connection.on('error', (err) => {
                logger.error('MongoDB connection error:', err);
            });

            mongoose.connection.on('disconnected', () => {
                logger.warn('⚠️ MongoDB disconnected');
            });

            mongoose.connection.on('reconnected', () => {
                logger.info('🔄 MongoDB reconnected');
            });

            return conn;

        } catch (error) {
            logger.error(`❌ MongoDB connection failed: ${error.message}`);
            
            if (retries > 0) {
                logger.info(`🔄 Retrying MongoDB connection... (${retries} attempts remaining)`);
                await new Promise(resolve => setTimeout(resolve, 5000));
                return this.connectDatabase(retries - 1);
            } else {
                logger.error('💥 MongoDB connection failed after all retry attempts');
                throw error;
            }
        }
    }

    /**
     * Start the server
     */
    async start() {
        try {
            // Connect to database
            await this.connectDatabase();
            
            // Start HTTP server
            const server = this.app.listen(this.port, () => {
                logger.info(`🚀 Production Trading Platform Server started successfully!`);
                logger.info(`📡 Server running on port ${this.port}`);
                logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
                logger.info(`🔐 Security: Enhanced with Helmet, CORS, Rate Limiting`);
                logger.info(`📈 Trading Engine: Production-ready with real market data`);
                logger.info(`🤖 AI Analysis: OpenAI GPT-4 Integration Active`);
                logger.info(`💾 Database: MongoDB Connected with connection pooling`);
                logger.info(`🏥 Health Check: Available at /health`);
                logger.info(`📋 API Info: Available at /api`);
                logger.info('');
                logger.info('🎯 Ready to handle real trading operations!');
            });

            // Graceful shutdown handling
            const gracefulShutdown = (signal) => {
                logger.info(`⚠️ Received ${signal}. Starting graceful shutdown...`);
                
                server.close(() => {
                    logger.info('🔒 HTTP server closed');
                    
                    mongoose.connection.close(false, () => {
                        logger.info('🔌 MongoDB connection closed');
                        logger.info('✅ Graceful shutdown completed');
                        process.exit(0);
                    });
                });

                // Force close after 30 seconds
                setTimeout(() => {
                    logger.error('⏰ Could not close connections in time, forcefully shutting down');
                    process.exit(1);
                }, 30000);
            };

            process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
            process.on('SIGINT', () => gracefulShutdown('SIGINT'));

            return server;
            
        } catch (error) {
            logger.error('💥 Failed to start server:', error);
            throw error;
        }
    }
}

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    logger.error('💥 Uncaught Exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

    /**
     * Initialize API routes
     */
    initializeRoutes() {
        // API routes
        this.app.use('/api/auth', authRoutes);
        this.app.use('/api/trading', tradingRoutes);
        this.app.use('/api/subscription', subscriptionRoutes);
        this.app.use('/api/backtest', backtestRoutes);
        this.app.use('/api/dashboard', dashboardRoutes);

        // Root endpoint
        this.app.get('/', (req, res) => {
            res.json({
                success: true,
                message: 'Welcome to Trading AI Platform',
                api: '/api',
                health: '/health',
                documentation: 'https://docs.tradingai.com'
            });
        });
    }

    /**
     * Initialize error handling
     */
    initializeErrorHandling() {
        // 404 handler
        this.app.use(notFound);

        // Global error handler
        this.app.use(errorHandler);
    }

    /**
     * Connect to MongoDB
     */
    async connectToDatabase() {
        try {
            let mongoUri = this.mongoUri;

            // Use in-memory MongoDB for development if no URI provided
            if (!mongoUri || mongoUri.includes('undefined') || config.NODE_ENV === 'development') {
                console.log('🔧 Starting in-memory MongoDB for development...');
                this.mongod = await MongoMemoryServer.create();
                mongoUri = this.mongod.getUri();
                console.log('✅ In-memory MongoDB started');
            }

            await mongoose.connect(mongoUri, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            });

            console.log('✅ Connected to MongoDB');
            console.log(`📍 Database: ${mongoUri.includes('memory') ? 'In-Memory' : 'External'}`);
            
            // Handle connection events
            mongoose.connection.on('error', (err) => {
                console.error('❌ MongoDB connection error:', err);
            });

            mongoose.connection.on('disconnected', () => {
                console.log('⚠️ MongoDB disconnected');
            });

            mongoose.connection.on('reconnected', () => {
                console.log('✅ MongoDB reconnected');
            });

        } catch (error) {
            console.error('❌ MongoDB connection failed:', error);
            console.log('🔄 Attempting in-memory fallback...');
            
            try {
                this.mongod = await MongoMemoryServer.create();
                const fallbackUri = this.mongod.getUri();
                await mongoose.connect(fallbackUri);
                console.log('✅ Connected to fallback in-memory MongoDB');
            } catch (fallbackError) {
                console.error('❌ Fallback connection failed:', fallbackError);
                process.exit(1);
            }
        }
    }

    /**
     * Start the server
     */
    async start() {
        try {
            // Connect to database
            await this.connectToDatabase();

            // Start server
            this.server = this.app.listen(this.port, () => {
                console.log(`
🚀 Trading AI Platform Server Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📡 Server:     http://localhost:${this.port}
🗄️  Database:   Connected to MongoDB
🛡️  Security:   Enabled (Helmet, CORS)
🔧 Environment: ${config.NODE_ENV}
📚 API Docs:    http://localhost:${this.port}/api
💊 Health:     http://localhost:${this.port}/health
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Available Endpoints:
   • Authentication:  /api/auth
   • Trading:         /api/trading  
   • Subscription:    /api/subscription
   • Backtest:        /api/backtest
   • Dashboard:       /api/dashboard

🎯 Ready to serve trading AI requests!
                `);
            });

            // Graceful shutdown handlers
            this.setupGracefulShutdown();

        } catch (error) {
            console.error('❌ Failed to start server:', error);
            process.exit(1);
        }
    }

    /**
     * Setup graceful shutdown
     */
    setupGracefulShutdown() {
        const gracefulShutdown = async (signal) => {
            console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

            // Close server
            if (this.server) {
                this.server.close(() => {
                    console.log('✅ HTTP server closed');
                });
            }

            // Close database connection
            try {
                await mongoose.connection.close();
                console.log('✅ Database connection closed');
                
                // Stop in-memory MongoDB if running
                if (this.mongod) {
                    await this.mongod.stop();
                    console.log('✅ In-memory MongoDB stopped');
                }
            } catch (error) {
                console.error('❌ Error closing database:', error);
            }

            console.log('👋 Graceful shutdown completed');
            process.exit(0);
        };

        // Listen for termination signals
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            console.error('❌ Uncaught Exception:', error);
            gracefulShutdown('UNCAUGHT_EXCEPTION');
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
            gracefulShutdown('UNHANDLED_REJECTION');
        });
    }

    /**
     * Get Express app instance
     */
    getApp() {
        return this.app;
    }
}

// Create and start the application
const tradingAI = new TradingAIApp();

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    tradingAI.start();
}

export default tradingAI;
