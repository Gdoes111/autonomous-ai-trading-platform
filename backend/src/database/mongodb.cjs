/**
 * MongoDB Database Configuration
 * Enterprise-grade setup for trading platform with hundreds of thousands of users
 * Features: Security, Performance, Scalability, High Availability
 */

const mongoose = require('mongoose');
const winston = require('winston');

// Create logger for MongoDB operations
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'mongodb' },
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

class MongoDBManager {
    constructor() {
        this.isConnected = false;
        this.connectionAttempts = 0;
        this.maxRetries = 5;
        this.retryDelay = 5000; // 5 seconds
    }

    /**
     * Connect to MongoDB with enterprise-grade configuration
     */
    async connect() {
        try {
            const mongoUri = this.buildConnectionString();
            
            // Enterprise MongoDB Configuration
            const options = {
                // Connection Pool Settings (for high traffic)
                maxPoolSize: 50,          // Maximum 50 connections
                minPoolSize: 5,           // Keep 5 connections always open
                maxIdleTimeMS: 30000,     // Close connections after 30s idle
                serverSelectionTimeoutMS: 5000, // Fail fast if no server
                
                // High Availability & Reliability
                retryWrites: true,        // Retry failed writes
                retryReads: true,         // Retry failed reads
                w: 'majority',            // Write concern for data safety
                readPreference: 'primaryPreferred',
                
                // Security Settings
                authSource: 'admin',      // Authentication database
                ssl: process.env.NODE_ENV === 'production', // SSL in production
                
                // Performance Optimizations
                bufferMaxEntries: 0,      // Disable mongoose buffering
                bufferCommands: false,    // Disable command buffering
                
                // Timeouts
                connectTimeoutMS: 10000,  // 10s connection timeout
                socketTimeoutMS: 45000,   // 45s socket timeout
                
                // Application Name (for monitoring)
                appName: 'TradingAI-Platform'
            };

            logger.info('🔌 Connecting to MongoDB...');
            
            await mongoose.connect(mongoUri, options);
            
            this.isConnected = true;
            this.connectionAttempts = 0;
            
            logger.info('🎉 MongoDB connected successfully');
            logger.info(`📊 Database: ${mongoose.connection.db.databaseName}`);
            logger.info(`🏠 Host: ${mongoose.connection.host}:${mongoose.connection.port}`);
            
            // Set up connection event listeners
            this.setupEventListeners();
            
            return true;
            
        } catch (error) {
            this.connectionAttempts++;
            logger.error(`❌ MongoDB connection failed (attempt ${this.connectionAttempts}):`, error.message);
            
            if (this.connectionAttempts < this.maxRetries) {
                logger.info(`🔄 Retrying connection in ${this.retryDelay/1000}s...`);
                setTimeout(() => this.connect(), this.retryDelay);
            } else {
                logger.error('💥 Max connection retries exceeded. Application will run without database.');
                throw error;
            }
            
            return false;
        }
    }

    /**
     * Build secure MongoDB connection string
     */
    buildConnectionString() {
        const {
            MONGODB_URI,
            MONGODB_HOST = 'localhost',
            MONGODB_PORT = '27017',
            MONGODB_DATABASE = 'trading_ai_platform',
            MONGODB_USERNAME,
            MONGODB_PASSWORD
        } = process.env;

        // Use full URI if provided (for MongoDB Atlas/Cloud)
        if (MONGODB_URI) {
            return MONGODB_URI;
        }

        // Build local connection string
        let connectionString = 'mongodb://';
        
        if (MONGODB_USERNAME && MONGODB_PASSWORD) {
            connectionString += `${encodeURIComponent(MONGODB_USERNAME)}:${encodeURIComponent(MONGODB_PASSWORD)}@`;
        }
        
        connectionString += `${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DATABASE}`;
        
        // Add replica set if specified (for high availability)
        if (process.env.MONGODB_REPLICA_SET) {
            connectionString += `?replicaSet=${process.env.MONGODB_REPLICA_SET}`;
        }

        return connectionString;
    }

    /**
     * Set up MongoDB event listeners for monitoring
     */
    setupEventListeners() {
        const db = mongoose.connection;

        db.on('error', (error) => {
            logger.error('💥 MongoDB error:', error);
        });

        db.on('disconnected', () => {
            logger.warn('⚠️ MongoDB disconnected');
            this.isConnected = false;
        });

        db.on('reconnected', () => {
            logger.info('🔄 MongoDB reconnected');
            this.isConnected = true;
        });

        // Monitor connection pool events (for performance tuning)
        db.on('connectionPoolCreated', () => {
            logger.info('🏊 MongoDB connection pool created');
        });

        db.on('connectionPoolClosed', () => {
            logger.info('🏊 MongoDB connection pool closed');
        });
    }

    /**
     * Graceful shutdown
     */
    async disconnect() {
        try {
            if (this.isConnected) {
                await mongoose.connection.close();
                logger.info('👋 MongoDB disconnected gracefully');
            }
        } catch (error) {
            logger.error('❌ Error during MongoDB disconnect:', error);
        }
    }

    /**
     * Get connection status
     */
    getStatus() {
        return {
            connected: this.isConnected,
            readyState: mongoose.connection.readyState,
            host: mongoose.connection.host,
            port: mongoose.connection.port,
            database: mongoose.connection.db?.databaseName,
            collections: mongoose.connection.db?.collections?.length || 0
        };
    }

    /**
     * Create database indexes for performance (run once)
     */
    async createIndexes() {
        try {
            logger.info('📊 Creating database indexes for optimal performance...');
            
            // User indexes
            await mongoose.connection.db.collection('users').createIndex(
                { email: 1 }, 
                { unique: true, background: true }
            );
            
            // Trading history indexes
            await mongoose.connection.db.collection('trades').createIndex(
                { userId: 1, timestamp: -1 }, 
                { background: true }
            );
            
            await mongoose.connection.db.collection('trades').createIndex(
                { symbol: 1, timestamp: -1 }, 
                { background: true }
            );
            
            // AI analysis indexes
            await mongoose.connection.db.collection('aianalyses').createIndex(
                { symbol: 1, timestamp: -1 }, 
                { background: true }
            );
            
            // Performance tracking indexes
            await mongoose.connection.db.collection('portfolios').createIndex(
                { userId: 1 }, 
                { unique: true, background: true }
            );
            
            logger.info('✅ Database indexes created successfully');
            
        } catch (error) {
            logger.error('❌ Error creating indexes:', error);
        }
    }

    /**
     * Health check for monitoring
     */
    async healthCheck() {
        try {
            if (!this.isConnected) {
                return { status: 'disconnected', error: 'Not connected to database' };
            }

            // Ping database
            await mongoose.connection.db.admin().ping();
            
            const stats = await mongoose.connection.db.stats();
            
            return {
                status: 'healthy',
                database: mongoose.connection.db.databaseName,
                collections: stats.collections,
                dataSize: `${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`,
                indexSize: `${(stats.indexSize / 1024 / 1024).toFixed(2)} MB`,
                avgObjSize: `${stats.avgObjSize} bytes`
            };
            
        } catch (error) {
            return { 
                status: 'error', 
                error: error.message 
            };
        }
    }
}

// Export singleton instance
module.exports = new MongoDBManager();
