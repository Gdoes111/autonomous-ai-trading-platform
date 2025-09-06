/**
 * SECURE Authentication & Authorization Middleware
 * Production-ready with proper security measures
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';

// JWT Security Configuration
const JWT_SECRET = process.env.JWT_SECRET || (() => {
    throw new Error('JWT_SECRET environment variable is required for security');
})();

const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || (() => {
    throw new Error('JWT_REFRESH_SECRET environment variable is required for security');
})();

// Rate limiting for authentication endpoints
export const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: {
        error: 'Too many authentication attempts, please try again later',
        retryAfter: 15 * 60 // 15 minutes in seconds
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// More restrictive rate limiting for failed login attempts
export const loginRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // Limit each IP to 3 login attempts per windowMs
    skipSuccessfulRequests: true,
    message: {
        error: 'Too many failed login attempts, please try again later',
        retryAfter: 15 * 60
    }
});

// Input validation schemas
export const registerValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    body('firstName')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('First name must be between 2 and 50 characters'),
    body('lastName')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Last name must be between 2 and 50 characters')
];

export const loginValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    body('password')
        .notEmpty()
        .withMessage('Password is required')
];

// Secure password hashing
export const hashPassword = async (password) => {
    const saltRounds = 12; // High cost factor for security
    return await bcrypt.hash(password, saltRounds);
};

export const verifyPassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
};

// JWT Token generation with proper expiration
export const generateTokens = (userId, userRole = 'user') => {
    const payload = { 
        userId, 
        role: userRole,
        iat: Math.floor(Date.now() / 1000),
        aud: 'trading-ai-platform',
        iss: 'trading-ai-backend'
    };
    
    const accessToken = jwt.sign(payload, JWT_SECRET, { 
        expiresIn: '15m',
        algorithm: 'HS256'
    });
    
    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { 
        expiresIn: '7d',
        algorithm: 'HS256'
    });
    
    return { accessToken, refreshToken };
};

// Secure token verification middleware
export const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
        
        if (!token) {
            return res.status(401).json({ 
                error: 'Access token required',
                code: 'TOKEN_MISSING'
            });
        }
        
        const decoded = jwt.verify(token, JWT_SECRET, {
            algorithms: ['HS256'],
            audience: 'trading-ai-platform',
            issuer: 'trading-ai-backend'
        });
        
        // Verify user still exists and is active
        const user = await User.findById(decoded.userId).select('-password');
        if (!user || !user.isActive) {
            return res.status(401).json({ 
                error: 'User account not found or inactive',
                code: 'USER_INVALID'
            });
        }
        
        // Check if token was issued after last password change
        if (user.passwordChangedAt && decoded.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)) {
            return res.status(401).json({
                error: 'Token expired due to password change',
                code: 'TOKEN_EXPIRED_PASSWORD_CHANGE'
            });
        }
        
        req.user = user;
        req.tokenIat = decoded.iat;
        next();
        
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                error: 'Invalid access token',
                code: 'TOKEN_INVALID'
            });
        } else if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                error: 'Access token expired',
                code: 'TOKEN_EXPIRED'
            });
        } else {
            console.error('Authentication error:', error);
            return res.status(500).json({ 
                error: 'Authentication service error',
                code: 'AUTH_SERVICE_ERROR'
            });
        }
    }
};

// Legacy authenticate function for backward compatibility
export const authenticate = async (req, res, next) => {
    return authenticateToken(req, res, next);
};

// Role-based authorization
export const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
        }
        
        const userRoles = Array.isArray(req.user.roles) ? req.user.roles : [req.user.role || 'user'];
        const hasRequiredRole = roles.some(role => userRoles.includes(role));
        
        if (!hasRequiredRole) {
            return res.status(403).json({ 
                error: 'Insufficient permissions',
                code: 'INSUFFICIENT_PERMISSIONS',
                required: roles,
                current: userRoles
            });
        }
        
        next();
    };
};

// Subscription tier authorization
export const requireSubscription = (requiredTier = 'free') => {
    const tierHierarchy = { free: 0, premium: 1, enterprise: 2 };
    
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
        }
        
        const userTier = req.user.subscriptionTier || 'free';
        const userTierLevel = tierHierarchy[userTier] || 0;
        const requiredTierLevel = tierHierarchy[requiredTier] || 0;
        
        if (userTierLevel < requiredTierLevel) {
            return res.status(403).json({ 
                error: `${requiredTier} subscription required`,
                code: 'SUBSCRIPTION_UPGRADE_REQUIRED',
                currentTier: userTier,
                requiredTier: requiredTier
            });
        }
        
        next();
    };
};

// Input validation error handler
export const validateInput = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: errors.array().map(err => ({
                field: err.path,
                message: err.msg,
                value: err.value
            }))
        });
    }
    next();
};

// Refresh token handler
export const refreshAccessToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        
        if (!refreshToken) {
            return res.status(401).json({
                error: 'Refresh token required',
                code: 'REFRESH_TOKEN_MISSING'
            });
        }
        
        const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET, {
            algorithms: ['HS256'],
            audience: 'trading-ai-platform',
            issuer: 'trading-ai-backend'
        });
        
        // Verify user still exists and is active
        const user = await User.findById(decoded.userId).select('-password');
        if (!user || !user.isActive) {
            return res.status(401).json({
                error: 'User account not found or inactive',
                code: 'USER_INVALID'
            });
        }
        
        // Generate new tokens
        const tokens = generateTokens(user._id, user.role);
        
        res.json({
            success: true,
            ...tokens,
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                subscriptionTier: user.subscriptionTier
            }
        });
        
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Invalid or expired refresh token',
                code: 'REFRESH_TOKEN_INVALID'
            });
        }
        
        console.error('Token refresh error:', error);
        res.status(500).json({
            error: 'Token refresh service error',
            code: 'REFRESH_SERVICE_ERROR'
        });
    }
};

export default {
    authenticate,
    authRateLimit,
    loginRateLimit,
    registerValidation,
    loginValidation,
    hashPassword,
    verifyPassword,
    generateTokens,
    authenticateToken,
    requireRole,
    requireSubscription,
    validateInput,
    refreshAccessToken
};
