import express from 'express';
import rateLimit from 'express-rate-limit';
import SubscriptionController from '../controllers/SubscriptionController.js';
import { 
    authenticate, 
    requireSubscription,
    authRateLimit 
} from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';

const router = express.Router();

// Apply rate limiting to subscription routes
const subscriptionRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 requests per window
    message: 'Too many subscription requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * @route   GET /api/subscription/plans
 * @desc    Get all available subscription plans
 * @access  Public
 */
router.get('/plans',
    asyncHandler(SubscriptionController.getPlans)
);

/**
 * @route   GET /api/subscription/plans/:planId
 * @desc    Get specific plan details
 * @access  Public
 */
router.get('/plans/:planId',
    asyncHandler(SubscriptionController.getPlan)
);

/**
 * @route   POST /api/subscription/subscribe
 * @desc    Subscribe to a plan
 * @access  Private
 */
router.post('/subscribe',
    authenticate,
    subscriptionRateLimit,
    asyncHandler(SubscriptionController.subscribe)
);

/**
 * @route   PUT /api/subscription/change-plan
 * @desc    Change subscription plan
 * @access  Private
 */
router.put('/change-plan',
    authenticate,
    requireSubscription('basic'),
    subscriptionRateLimit,
    asyncHandler(SubscriptionController.changePlan)
);

/**
 * @route   POST /api/subscription/cancel
 * @desc    Cancel subscription
 * @access  Private
 */
router.post('/cancel',
    authenticate,
    requireSubscription('basic'),
    subscriptionRateLimit,
    asyncHandler(SubscriptionController.cancelSubscription)
);

/**
 * @route   POST /api/subscription/reactivate
 * @desc    Reactivate canceled subscription
 * @access  Private
 */
router.post('/reactivate',
    authenticate,
    subscriptionRateLimit,
    asyncHandler(SubscriptionController.reactivateSubscription)
);

/**
 * @route   POST /api/subscription/credits/purchase
 * @desc    Purchase additional credits
 * @access  Private
 */
router.post('/credits/purchase',
    authenticate,
    subscriptionRateLimit,
    asyncHandler(SubscriptionController.purchaseCredits)
);

/**
 * @route   GET /api/subscription/analytics
 * @desc    Get subscription analytics
 * @access  Private
 */
router.get('/analytics',
    authenticate,
    asyncHandler(SubscriptionController.getAnalytics)
);

/**
 * @route   GET /api/subscription/billing-history
 * @desc    Get billing history
 * @access  Private
 */
router.get('/billing-history',
    authenticate,
    asyncHandler(SubscriptionController.getBillingHistory)
);

/**
 * @route   GET /api/subscription/limits/:action
 * @desc    Check plan limits for specific action
 * @access  Private
 */
router.get('/limits/:action',
    authenticate,
    asyncHandler(SubscriptionController.checkLimits)
);

/**
 * @route   GET /api/subscription/credit-packages
 * @desc    Get available credit packages
 * @access  Public
 */
router.get('/credit-packages',
    asyncHandler(SubscriptionController.getCreditPackages)
);

/**
 * @route   GET /api/subscription/status
 * @desc    Get current subscription status
 * @access  Private
 */
router.get('/status',
    authenticate,
    asyncHandler(SubscriptionController.getStatus)
);

/**
 * @route   POST /api/subscription/webhook
 * @desc    Handle payment provider webhooks
 * @access  Public (but should validate webhook signature in production)
 */
router.post('/webhook',
    express.raw({ type: 'application/json' }), // Raw body for webhook verification
    asyncHandler(SubscriptionController.handleWebhook)
);

export default router;
