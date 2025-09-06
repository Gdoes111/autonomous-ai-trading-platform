const dotenv = require('dotenv');

dotenv.config();

const config = {
    // Server Configuration
    PORT: process.env.PORT || 3000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    
    // Database Configuration
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://localhost:5432/trading_ai',
    REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
    
    // AI Model API Keys
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    
    // Trading Platform APIs
    DARWINEX_API_KEY: process.env.DARWINEX_API_KEY,
    DARWINEX_SECRET: process.env.DARWINEX_SECRET,
    DARWINEX_DEMO: process.env.DARWINEX_DEMO === 'true',
    
    // JWT Configuration
    JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
    
    // Stripe Configuration
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    
    // Email Configuration
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT || 587,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    
    // Rate Limiting
    RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
    RATE_LIMIT_MAX_REQUESTS: 100,
    
    // AI Credits Configuration
    DEFAULT_MONTHLY_CREDITS: 1000,
    CREDIT_COSTS: {
        'gpt-3.5-turbo': 0.1,
        'gpt-4': 0.5,
        'gpt-5': 1.0,
        'claude-3-sonnet': 0.4,
        'claude-3-opus': 0.8
    },
    
    // Risk Management Defaults
    MAX_POSITION_SIZE: 0.1, // 10% of portfolio
    MAX_DAILY_LOSS: 0.02, // 2% daily loss limit
    DEFAULT_STOP_LOSS: 0.02, // 2% stop loss
    
    // Market Data Configuration
    MARKET_DATA_REFRESH_INTERVAL: 5000, // 5 seconds
    
    // Security
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
    BCRYPT_ROUNDS: 12,
    
    // Features
    FEATURES: {
        ML_MODELS: process.env.ENABLE_ML_MODELS === 'true',
        PAPER_TRADING: process.env.ENABLE_PAPER_TRADING !== 'false',
        SOCIAL_TRADING: process.env.ENABLE_SOCIAL_TRADING === 'true',
        ADVANCED_ANALYTICS: process.env.ENABLE_ADVANCED_ANALYTICS === 'true'
    }
};

// Validate required environment variables
const requiredEnvVars = [
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'DATABASE_URL',
    'JWT_SECRET'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
    console.warn(`Warning: Missing required environment variables: ${missingEnvVars.join(', ')}`);
    console.warn('Some features may not work correctly. Please check your .env file.');
}

module.exports = { config };
module.exports.default = config;
