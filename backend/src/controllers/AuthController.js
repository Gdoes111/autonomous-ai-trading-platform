import AuthService from '../services/AuthService.js';

/**
 * Authentication Controller
 * Handles all authentication-related HTTP requests
 */

class AuthController {
    /**
     * Register new user
     * POST /api/auth/register
     */
    async register(req, res) {
        try {
            const { email, password, firstName, lastName } = req.body;

            // Basic validation
            if (!email || !password || !firstName || !lastName) {
                return res.status(400).json({
                    success: false,
                    message: 'All fields are required'
                });
            }

            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid email format'
                });
            }

            // Password validation
            if (password.length < 8) {
                return res.status(400).json({
                    success: false,
                    message: 'Password must be at least 8 characters long'
                });
            }

            const result = await AuthService.register({
                email,
                password,
                firstName,
                lastName
            });

            // Set HTTP-only cookie for refresh token
            res.cookie('refreshToken', result.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                data: {
                    user: result.user,
                    token: result.token
                }
            });

        } catch (error) {
            console.error('Registration error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Login user
     * POST /api/auth/login
     */
    async login(req, res) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Email and password are required'
                });
            }

            const ipAddress = req.ip || req.connection.remoteAddress;
            const result = await AuthService.login(email, password, ipAddress);

            // Set HTTP-only cookie for refresh token
            res.cookie('refreshToken', result.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            res.json({
                success: true,
                message: 'Login successful',
                data: {
                    user: result.user,
                    token: result.token
                }
            });

        } catch (error) {
            console.error('Login error:', error);
            res.status(401).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Refresh JWT token
     * POST /api/auth/refresh
     */
    async refreshToken(req, res) {
        try {
            const { refreshToken } = req.cookies;
            const { token } = req.body;

            if (!refreshToken || !token) {
                return res.status(401).json({
                    success: false,
                    message: 'Refresh token and access token are required'
                });
            }

            const result = await AuthService.refreshToken(token, refreshToken);

            // Set new refresh token cookie
            res.cookie('refreshToken', result.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            res.json({
                success: true,
                data: {
                    user: result.user,
                    token: result.token
                }
            });

        } catch (error) {
            console.error('Token refresh error:', error);
            res.status(401).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Logout user
     * POST /api/auth/logout
     */
    async logout(req, res) {
        try {
            const userId = req.user?.userId;

            if (userId) {
                await AuthService.logout(userId);
            }

            // Clear refresh token cookie
            res.clearCookie('refreshToken');

            res.json({
                success: true,
                message: 'Logout successful'
            });

        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({
                success: false,
                message: 'Logout failed'
            });
        }
    }

    /**
     * Get current user profile
     * GET /api/auth/me
     */
    async getProfile(req, res) {
        try {
            const userId = req.user.userId;
            const dashboardData = await AuthService.getDashboardData(userId);

            res.json({
                success: true,
                data: dashboardData
            });

        } catch (error) {
            console.error('Get profile error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Update user profile
     * PUT /api/auth/profile
     */
    async updateProfile(req, res) {
        try {
            const userId = req.user.userId;
            const updates = req.body;

            const updatedUser = await AuthService.updateProfile(userId, updates);

            res.json({
                success: true,
                message: 'Profile updated successfully',
                data: updatedUser
            });

        } catch (error) {
            console.error('Update profile error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Change password
     * PUT /api/auth/change-password
     */
    async changePassword(req, res) {
        try {
            const userId = req.user.userId;
            const { currentPassword, newPassword } = req.body;

            if (!currentPassword || !newPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Current password and new password are required'
                });
            }

            if (newPassword.length < 8) {
                return res.status(400).json({
                    success: false,
                    message: 'New password must be at least 8 characters long'
                });
            }

            await AuthService.changePassword(userId, currentPassword, newPassword);

            res.json({
                success: true,
                message: 'Password changed successfully'
            });

        } catch (error) {
            console.error('Change password error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Request password reset
     * POST /api/auth/forgot-password
     */
    async forgotPassword(req, res) {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({
                    success: false,
                    message: 'Email is required'
                });
            }

            const resetToken = await AuthService.generatePasswordResetToken(email);

            // In production, send this token via email
            // For now, we'll return it in the response (development only)
            res.json({
                success: true,
                message: 'Password reset token generated',
                data: {
                    resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
                }
            });

        } catch (error) {
            console.error('Forgot password error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Reset password with token
     * POST /api/auth/reset-password
     */
    async resetPassword(req, res) {
        try {
            const { token, newPassword } = req.body;

            if (!token || !newPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Reset token and new password are required'
                });
            }

            if (newPassword.length < 8) {
                return res.status(400).json({
                    success: false,
                    message: 'New password must be at least 8 characters long'
                });
            }

            await AuthService.resetPassword(token, newPassword);

            res.json({
                success: true,
                message: 'Password reset successfully'
            });

        } catch (error) {
            console.error('Reset password error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Verify email address
     * POST /api/auth/verify-email
     */
    async verifyEmail(req, res) {
        try {
            const { token } = req.body;

            if (!token) {
                return res.status(400).json({
                    success: false,
                    message: 'Verification token is required'
                });
            }

            const user = await AuthService.verifyEmail(token);

            res.json({
                success: true,
                message: 'Email verified successfully',
                data: user
            });

        } catch (error) {
            console.error('Email verification error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Toggle two-factor authentication
     * PUT /api/auth/2fa
     */
    async toggle2FA(req, res) {
        try {
            const userId = req.user.userId;
            const { enabled, secret } = req.body;

            const user = await AuthService.toggleTwoFactor(userId, enabled, secret);

            res.json({
                success: true,
                message: `Two-factor authentication ${enabled ? 'enabled' : 'disabled'}`,
                data: user
            });

        } catch (error) {
            console.error('2FA toggle error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Get user dashboard data
     * GET /api/auth/dashboard
     */
    async getDashboard(req, res) {
        try {
            const userId = req.user.userId;
            const dashboardData = await AuthService.getDashboardData(userId);

            res.json({
                success: true,
                data: dashboardData
            });

        } catch (error) {
            console.error('Dashboard error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}

export default new AuthController();
