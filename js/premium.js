class PremiumFeatures {
    constructor() {
        this.stripe = Stripe('your_publishable_key'); // Replace with your Stripe key
        this.elements = this.stripe.elements();
        this.card = null;
        
        // Initialize
        this.init();
    }

    init() {
        // Setup upgrade buttons
        const upgradeButtons = document.querySelectorAll('.upgrade-button');
        upgradeButtons.forEach(button => {
            button.addEventListener('click', () => this.handleUpgrade(button.dataset.plan));
        });
        
        // Setup payment form
        this.setupPaymentForm();
    }

    setupPaymentForm() {
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
        
        // Create card element
        this.card = this.elements.create('card', { style });
        
        // Add card element to payment form
        const cardElement = document.getElementById('card-element');
        if (cardElement) {
            this.card.mount('#card-element');
        }
        
        // Handle validation errors
        this.card.addEventListener('change', ({ error }) => {
            const displayError = document.getElementById('card-errors');
            if (error) {
                displayError.textContent = error.message;
            } else {
                displayError.textContent = '';
            }
        });
        
        // Handle form submission
        const form = document.getElementById('submitPayment');
        if (form) {
            form.addEventListener('click', (e) => this.handlePaymentSubmission(e));
        }
    }

    async handleUpgrade(plan) {
        if (!auth.currentUser) {
            this.showToast('Please sign in to upgrade', 'warning');
            return;
        }
        
        // Show payment section
        document.getElementById('paymentSection').style.display = 'block';
        
        // Store selected plan
        this.selectedPlan = plan;
    }

    async handlePaymentSubmission(e) {
        e.preventDefault();
        
        const submitButton = document.getElementById('submitPayment');
        submitButton.disabled = true;
        
        try {
            // For GitHub Pages demo, simulate payment
            setTimeout(() => {
                // Update user subscription
                const user = { ...auth.currentUser, subscription: this.selectedPlan };
                auth.setCurrentUser(user);
                
                // Hide modal
                document.getElementById('pricingModal').style.display = 'none';
                
                // Show success message
                this.showToast('Upgrade successful! Enjoy your premium features ✨');
                
                // Reset payment form
                document.getElementById('paymentSection').style.display = 'none';
                submitButton.disabled = false;
                
                // Refresh premium features
                this.updatePremiumFeatures();
            }, 1500);
        } catch (error) {
            console.error('Payment error:', error);
            this.showToast('Payment failed: ' + error.message, 'error');
            submitButton.disabled = false;
        }
    }

    updatePremiumFeatures() {
        const isPremium = auth.currentUser?.subscription !== 'free';
        
        // Update voice selection
        const premiumVoices = document.querySelectorAll('#voiceSelect option[disabled]');
        premiumVoices.forEach(option => {
            option.disabled = !isPremium;
        });
        
        // Update export options
        const exportButtons = document.querySelectorAll('.premium-btn');
        exportButtons.forEach(button => {
            button.onclick = isPremium ? null : () => this.showPremiumFeature(button.dataset.feature);
        });
        
        // Update premium badges
        document.querySelectorAll('.premium-badge').forEach(badge => {
            badge.style.display = isPremium ? 'inline' : 'none';
        });
    }

    showPremiumFeature(feature) {
        const pricingModal = document.getElementById('pricingModal');
        pricingModal.style.display = 'block';
        
        // Highlight the feature in pricing plans
        const featureElement = document.querySelector(`.pricing-plans li:contains("${feature}")`);
        if (featureElement) {
            featureElement.classList.add('highlight');
            setTimeout(() => featureElement.classList.remove('highlight'), 2000);
        }
    }

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.style.display = 'block';
        
        setTimeout(() => {
            toast.style.display = 'none';
        }, 3000);
    }
}

// Initialize premium features
const premium = new PremiumFeatures();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PremiumFeatures;
}
