import User from '../models/User.js';
import CreditUsage from '../models/CreditUsage.js';
import { config } from '../config/environment.js';

/**
 * Subscription Service
 * Handles subscription plans, billing, and credit management
 */

class SubscriptionService {
    constructor() {
        this.plans = {
            starter: {
                name: 'Starter',
                price: 29.99,
                credits: 100,
                features: ['Basic AI Analysis', 'Market Data', 'Email Support'],
                maxModels: 2,
                maxAnalysesPerDay: 10,
                riskManagement: true,
                autoTrading: false
            },
            professional: {
                name: 'Professional',
                price: 79.99,
                credits: 300,
                features: [
                    'Advanced AI Analysis', 'All AI Models', 'Real-time Data',
                    'Priority Support', 'Risk Management', 'Portfolio Analytics'
                ],
                maxModels: 5,
                maxAnalysesPerDay: 50,
                riskManagement: true,
                autoTrading: true
            },
            enterprise: {
                name: 'Enterprise',
                price: 199.99,
                credits: 1000,
                features: [
                    'Unlimited AI Analysis', 'All Premium Models', 'Custom Models',
                    'Dedicated Support', 'Advanced Risk Management', 'API Access',
                    'Darwinex Integration', 'Custom Strategies'
                ],
                maxModels: 10,
                maxAnalysesPerDay: 200,
                riskManagement: true,
                autoTrading: true,
                apiAccess: true
            }
        };

        this.stripeConfig = {
            secretKey: config.STRIPE_SECRET_KEY,
            publishableKey: config.STRIPE_PUBLISHABLE_KEY,
            webhookSecret: config.STRIPE_WEBHOOK_SECRET
        };
    }

    /**
     * Get all available subscription plans
     */
    getPlans() {
        return Object.entries(this.plans).map(([id, plan]) => ({
            id,
            ...plan
        }));
    }

    /**
     * Get specific plan details
     */
    getPlan(planId) {
        const plan = this.plans[planId];
        if (!plan) {
            throw new Error('Plan not found');
        }
        return { id: planId, ...plan };
    }

    /**
     * Subscribe user to a plan
     */
    async subscribeToPlan(userId, planId, paymentMethodId = null) {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        const plan = this.getPlan(planId);
        
        try {
            // Create subscription (placeholder for Stripe integration)
            const subscriptionResult = await this.createStripeSubscription(
                user.email,
                planId,
                paymentMethodId
            );

            // Update user subscription
            const currentDate = new Date();
            const nextBillingDate = new Date(currentDate);
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

            user.subscription = {
                plan: planId,
                status: 'active',
                stripeSubscriptionId: subscriptionResult.subscriptionId,
                stripeCustomerId: subscriptionResult.customerId,
                currentPeriodStart: currentDate,
                currentPeriodEnd: nextBillingDate,
                cancelAtPeriodEnd: false
            };

            // Allocate monthly credits
            user.credits.monthlyAllowance = plan.credits;
            user.credits.balance = plan.credits;
            user.credits.lastReset = currentDate;

            // Update subscription limits
            user.limits = {
                maxAnalysesPerDay: plan.maxAnalysesPerDay,
                maxModels: plan.maxModels,
                canUseAutoTrading: plan.autoTrading,
                hasApiAccess: plan.apiAccess || false
            };

            await user.save();

            // Log subscription event
            await this.logSubscriptionEvent(userId, 'subscription_created', {
                plan: planId,
                amount: plan.price,
                subscriptionId: subscriptionResult.subscriptionId
            });

            return {
                success: true,
                subscription: user.subscription,
                plan: plan,
                creditsAllocated: plan.credits
            };

        } catch (error) {
            console.error('Subscription creation error:', error);
            throw new Error(`Subscription failed: ${error.message}`);
        }
    }

    /**
     * Change user's subscription plan
     */
    async changePlan(userId, newPlanId) {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        if (user.subscription.status !== 'active') {
            throw new Error('No active subscription found');
        }

        const currentPlan = this.getPlan(user.subscription.plan);
        const newPlan = this.getPlan(newPlanId);

        try {
            // Update Stripe subscription
            await this.updateStripeSubscription(
                user.subscription.stripeSubscriptionId,
                newPlanId
            );

            // Calculate prorated credits
            const remainingDays = Math.ceil(
                (user.subscription.currentPeriodEnd - new Date()) / (1000 * 60 * 60 * 24)
            );
            const daysInMonth = 30;
            const currentPlanDailyCredits = currentPlan.credits / daysInMonth;
            const newPlanDailyCredits = newPlan.credits / daysInMonth;
            const creditDifference = (newPlanDailyCredits - currentPlanDailyCredits) * remainingDays;

            // Update user subscription
            user.subscription.plan = newPlanId;
            user.credits.monthlyAllowance = newPlan.credits;
            user.credits.balance += Math.round(creditDifference);

            // Update limits
            user.limits = {
                maxAnalysesPerDay: newPlan.maxAnalysesPerDay,
                maxModels: newPlan.maxModels,
                canUseAutoTrading: newPlan.autoTrading,
                hasApiAccess: newPlan.apiAccess || false
            };

            await user.save();

            // Log plan change
            await this.logSubscriptionEvent(userId, 'plan_changed', {
                oldPlan: currentPlan.name,
                newPlan: newPlan.name,
                creditAdjustment: Math.round(creditDifference)
            });

            return {
                success: true,
                oldPlan: currentPlan,
                newPlan: newPlan,
                creditAdjustment: Math.round(creditDifference)
            };

        } catch (error) {
            console.error('Plan change error:', error);
            throw new Error(`Plan change failed: ${error.message}`);
        }
    }

