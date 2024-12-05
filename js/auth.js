class Auth {
    constructor() {
        this.currentUser = null;
        this.authButton = document.getElementById('authButton');
        this.authModal = document.getElementById('authModal');
        this.loginForm = document.getElementById('loginForm');
        this.registerForm = document.getElementById('registerForm');
        this.authTabs = document.querySelectorAll('.auth-tab');
        
        // Initialize
        this.init();
    }

    init() {
        // Load user data from storage
        this.loadUserData();
        
        // Add event listeners
        this.authButton.addEventListener('click', () => this.toggleAuthModal());
        this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        this.registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        
        // Setup auth tabs
        this.authTabs.forEach(tab => {
            tab.addEventListener('click', () => this.switchAuthTab(tab.dataset.tab));
        });
        
        // Close modal on click outside
        window.addEventListener('click', (e) => {
            if (e.target === this.authModal) {
                this.authModal.style.display = 'none';
            }
        });
        
        // Close button
        const closeButtons = document.querySelectorAll('.close');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.authModal.style.display = 'none';
            });
        });
    }

    loadUserData() {
        const userData = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA);
        if (userData) {
            this.currentUser = JSON.parse(userData);
            this.updateAuthUI();
        }
    }

    updateAuthUI() {
        if (this.currentUser) {
            this.authButton.textContent = this.currentUser.name;
            document.querySelector('.premium-badge').style.display = 
                this.currentUser.subscription !== 'free' ? 'inline' : 'none';
        } else {
            this.authButton.textContent = 'Sign In';
            document.querySelector('.premium-badge').style.display = 'none';
        }
    }

    toggleAuthModal() {
        if (this.currentUser) {
            this.showUserMenu();
        } else {
            this.authModal.style.display = 'block';
        }
    }

    switchAuthTab(tab) {
        // Update active tab
        this.authTabs.forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tab);
        });
        
        // Show corresponding form
        this.loginForm.style.display = tab === 'login' ? 'block' : 'none';
        this.registerForm.style.display = tab === 'register' ? 'block' : 'none';
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const email = e.target.querySelector('input[type="email"]').value;
        const password = e.target.querySelector('input[type="password"]').value;
        
        try {
            // For GitHub Pages demo, simulate login
            const user = {
                id: 'demo-user',
                name: email.split('@')[0],
                email,
                subscription: 'free'
            };
            
            this.setCurrentUser(user);
            this.authModal.style.display = 'none';
            this.showToast('Login successful');
        } catch (error) {
            console.error('Login error:', error);
            this.showToast('Login failed: ' + error.message, 'error');
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        
        const name = e.target.querySelector('input[type="text"]').value;
        const email = e.target.querySelector('input[type="email"]').value;
        const password = e.target.querySelector('input[type="password"]').value;
        
        try {
            // For GitHub Pages demo, simulate registration
            const user = {
                id: 'demo-user',
                name,
                email,
                subscription: 'free'
            };
            
            this.setCurrentUser(user);
            this.authModal.style.display = 'none';
            this.showToast('Registration successful');
        } catch (error) {
            console.error('Registration error:', error);
            this.showToast('Registration failed: ' + error.message, 'error');
        }
    }

    setCurrentUser(user) {
        this.currentUser = user;
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(user));
        this.updateAuthUI();
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER_DATA);
        this.updateAuthUI();
        this.showToast('Logged out successfully');
    }

    showUserMenu() {
        // Create user menu
        const menu = document.createElement('div');
        menu.className = 'user-menu';
        menu.innerHTML = `
            <div class="user-info">
                <h3>${this.currentUser.name}</h3>
                <p>${this.currentUser.email}</p>
                <p class="subscription-status">
                    ${this.currentUser.subscription === 'free' ? 'Free Plan' : 
                      this.currentUser.subscription === 'premium' ? 'Premium Plan ✨' : 
                      'Enterprise Plan 🏢'}
                </p>
            </div>
            <div class="user-actions">
                <button onclick="auth.showPricingModal()">Upgrade Plan</button>
                <button onclick="auth.logout()">Logout</button>
            </div>
        `;
        
        // Position menu
        const rect = this.authButton.getBoundingClientRect();
        menu.style.position = 'absolute';
        menu.style.top = rect.bottom + 'px';
        menu.style.right = (window.innerWidth - rect.right) + 'px';
        
        // Add to document
        document.body.appendChild(menu);
        
        // Remove on click outside
        const removeMenu = (e) => {
            if (!menu.contains(e.target) && e.target !== this.authButton) {
                menu.remove();
                document.removeEventListener('click', removeMenu);
            }
        };
        
        setTimeout(() => {
            document.addEventListener('click', removeMenu);
        }, 0);
    }

    showPricingModal() {
        const pricingModal = document.getElementById('pricingModal');
        pricingModal.style.display = 'block';
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

// Initialize auth
const auth = new Auth();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Auth;
}
