/**
 * Error handling middleware
 * Centralizes error handling and provides consistent error responses
 */

/**
 * Global error handler
 */
export const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    // Default error
    let error = {
        success: false,
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    };

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map(val => val.message).join(', ');
        error = {
            success: false,
            message: `Validation Error: ${message}`,
            code: 'VALIDATION_ERROR'
        };
        return res.status(400).json(error);
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        error = {
            success: false,
            message: `${field} already exists`,
            code: 'DUPLICATE_ERROR'
        };
        return res.status(400).json(error);
    }

    // Mongoose ObjectId error
    if (err.name === 'CastError') {
        error = {
            success: false,
            message: 'Invalid ID format',
            code: 'INVALID_ID'
        };
        return res.status(400).json(error);
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        error = {
            success: false,
            message: 'Invalid token',
            code: 'INVALID_TOKEN'
        };
        return res.status(401).json(error);
    }

    if (err.name === 'TokenExpiredError') {
        error = {
            success: false,
            message: 'Token expired',
            code: 'TOKEN_EXPIRED'
        };
        return res.status(401).json(error);
    }

    // Custom application errors
    if (err.statusCode) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
            code: err.code
        });
    }

    // Default to 500 server error
    res.status(500).json(error);
};

/**
 * Handle 404 routes
 */
export const notFound = (req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`,
        code: 'ROUTE_NOT_FOUND'
    });
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors and pass to error handler
 */
export const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * Validation error handler
 */
export const validateRequest = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body);
        
        if (error) {
            const message = error.details.map(detail => detail.message).join(', ');
            return res.status(400).json({
                success: false,
                message: `Validation Error: ${message}`,
                code: 'VALIDATION_ERROR'
            });
        }
        
        next();
    };
};

/**
 * Custom error class for application errors
 */
export class AppError extends Error {
    constructor(message, statusCode, code = null) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * MongoDB connection error handler
 */
export const handleMongoError = (err) => {
    console.error('MongoDB connection error:', err);
    
    if (err.name === 'MongoNetworkError') {
        throw new AppError('Database connection failed', 503, 'DB_CONNECTION_ERROR');
    }
    
    if (err.name === 'MongooseServerSelectionError') {
        throw new AppError('Database server not available', 503, 'DB_SERVER_ERROR');
    }
    
    throw new AppError('Database error', 500, 'DB_ERROR');
};

/**
 * Request logger middleware
 */
export const requestLogger = (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logData = {
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            ...(req.user && { userId: req.user.userId })
        };
        
        console.log(JSON.stringify(logData));
    });
    
    next();
};

/**
 * CORS configuration
 */
export const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
            'http://localhost:3000',
            'http://localhost:3001',
            'https://your-domain.com'
        ];
        
        // Allow requests with no origin (mobile apps, postman, etc.)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

/**
 * Security headers middleware
 */
export const securityHeaders = (req, res, next) => {
    // Prevent XSS attacks
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // HTTPS enforcement in production
    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    
    next();
};

/**
 * Request size limiter
 */
export const sizeLimiter = (req, res, next) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (req.headers['content-length'] && parseInt(req.headers['content-length']) > maxSize) {
        return res.status(413).json({
            success: false,
            message: 'Request too large',
            code: 'REQUEST_TOO_LARGE'
        });
    }
    
    next();
};
