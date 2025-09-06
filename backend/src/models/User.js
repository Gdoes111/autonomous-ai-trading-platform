/**
 * User Model - Enterprise Security for Trading Platform
 * Designed to handle hundreds of thousands of users securely
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
    // Personal Information
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
        index: true
    },
    
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters'],
        select: false
    },
    
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        maxlength: [50, 'First name cannot exceed 50 characters']
    },
    
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    
    // Account Status & Security
    isActive: {
        type: Boolean,
        default: true
    },
    
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    
    // Trading Platform Settings
    tradingProfile: {
        riskTolerance: {
            type: String,
            enum: ['low', 'medium', 'high'],
            default: 'medium'
        },
        
        preferredModels: [{
            type: String,
            enum: ['gpt-4', 'gpt-3.5', 'claude-sonnet', 'claude-opus', 'gpt-5']
        }],
        
        maxRiskPerTrade: {
            type: Number,
            default: 2.0,
            min: 0.1,
            max: 10.0
        },
        
        maxPositions: {
            type: Number,
            default: 5,
            min: 1,
            max: 20
        },
        
        autoTrade: {
            type: Boolean,
            default: false
        }
    },
    
    // Subscription & Usage
    subscription: {
        tier: {
            type: String,
            enum: ['free', 'basic', 'premium', 'enterprise'],
            default: 'free'
        },
        
        status: {
            type: String,
            enum: ['active', 'canceled', 'past_due', 'trialing'],
            default: 'active'
        }
    },
    
    // Usage Analytics
    usage: {
        dailyAnalyses: {
            type: Number,
            default: 0
        },
        
        dailyBacktests: {
            type: Number,
            default: 0
        },
        
        monthlyAnalyses: {
            type: Number,
            default: 0
        },
        
        monthlyBacktests: {
            type: Number,
            default: 0
        },
        
        lastResetDate: {
            type: Date,
            default: Date.now
        }
    },
    
    // Security
    passwordChangedAt: {
        type: Date,
        default: Date.now
    },
    
    lastLogin: {
        type: Date
    },
    
    loginAttempts: {
        type: Number,
        default: 0
    },
    
    lockUntil: {
        type: Date
    },
    
    // Audit Trail
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    
    updatedAt: {
        type: Date,
        default: Date.now
    },
    
    lastActiveAt: {
        type: Date,
        default: Date.now,
        index: true
    }
    
}, {
    timestamps: true,
    toJSON: { 
        virtuals: true,
        transform: function(doc, ret) {
            delete ret.password;
            delete ret.__v;
            return ret;
        }
    },
    toObject: { virtuals: true }
});

// Indexes for Performance
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ 'subscription.tier': 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ lastActiveAt: -1 });
userSchema.index({ createdAt: -1 });

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        this.password = await bcrypt.hash(this.password, 12);
        next();
    } catch (error) {
        next(error);
    }
});

// Pre-save middleware to update passwordChangedAt
userSchema.pre('save', function(next) {
    if (!this.isModified('password') || this.isNew) return next();
    
    this.passwordChangedAt = Date.now() - 1000;
    next();
});

// Instance Methods

// Compare password for login
userSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw new Error('Password comparison failed');
    }
};

// Generate JWT token
userSchema.methods.generateAuthToken = function() {
    const payload = {
        id: this._id,
        email: this.email,
        tier: this.subscription.tier,
        iat: Math.floor(Date.now() / 1000)
    };
    
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
};

// Check if password was changed after JWT was issued
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
        return JWTTimestamp < changedTimestamp;
    }
    return false;
};

// Handle failed login attempts
userSchema.methods.incLoginAttempts = function() {
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $unset: { lockUntil: 1 },
            $set: { loginAttempts: 1 }
        });
    }
    
    const updates = { $inc: { loginAttempts: 1 } };
    
    if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
        updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 };
    }
    
    return this.updateOne(updates);
};

// Reset login attempts on successful login
userSchema.methods.resetLoginAttempts = function() {
    return this.updateOne({
        $unset: { loginAttempts: 1, lockUntil: 1 },
        $set: { lastLogin: Date.now() }
    });
};

// Update last active timestamp
userSchema.methods.updateLastActive = function() {
    this.lastActiveAt = Date.now();
    return this.save({ validateBeforeSave: false });
};

// Static Methods

// Find user by email
userSchema.statics.findByEmail = function(email) {
    return this.findOne({ email: email.toLowerCase() });
};

// Get user statistics
userSchema.statics.getStats = async function() {
    const stats = await this.aggregate([
        {
            $group: {
                _id: null,
                totalUsers: { $sum: 1 },
                activeUsers: {
                    $sum: {
                        $cond: [
                            { $gte: ['$lastActiveAt', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)] },
                            1,
                            0
                        ]
                    }
                },
                verifiedUsers: {
                    $sum: {
                        $cond: ['$isEmailVerified', 1, 0]
                    }
                }
            }
        }
    ]);
    
    return stats[0] || { totalUsers: 0, activeUsers: 0, verifiedUsers: 0 };
};

module.exports = mongoose.model('User', userSchema);
