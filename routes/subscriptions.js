const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/User');
const auth = require('../middleware/auth');

// Create subscription
router.post('/create', auth, async (req, res) => {
    try {
        const { paymentMethodId, priceId } = req.body;
        const user = await User.findById(req.user.id);

        // Create or get Stripe customer
        let customer;
        if (user.stripeCustomerId) {
            customer = await stripe.customers.retrieve(user.stripeCustomerId);
        } else {
            customer = await stripe.customers.create({
                email: user.email,
                payment_method: paymentMethodId,
                invoice_settings: { default_payment_method: paymentMethodId }
            });
            user.stripeCustomerId = customer.id;
            await user.save();
        }

        // Create subscription
        const subscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [{ price: priceId }],
            expand: ['latest_invoice.payment_intent']
        });

        // Update user subscription status
        user.subscription = priceId === process.env.PREMIUM_MONTHLY_PLAN_ID ? 'premium' : 'enterprise';
        user.subscriptionId = subscription.id;
        await user.save();

        res.json({
            subscriptionId: subscription.id,
            clientSecret: subscription.latest_invoice.payment_intent.client_secret
        });
    } catch (error) {
        console.error('Subscription creation error:', error);
        res.status(500).json({ message: 'Subscription creation failed' });
    }
});

// Cancel subscription
router.post('/cancel', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        
        if (!user.subscriptionId) {
            return res.status(400).json({ message: 'No active subscription' });
        }

        // Cancel at period end
        await stripe.subscriptions.update(user.subscriptionId, {
            cancel_at_period_end: true
        });

        res.json({ message: 'Subscription will be canceled at the end of the billing period' });
    } catch (error) {
        console.error('Subscription cancellation error:', error);
        res.status(500).json({ message: 'Subscription cancellation failed' });
    }
});

// Get subscription status
router.get('/status', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        
        if (!user.subscriptionId) {
            return res.json({ subscription: 'free' });
        }

        const subscription = await stripe.subscriptions.retrieve(user.subscriptionId);
        
        res.json({
            subscription: user.subscription,
            status: subscription.status,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000)
        });
    } catch (error) {
        console.error('Subscription status error:', error);
        res.status(500).json({ message: 'Could not retrieve subscription status' });
    }
});

// Update subscription
router.post('/update', auth, async (req, res) => {
    try {
        const { newPriceId } = req.body;
        const user = await User.findById(req.user.id);

        if (!user.subscriptionId) {
            return res.status(400).json({ message: 'No active subscription' });
        }

        // Update subscription
        const subscription = await stripe.subscriptions.retrieve(user.subscriptionId);
        await stripe.subscriptions.update(user.subscriptionId, {
            items: [{
                id: subscription.items.data[0].id,
                price: newPriceId
            }]
        });

        // Update user subscription level
        user.subscription = newPriceId === process.env.PREMIUM_MONTHLY_PLAN_ID ? 'premium' : 'enterprise';
        await user.save();

        res.json({ message: 'Subscription updated successfully' });
    } catch (error) {
        console.error('Subscription update error:', error);
        res.status(500).json({ message: 'Subscription update failed' });
    }
});

module.exports = router;
