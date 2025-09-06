import SubscriptionService from '../services/SubscriptionService.js';

/**
 * Subscription Controller
 * Handles all subscription and billing-related HTTP requests
 */

class SubscriptionController {
    /**
     * Get all available plans
     * GET /api/subscription/plans
     */
    async getPlans(req, res) {
        try {
            const plans = SubscriptionService.getPlans();

            res.json({
                success: true,
                data: plans
            });

        } catch (error) {
            console.error('Get plans error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Get specific plan details
     * GET /api/subscription/plans/:planId
     */
    async getPlan(req, res) {
        try {
            const { planId } = req.params;

            if (!planId) {
                return res.status(400).json({
                    success: false,
                    message: 'Plan ID is required'
                });
            }

            const plan = SubscriptionService.getPlan(planId);

            res.json({
                success: true,
                data: plan
            });

        } catch (error) {
            console.error('Get plan error:', error);
            res.status(404).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Subscribe to a plan
     * POST /api/subscription/subscribe
     */
    async subscribe(req, res) {
        try {
            const userId = req.user.userId;
            const { planId, paymentMethodId } = req.body;

            if (!planId) {
                return res.status(400).json({
                    success: false,
                    message: 'Plan ID is required'
                });
            }

            // Validate plan exists
            const validPlans = ['starter', 'professional', 'enterprise'];
            if (!validPlans.includes(planId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid plan ID. Valid options: ' + validPlans.join(', ')
                });
            }

            const result = await SubscriptionService.subscribeToPlan(
                userId, 
                planId, 
                paymentMethodId
            );

            res.json({
                success: true,
                message: 'Subscription created successfully',
                data: result
            });

        } catch (error) {
            console.error('Subscribe error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Change subscription plan
     * PUT /api/subscription/change-plan
     */
    async changePlan(req, res) {
        try {
            const userId = req.user.userId;
            const { newPlanId } = req.body;

            if (!newPlanId) {
                return res.status(400).json({
                    success: false,
                    message: 'New plan ID is required'
                });
            }

            // Validate plan exists
            const validPlans = ['starter', 'professional', 'enterprise'];
            if (!validPlans.includes(newPlanId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid plan ID. Valid options: ' + validPlans.join(', ')
                });
            }

            const result = await SubscriptionService.changePlan(userId, newPlanId);

            res.json({
                success: true,
                message: 'Plan changed successfully',
                data: result
            });

        } catch (error) {
            console.error('Change plan error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Cancel subscription
     * POST /api/subscription/cancel
     */
    async cancelSubscription(req, res) {
        try {
            const userId = req.user.userId;
            const { cancelAtPeriodEnd = true } = req.body;

            const result = await SubscriptionService.cancelSubscription(
                userId, 
                cancelAtPeriodEnd
            );

            res.json({
                success: true,
                message: 'Subscription canceled successfully',
                data: result
            });

        } catch (error) {
            console.error('Cancel subscription error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Reactivate subscription
     * POST /api/subscription/reactivate
     */
    async reactivateSubscription(req, res) {
        try {
            const userId = req.user.userId;

            const result = await SubscriptionService.reactivateSubscription(userId);

            res.json({
                success: true,
                message: 'Subscription reactivated successfully',
                data: result
            });

        } catch (error) {
            console.error('Reactivate subscription error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Purchase additional credits
     * POST /api/subscription/credits/purchase
     */
    async purchaseCredits(req, res) {
        try {
            const userId = req.user.userId;
            const { package: creditPackage, paymentMethodId } = req.body;

            if (!creditPackage) {
                return res.status(400).json({
                    success: false,
                    message: 'Credit package is required'
                });
            }

            // Validate credit package
            const validPackages = ['small', 'medium', 'large'];
            if (!validPackages.includes(creditPackage)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid credit package. Valid options: ' + validPackages.join(', ')
                });
            }

            const result = await SubscriptionService.purchaseCredits(
                userId, 
                creditPackage, 
                paymentMethodId
            );

            res.json({
                success: true,
                message: 'Credits purchased successfully',
                data: result
            });

        } catch (error) {
            console.error('Purchase credits error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Get subscription analytics
     * GET /api/subscription/analytics
     */
    async getAnalytics(req, res) {
        try {
            const userId = req.user.userId;

            const analytics = await SubscriptionService.getSubscriptionAnalytics(userId);

            res.json({
                success: true,
                data: analytics
            });

        } catch (error) {
            console.error('Get analytics error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Get billing history
     * GET /api/subscription/billing-history
     */
    async getBillingHistory(req, res) {
        try {
            const userId = req.user.userId;
            const { page = 1, limit = 10 } = req.query;

            // Validate pagination parameters
            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);

            if (isNaN(pageNum) || pageNum < 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid page number'
                });
            }

            if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid limit (1-50)'
                });
            }

            const history = await SubscriptionService.getBillingHistory(
                userId, 
                pageNum, 
                limitNum
            );

            res.json({
                success: true,
                data: history
            });

        } catch (error) {
            console.error('Get billing history error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Check plan limits for specific action
     * GET /api/subscription/limits/:action
     */
    async checkLimits(req, res) {
        try {
            const userId = req.user.userId;
            const { action } = req.params;

            if (!action) {
                return res.status(400).json({
                    success: false,
                    message: 'Action is required'
                });
            }

            const validActions = ['analysis', 'auto_trading', 'api_access'];
            if (!validActions.includes(action)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid action. Valid options: ' + validActions.join(', ')
                });
            }

            const limits = await SubscriptionService.checkPlanLimits(userId, action);

            res.json({
                success: true,
                data: limits
            });

        } catch (error) {
            console.error('Check limits error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Get credit packages available for purchase
     * GET /api/subscription/credit-packages
     */
    async getCreditPackages(req, res) {
        try {
            const packages = [
                {
                    id: 'small',
                    name: 'Small Pack',
                    credits: 50,
                    price: 9.99,
                    bonus: 0,
                    description: 'Perfect for occasional analysis'
                },
                {
                    id: 'medium',
                    name: 'Medium Pack',
                    credits: 150,
                    price: 24.99,
                    bonus: 25,
                    description: 'Great value for regular traders'
                },
                {
                    id: 'large',
                    name: 'Large Pack',
                    credits: 400,
                    price: 59.99,
                    bonus: 100,
                    description: 'Best value for power users'
                }
            ];

            res.json({
                success: true,
                data: packages
            });

        } catch (error) {
            console.error('Get credit packages error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Get current subscription status
     * GET /api/subscription/status
     */
    async getStatus(req, res) {
        try {
            const userId = req.user.userId;

            // Import User model to get subscription status
            const User = (await import('../models/User.js')).default;
            const user = await User.findById(userId).select('subscription credits limits');

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            const currentPlan = SubscriptionService.getPlan(user.subscription.plan);
            const now = new Date();
            const isActive = user.subscription.status === 'active' && 
                            user.subscription.currentPeriodEnd > now;

            const status = {
                subscription: {
                    plan: currentPlan,
                    status: user.subscription.status,
                    isActive,
                    currentPeriodEnd: user.subscription.currentPeriodEnd,
                    cancelAtPeriodEnd: user.subscription.cancelAtPeriodEnd,
                    daysRemaining: isActive ? 
                        Math.ceil((user.subscription.currentPeriodEnd - now) / (1000 * 60 * 60 * 24)) : 0
                },
                credits: {
                    balance: user.credits.balance,
                    monthlyAllowance: user.credits.monthlyAllowance,
                    totalUsed: user.credits.totalUsed,
                    lastReset: user.credits.lastReset
                },
                limits: user.limits
            };

            res.json({
                success: true,
                data: status
            });

        } catch (error) {
            console.error('Get status error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Webhook handler for payment provider (Stripe)
     * POST /api/subscription/webhook
     */
    async handleWebhook(req, res) {
        try {
            // This would handle Stripe webhooks in production
            const { type, data } = req.body;

            console.log('Webhook received:', type);

            switch (type) {
                case 'invoice.payment_succeeded':
                    // Handle successful payment
                    console.log('Payment succeeded:', data.object.id);
                    break;

                case 'invoice.payment_failed':
                    // Handle failed payment
                    console.log('Payment failed:', data.object.id);
                    break;

                case 'customer.subscription.deleted':
                    // Handle subscription cancellation
                    console.log('Subscription deleted:', data.object.id);
                    break;

                default:
                    console.log('Unhandled webhook type:', type);
            }

            res.json({ received: true });

        } catch (error) {
            console.error('Webhook error:', error);
            res.status(400).json({
                success: false,
                message: 'Webhook processing failed'
            });
        }
    }
}

export default new SubscriptionController();
