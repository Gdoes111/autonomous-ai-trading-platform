import express from 'express';
import AuthController from '../controllers/AuthController.js';
import { authenticate, authRateLimit, loginRateLimit } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', authRateLimit, asyncHandler(AuthController.register));

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', authRateLimit, asyncHandler(AuthController.login));

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh JWT token
 * @access  Public
 */
router.post('/refresh', asyncHandler(AuthController.refreshToken));

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticate, asyncHandler(AuthController.logout));

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, asyncHandler(AuthController.getProfile));

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authenticate, asyncHandler(AuthController.updateProfile));

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.put('/change-password', authenticate, authRateLimit, asyncHandler(AuthController.changePassword));

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post('/forgot-password', authRateLimit, asyncHandler(AuthController.forgotPassword));

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password', authRateLimit, asyncHandler(AuthController.resetPassword));

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email address
 * @access  Public
 */
router.post('/verify-email', asyncHandler(AuthController.verifyEmail));

/**
 * @route   PUT /api/auth/2fa
 * @desc    Toggle two-factor authentication
 * @access  Private
 */
router.put('/2fa', authenticate, asyncHandler(AuthController.toggle2FA));

/**
 * @route   GET /api/auth/dashboard
 * @desc    Get user dashboard data
 * @access  Private
 */
router.get('/dashboard', authenticate, asyncHandler(AuthController.getDashboard));

export default router;
