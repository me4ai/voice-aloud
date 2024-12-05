class Auth {
    constructor() {
        this.currentUser = null;
        this.authButton = document.getElementById('authButton');
        this.authModal = document.getElementById('authModal');
        this.loginForm = document.getElementById('loginForm');
        this.registerForm = document.getElementById('registerForm');
        this.authTabs = document.querySelectorAll('.auth-tab');
        this.profileSection = document.getElementById('profileSection');
        
        // Social auth providers
        this.providers = {
            google: {
                name: 'Google',
                icon: 'fab fa-google',
                color: '#DB4437'
            },
            github: {
                name: 'GitHub',
                icon: 'fab fa-github',
                color: '#333'
            },
            microsoft: {
                name: 'Microsoft',
                icon: 'fab fa-microsoft',
                color: '#00A4EF'
            }
        };
        
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
        
        // Setup social auth buttons
        this.setupSocialAuth();
        
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
        
        // Setup profile editor
        this.setupProfileEditor();
    }

    setupSocialAuth() {
        const socialAuthContainer = document.querySelector('.social-auth');
        if (!socialAuthContainer) return;
        
        Object.entries(this.providers).forEach(([provider, data]) => {
            const button = document.createElement('button');
            button.className = 'social-auth-btn';
            button.style.backgroundColor = data.color;
            button.innerHTML = `
                <i class="${data.icon}"></i>
                Continue with ${data.name}
            `;
            button.addEventListener('click', () => this.handleSocialAuth(provider));
            socialAuthContainer.appendChild(button);
        });
    }

    setupProfileEditor() {
        if (!this.profileSection) return;
        
        const profileForm = this.profileSection.querySelector('form');
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => this.handleProfileUpdate(e));
        }
    }

    loadUserData() {
        const userData = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA);
        if (userData) {
            this.currentUser = JSON.parse(userData);
            this.updateAuthUI();
            this.updateProfileUI();
        }
    }

    updateAuthUI() {
        if (this.currentUser) {
            this.authButton.innerHTML = `
                <img src="${this.currentUser.avatar || 'assets/default-avatar.png'}" alt="Profile" class="avatar-small">
                <span>${this.currentUser.name}</span>
            `;
            document.querySelector('.premium-badge').style.display = 
                this.currentUser.subscription !== 'free' ? 'inline' : 'none';
        } else {
            this.authButton.innerHTML = 'Sign In';
            document.querySelector('.premium-badge').style.display = 'none';
        }
    }

    updateProfileUI() {
        if (!this.profileSection || !this.currentUser) return;
        
        const form = this.profileSection.querySelector('form');
        if (form) {
            form.querySelector('[name="name"]').value = this.currentUser.name || '';
            form.querySelector('[name="email"]').value = this.currentUser.email || '';
            form.querySelector('[name="bio"]').value = this.currentUser.bio || '';
            
            const avatar = this.profileSection.querySelector('.avatar-preview');
            if (avatar) {
                avatar.src = this.currentUser.avatar || 'assets/default-avatar.png';
            }
        }
    }

    async handleSocialAuth(provider) {
        try {
            // For demo, simulate social auth
            const userData = {
                id: `demo-${provider}-user`,
                name: `Demo ${this.providers[provider].name} User`,
                email: `demo.${provider}@example.com`,
                subscription: 'free',
                avatar: `assets/${provider}-avatar.png`,
                provider
            };
            
            this.setCurrentUser(userData);
            this.authModal.style.display = 'none';
            this.showToast(`Signed in with ${this.providers[provider].name}`);
        } catch (error) {
            console.error(`${provider} auth error:`, error);
            this.showToast(`${provider} sign-in failed: ${error.message}`, 'error');
        }
    }

    async handleProfileUpdate(e) {
        e.preventDefault();
        
        try {
            const formData = new FormData(e.target);
            const updates = {
                ...this.currentUser,
                name: formData.get('name'),
                email: formData.get('email'),
                bio: formData.get('bio')
            };
            
            // Handle avatar upload
            const avatarFile = formData.get('avatar');
            if (avatarFile && avatarFile.size > 0) {
                // For demo, simulate avatar upload
                updates.avatar = URL.createObjectURL(avatarFile);
            }
            
            this.setCurrentUser(updates);
            this.showToast('Profile updated successfully');
        } catch (error) {
            console.error('Profile update error:', error);
            this.showToast('Failed to update profile: ' + error.message, 'error');
        }
    }

    toggleAuthModal() {
        if (this.currentUser) {
            this.showUserMenu();
        } else {
            this.authModal.style.display = 'block';
        }
    }

    showUserMenu() {
        // Create user menu
        const menu = document.createElement('div');
        menu.className = 'user-menu';
        menu.innerHTML = `
            <div class="user-info">
                <img src="${this.currentUser.avatar || 'assets/default-avatar.png'}" alt="Profile" class="avatar-medium">
                <h3>${this.currentUser.name}</h3>
                <p>${this.currentUser.email}</p>
                <p class="subscription-status ${this.currentUser.subscription}">
                    ${this.currentUser.subscription === 'free' ? 'Free Plan' : 
                      this.currentUser.subscription === 'premium' ? 'Premium Plan ✨' : 
                      'Enterprise Plan 🏢'}
                </p>
            </div>
            <div class="user-actions">
                <button onclick="auth.showProfileSection()">Edit Profile</button>
                <button onclick="auth.showPricingModal()">Upgrade Plan</button>
                <button onclick="auth.logout()" class="danger">Logout</button>
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

    showProfileSection() {
        if (this.profileSection) {
            this.profileSection.style.display = 'block';
            document.querySelectorAll('.section').forEach(section => {
                if (section !== this.profileSection) {
                    section.style.display = 'none';
                }
            });
        }
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
export default auth;
export { Auth };