    /**
     * Cancel subscription
     */
    async cancelSubscription(userId, cancelAtPeriodEnd = true) {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        if (user.subscription.status !== 'active') {
            throw new Error('No active subscription to cancel');
        }

        try {
            if (cancelAtPeriodEnd) {
                // Cancel at period end
                await this.cancelStripeSubscriptionAtPeriodEnd(
                    user.subscription.stripeSubscriptionId
                );
                
                user.subscription.cancelAtPeriodEnd = true;
            } else {
                // Cancel immediately
                await this.cancelStripeSubscriptionImmediately(
                    user.subscription.stripeSubscriptionId
                );

                user.subscription.status = 'canceled';
                user.subscription.currentPeriodEnd = new Date();
                
                // Downgrade to free plan
                await this.downgradeToFreePlan(user);
            }

            await user.save();

            // Log cancellation
            await this.logSubscriptionEvent(userId, 'subscription_canceled', {
                cancelAtPeriodEnd,
                canceledAt: new Date()
            });

            return {
                success: true,
                cancelAtPeriodEnd,
                accessUntil: user.subscription.currentPeriodEnd
            };

        } catch (error) {
            console.error('Subscription cancellation error:', error);
            throw new Error(`Cancellation failed: ${error.message}`);
        }
    }

    /**
     * Reactivate canceled subscription
     */
    async reactivateSubscription(userId) {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        if (!user.subscription.cancelAtPeriodEnd) {
            throw new Error('Subscription is not scheduled for cancellation');
        }

        try {
            // Reactivate Stripe subscription
            await this.reactivateStripeSubscription(
                user.subscription.stripeSubscriptionId
            );

            user.subscription.cancelAtPeriodEnd = false;
            await user.save();

            // Log reactivation
            await this.logSubscriptionEvent(userId, 'subscription_reactivated', {
                reactivatedAt: new Date()
            });

            return {
                success: true,
                subscription: user.subscription
            };

        } catch (error) {
            console.error('Subscription reactivation error:', error);
            throw new Error(`Reactivation failed: ${error.message}`);
        }
    }

    /**
     * Purchase additional credits
     */
    async purchaseCredits(userId, creditPackage, paymentMethodId) {
        const creditPackages = {
            small: { credits: 50, price: 9.99 },
            medium: { credits: 150, price: 24.99 },
            large: { credits: 400, price: 59.99 }
        };

        const packageInfo = creditPackages[creditPackage];
        if (!packageInfo) {
            throw new Error('Invalid credit package');
        }

        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        try {
            // Process payment (placeholder for Stripe)
            const paymentResult = await this.processOneTimePayment(
                user.email,
                packageInfo.price,
                paymentMethodId,
                `${packageInfo.credits} credits purchase`
            );

            // Add credits to user account
            user.credits.balance += packageInfo.credits;
            user.credits.totalPurchased += packageInfo.credits;
            await user.save();

            // Log credit purchase
            await this.logSubscriptionEvent(userId, 'credits_purchased', {
                package: creditPackage,
                credits: packageInfo.credits,
                amount: packageInfo.price,
                paymentId: paymentResult.paymentId
            });

            return {
                success: true,
                creditsAdded: packageInfo.credits,
                newBalance: user.credits.balance,
                amount: packageInfo.price
            };

        } catch (error) {
            console.error('Credit purchase error:', error);
            throw new Error(`Credit purchase failed: ${error.message}`);
        }
    }

    /**
     * Reset monthly credits for all users
     */
    async resetMonthlyCredits() {
        const activeUsers = await User.find({
            'subscription.status': 'active',
            'subscription.currentPeriodEnd': { $gte: new Date() }
        });

        let resetCount = 0;
        for (const user of activeUsers) {
            const plan = this.getPlan(user.subscription.plan);
            
            user.credits.balance = plan.credits;
            user.credits.lastReset = new Date();
            await user.save();
            
            resetCount++;
        }

        return {
            success: true,
            usersReset: resetCount
        };
    }

