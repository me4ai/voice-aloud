class StripeService {
    constructor() {
        this.stripe = Stripe(process.env.STRIPE_PUBLISHABLE_KEY);
        this.api = new ApiService();
    }

    async initializePayment(priceId) {
        try {
            // Create payment method
            const { paymentMethod } = await this.stripe.createPaymentMethod({
                type: 'card',
                card: elements.getElement('card')
            });

            // Create subscription
            const subscription = await this.api.createSubscription(
                paymentMethod.id,
                priceId
            );

            // Confirm payment if required
            if (subscription.clientSecret) {
                const { error } = await this.stripe.confirmCardPayment(
                    subscription.clientSecret
                );

                if (error) {
                    throw new Error(error.message);
                }
            }

            return subscription;
        } catch (error) {
            console.error('Payment initialization error:', error);
            throw error;
        }
    }

    async updatePaymentMethod() {
        try {
            const { paymentMethod } = await this.stripe.createPaymentMethod({
                type: 'card',
                card: elements.getElement('card')
            });

            // Update payment method logic here
            return paymentMethod;
        } catch (error) {
            console.error('Payment method update error:', error);
            throw error;
        }
    }

    createCardElement(elementId) {
        const elements = this.stripe.elements();
        const style = {
            base: {
                color: '#32325d',
                fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
                fontSmoothing: 'antialiased',
                fontSize: '16px',
                '::placeholder': {
                    color: '#aab7c4'
                }
            },
            invalid: {
                color: '#fa755a',
                iconColor: '#fa755a'
            }
        };

        const card = elements.create('card', { style });
        card.mount(`#${elementId}`);
        return card;
    }
}
