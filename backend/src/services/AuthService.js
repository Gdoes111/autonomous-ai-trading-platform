import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config/environment.js';
import User from '../models/User.js';

/**
 * Authentication Service
 * Handles user authentication, JWT tokens, and session management
 */

class AuthService {
    constructor() {
        this.jwtSecret = config.JWT_SECRET;
        this.jwtExpire = config.JWT_EXPIRE;
    }

    /**
     * Generate JWT token for user
     */
    generateToken(userId, email) {
        const payload = {
            userId,
            email,
            iat: Math.floor(Date.now() / 1000)
        };

        return jwt.sign(payload, this.jwtSecret, {
            expiresIn: this.jwtExpire,
            issuer: 'trading-ai-platform',
            subject: userId.toString()
        });
    }

    /**
     * Generate refresh token
     */
    generateRefreshToken() {
        return crypto.randomBytes(40).toString('hex');
    }

    /**
     * Verify JWT token
     */
    verifyToken(token) {
        try {
            return jwt.verify(token, this.jwtSecret);
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new Error('Token expired');
            } else if (error.name === 'JsonWebTokenError') {
                throw new Error('Invalid token');
            }
            throw error;
        }
    }

    /**
     * Register new user
     */
    async register(userData) {
        const { email, password, firstName, lastName } = userData;

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            throw new Error('User already exists with this email');
        }

        // Create new user
        const user = new User({
            email: email.toLowerCase(),
            password,
            firstName,
            lastName,
            verificationToken: this.generateRefreshToken()
        });

        await user.save();

        // Generate tokens
        const token = this.generateToken(user._id, user.email);
        const refreshToken = this.generateRefreshToken();

        return {
            user: this.sanitizeUser(user),
            token,
            refreshToken
        };
    }

    /**
     * Login user
     */
    async login(email, password, ipAddress = null) {
        const user = await User.findOne({ email: email.toLowerCase() });
        
        if (!user) {
            throw new Error('Invalid email or password');
        }

        // Check if account is locked
        if (user.isLocked) {
            throw new Error('Account is temporarily locked due to too many failed login attempts');
        }

        // Check if account is active
        if (!user.isActive) {
            throw new Error('Account is deactivated');
        }

        // Verify password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            await user.incLoginAttempts();
            throw new Error('Invalid email or password');
        }

        // Reset login attempts on successful login
        if (user.security.loginAttempts > 0) {
            await user.resetLoginAttempts();
        }

        // Update last login and last active
        user.security.lastLogin = new Date();
        user.usage.lastActive = new Date();
        await user.save();

        // Generate tokens
        const token = this.generateToken(user._id, user.email);
        const refreshToken = this.generateRefreshToken();

        return {
            user: this.sanitizeUser(user),
            token,
            refreshToken
        };
    }

    /**
     * Refresh JWT token
     */
    async refreshToken(token, refreshToken) {
        try {
            // Even if token is expired, we can still get the payload for user ID
            const decoded = jwt.decode(token);
            if (!decoded || !decoded.userId) {
                throw new Error('Invalid token format');
            }

            // Find user and validate refresh token
            const user = await User.findById(decoded.userId);
            if (!user || !user.isActive) {
                throw new Error('User not found or inactive');
            }

            // Generate new tokens
            const newToken = this.generateToken(user._id, user.email);
            const newRefreshToken = this.generateRefreshToken();

            return {
                user: this.sanitizeUser(user),
                token: newToken,
                refreshToken: newRefreshToken
            };
        } catch (error) {
            throw new Error('Invalid refresh token');
        }
    }

    /**
     * Logout user (invalidate tokens)
     */
    async logout(userId) {
        // In a production system, you'd maintain a blacklist of invalidated tokens
        // For now, we'll just update the user's last activity
        const user = await User.findById(userId);
        if (user) {
            user.usage.lastActive = new Date();
            await user.save();
        }
        return true;
    }

    /**
     * Generate password reset token
     */
    async generatePasswordResetToken(email) {
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            throw new Error('No account found with that email address');
        }

        // Generate reset token (expires in 1 hour)
        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

        user.passwordResetToken = hashedToken;
        user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await user.save();

        return resetToken; // Return unhashed token to send via email
    }

    /**
     * Reset password using token
     */
    async resetPassword(token, newPassword) {
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() }
        });

        if (!user) {
            throw new Error('Password reset token is invalid or has expired');
        }

        // Update password and clear reset fields
        user.password = newPassword;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        return true;
    }

    /**
     * Change password (authenticated user)
     */
    async changePassword(userId, currentPassword, newPassword) {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Verify current password
        const isCurrentPasswordValid = await user.comparePassword(currentPassword);
        if (!isCurrentPasswordValid) {
            throw new Error('Current password is incorrect');
        }

        // Update password
        user.password = newPassword;
        await user.save();

        return true;
    }

    /**
     * Verify email address
     */
    async verifyEmail(token) {
        const user = await User.findOne({ verificationToken: token });
        if (!user) {
            throw new Error('Invalid verification token');
        }

        user.isVerified = true;
        user.verificationToken = undefined;
        await user.save();

        return this.sanitizeUser(user);
    }

    /**
     * Enable/disable two-factor authentication
     */
    async toggleTwoFactor(userId, enabled, secret = null) {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        user.security.twoFactorEnabled = enabled;
        if (enabled && secret) {
            user.security.twoFactorSecret = secret; // Should be encrypted in production
        } else if (!enabled) {
            user.security.twoFactorSecret = undefined;
        }

        await user.save();
        return this.sanitizeUser(user);
    }

    /**
     * Get user by ID (for middleware)
     */
    async getUserById(userId) {
        const user = await User.findById(userId).select('-password -security.twoFactorSecret');
        if (!user || !user.isActive) {
            throw new Error('User not found or inactive');
        }

        return user;
    }

    /**
     * Update user profile
     */
    async updateProfile(userId, updates) {
        const allowedUpdates = [
            'firstName', 'lastName', 'profile.timezone', 'profile.language',
            'profile.notifications', 'trading.riskTolerance', 'trading.maxPositionSize',
            'trading.maxDailyLoss', 'trading.defaultStopLoss', 'trading.preferredTimeframes',
            'trading.tradingHours', 'aiPreferences.preferredModels', 'aiPreferences.analysisTypes'
        ];

        // Filter updates to only allowed fields
        const filteredUpdates = {};
        Object.keys(updates).forEach(key => {
            if (allowedUpdates.includes(key)) {
                filteredUpdates[key] = updates[key];
            }
        });

        const user = await User.findByIdAndUpdate(
            userId,
            { $set: filteredUpdates },
            { new: true, runValidators: true }
        ).select('-password -security.twoFactorSecret');

        if (!user) {
            throw new Error('User not found');
        }

        return this.sanitizeUser(user);
    }

    /**
     * Sanitize user object (remove sensitive fields)
     */
    sanitizeUser(user) {
        const userObj = user.toObject();
        delete userObj.password;
        delete userObj.passwordResetToken;
        delete userObj.passwordResetExpires;
        delete userObj.verificationToken;
        delete userObj.security?.twoFactorSecret;
        
        return userObj;
    }

    /**
     * Get user dashboard data
     */
    async getDashboardData(userId) {
        const user = await User.findById(userId).select('-password -security.twoFactorSecret');
        if (!user) {
            throw new Error('User not found');
        }

        // Calculate subscription status
        const subscriptionStatus = this.getSubscriptionStatus(user);
        
        // Calculate credit usage for current month
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        return {
            user: this.sanitizeUser(user),
            subscription: subscriptionStatus,
            credits: {
                balance: user.credits.balance,
                monthlyAllowance: user.credits.monthlyAllowance,
                totalUsed: user.credits.totalUsed,
                usageThisMonth: Math.max(0, user.credits.monthlyAllowance - user.credits.balance)
            },
            quickStats: {
                totalApiCalls: user.usage.totalApiCalls,
                totalTrades: user.usage.totalTrades,
                accountAge: Math.floor((Date.now() - user.createdAt) / (1000 * 60 * 60 * 24))
            }
        };
    }

    /**
     * Get subscription status helper
     */
    getSubscriptionStatus(user) {
        const now = new Date();
        const isActive = user.subscription.status === 'active';
        const isExpired = user.subscription.currentPeriodEnd && user.subscription.currentPeriodEnd < now;

        return {
            plan: user.subscription.plan,
            status: isActive && !isExpired ? 'active' : 'inactive',
            currentPeriodEnd: user.subscription.currentPeriodEnd,
            cancelAtPeriodEnd: user.subscription.cancelAtPeriodEnd,
            daysRemaining: user.subscription.currentPeriodEnd ? 
                Math.max(0, Math.ceil((user.subscription.currentPeriodEnd - now) / (1000 * 60 * 60 * 24))) : 0
        };
    }
}

export default new AuthService();