    /**
     * Get user's billing history
     */
    async getBillingHistory(userId, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        
        const usage = await CreditUsage.find({ 
            userId,
            type: { $in: ['subscription_created', 'plan_changed', 'credits_purchased', 'subscription_canceled'] }
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

        const total = await CreditUsage.countDocuments({ 
            userId,
            type: { $in: ['subscription_created', 'plan_changed', 'credits_purchased', 'subscription_canceled'] }
        });

        return {
            history: usage,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Get subscription analytics for user
     */
    async getSubscriptionAnalytics(userId) {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Get usage statistics for current month
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        const monthlyUsage = await CreditUsage.aggregate([
            {
                $match: {
                    userId: user._id,
                    createdAt: { $gte: monthStart }
                }
            },
            {
                $group: {
                    _id: '$type',
                    totalCredits: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            }
        ]);

        // Calculate usage trends
        const dailyUsage = await CreditUsage.aggregate([
            {
                $match: {
                    userId: user._id,
                    createdAt: { $gte: monthStart }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                        day: { $dayOfMonth: '$createdAt' }
                    },
                    credits: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
            }
        ]);

        const plan = this.getPlan(user.subscription.plan);
        const remainingDays = Math.ceil(
            (user.subscription.currentPeriodEnd - new Date()) / (1000 * 60 * 60 * 24)
        );

        return {
            currentPlan: plan,
            subscription: {
                status: user.subscription.status,
                remainingDays,
                renewsOn: user.subscription.currentPeriodEnd,
                cancelAtPeriodEnd: user.subscription.cancelAtPeriodEnd
            },
            credits: {
                balance: user.credits.balance,
                monthlyAllowance: user.credits.monthlyAllowance,
                totalUsed: user.credits.totalUsed,
                usageThisMonth: user.credits.monthlyAllowance - user.credits.balance
            },
            usage: {
                monthly: monthlyUsage,
                daily: dailyUsage
            },
            limits: user.limits
        };
    }

    /**
     * Check if user can perform action based on plan limits
     */
    async checkPlanLimits(userId, action) {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        const plan = this.getPlan(user.subscription.plan);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        switch (action) {
            case 'analysis':
                const todayAnalyses = await CreditUsage.countDocuments({
                    userId: user._id,
                    type: 'trading_analysis',
                    createdAt: { $gte: today }
                });
                
                return {
                    allowed: todayAnalyses < plan.maxAnalysesPerDay,
                    current: todayAnalyses,
                    limit: plan.maxAnalysesPerDay
                };

            case 'auto_trading':
                return {
                    allowed: plan.autoTrading,
                    feature: 'Auto Trading',
                    requiresPlan: 'professional'
                };

            case 'api_access':
                return {
                    allowed: plan.apiAccess || false,
                    feature: 'API Access',
                    requiresPlan: 'enterprise'
                };

            default:
                return { allowed: true };
        }
    }

    // Helper methods for payment processing (Stripe integration placeholders)

    async createStripeSubscription(email, planId, paymentMethodId) {
        // Placeholder for Stripe subscription creation
        return {
            subscriptionId: `sub_${Date.now()}`,
            customerId: `cus_${Date.now()}`
        };
    }

    async updateStripeSubscription(subscriptionId, newPlanId) {
        // Placeholder for Stripe subscription update
        return { success: true };
    }

    async cancelStripeSubscriptionAtPeriodEnd(subscriptionId) {
        // Placeholder for Stripe cancellation at period end
        return { success: true };
    }

    async cancelStripeSubscriptionImmediately(subscriptionId) {
        // Placeholder for immediate Stripe cancellation
        return { success: true };
    }

    async reactivateStripeSubscription(subscriptionId) {
        // Placeholder for Stripe reactivation
        return { success: true };
    }

    async processOneTimePayment(email, amount, paymentMethodId, description) {
        // Placeholder for one-time payment processing
        return {
            paymentId: `pi_${Date.now()}`,
            status: 'succeeded'
        };
    }

    async downgradeToFreePlan(user) {
        user.subscription.plan = 'free';
        user.credits.monthlyAllowance = 10; // Free tier gets 10 credits
        user.credits.balance = Math.min(user.credits.balance, 10);
        user.limits = {
            maxAnalysesPerDay: 2,
            maxModels: 1,
            canUseAutoTrading: false,
            hasApiAccess: false
        };
    }

    async logSubscriptionEvent(userId, type, metadata) {
        const usage = new CreditUsage({
            userId,
            amount: 0,
            type,
            description: `Subscription event: ${type}`,
            metadata
        });
        await usage.save();
    }
}

export default new SubscriptionService();
